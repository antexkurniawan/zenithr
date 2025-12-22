
'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, doc, updateDoc, deleteDoc, where, getDocs } from 'firebase/firestore';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { PlusCircle, Loader2, MoreHorizontal, CheckCircle, XCircle, Eye, Edit, Trash2, CalendarDays, User, FileText, Hash, Printer } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, startOfYear, endOfYear, getYear } from 'date-fns';
import { id } from 'date-fns/locale';

import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import type { Employee, LeaveRequest, UserProfile, RequestStatus } from "@/lib/types";
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AnimatedDialogContent } from "@/components/shared/animated-dialog";
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { NewLeaveRequestForm } from '@/components/cuti/new-leave-request-form';
import { EditLeaveRequestForm } from '@/components/cuti/edit-leave-request-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { PrintableLeaveRequest } from '@/components/cuti/printable-leave-request';

const MotionCard = motion(Card);

const ANNUAL_LEAVE_QUOTA = 12;

const badgeStatusClasses: Record<RequestStatus, string> = {
  Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Approved: "bg-green-100 text-green-800 border-green-200",
  Rejected: "bg-red-100 text-red-800 border-red-200",
};


const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return format(new Date(dateString), "d MMM yyyy", { locale: id });
};


export default function CutiPage() {
  const [isNewModalOpen, setNewModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isDetailModalOpen, setDetailModalOpen] = useState(false);
  const [isApproveAlertOpen, setApproveAlertOpen] = useState(false);
  const [isRejectAlertOpen, setRejectAlertOpen] = useState(false);
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState<{ used: number; remaining: number } | null>(null);
  
  const firestore = useFirestore();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: currentUserProfile } = useDoc<UserProfile>(userProfileRef);

  const requestsCollection = useMemoFirebase(() => collection(firestore, 'leave_requests'), [firestore]);
  const requestsQuery = useMemoFirebase(() => query(requestsCollection, orderBy('createdAt', 'desc')), [requestsCollection]);
  const { data: requests, isLoading: isLoadingRequests, refetch: refetchRequests } = useCollection<LeaveRequest>(requestsQuery);

  const employeesCollection = useMemoFirebase(() => collection(firestore, 'employees'), [firestore]);
  const employeesQuery = useMemoFirebase(() => query(employeesCollection, orderBy('name', 'asc')), [employeesCollection]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  const calculateLeaveBalance = async (employeeId: string, currentRequestId: string) => {
    setLeaveBalance(null);
    const currentYear = getYear(new Date());
    const yearStart = startOfYear(new Date());
    const yearEnd = endOfYear(new Date());

    const q = query(
        requestsCollection,
        where('employeeId', '==', employeeId),
        where('requestType', '==', 'Cuti'),
        where('leaveType', '==', 'Tahunan'),
        where('status', '==', 'Approved'),
        where('startDate', '>=', yearStart.toISOString()),
        where('startDate', '<=', yearEnd.toISOString())
    );

    const querySnapshot = await getDocs(q);

    // Calculate previously used leave, excluding the current request being viewed/approved
    const usedLeave = querySnapshot.docs
      .filter(doc => doc.id !== currentRequestId) // Exclude the current request from the "already taken" sum
      .reduce((acc, doc) => acc + (doc.data().duration || 0), 0);
    
    setLeaveBalance({
        used: usedLeave,
        remaining: ANNUAL_LEAVE_QUOTA - usedLeave,
    });
};

  const openEditModal = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setEditModalOpen(true);
  };

  const openDetailModal = async (request: LeaveRequest) => {
    setSelectedRequest(request);
    setDetailModalOpen(true);
    if (request.requestType === 'Cuti' && request.leaveType === 'Tahunan') {
      await calculateLeaveBalance(request.employeeId, request.id);
    } else {
      setLeaveBalance(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    const requestRef = doc(firestore, 'leave_requests', selectedRequest.id);
    
    await deleteDoc(requestRef);

    toast.success("Permohonan Dihapus", {
      description: `Permohonan dari ${selectedRequest.employeeName} telah dihapus.`,
    });

    setIsProcessing(false);
    setDeleteAlertOpen(false);
    setSelectedRequest(null);
  };


  const handleUpdateRequestStatus = (status: 'Approved' | 'Rejected') => {
    if (!selectedRequest || !user) return;
    setIsProcessing(true);
    
    const requestRef = doc(firestore, 'leave_requests', selectedRequest.id);
    
    updateDoc(requestRef, {
        status: status,
        approvedBy: status === 'Approved' ? user.uid : null,
        rejectedBy: status === 'Rejected' ? user.uid : null,
    });
    
    toast.success(`Permohonan ${status === 'Approved' ? 'Disetujui' : 'Ditolak'}`, {
        description: `Permohonan dari ${selectedRequest.employeeName} telah diubah.`,
    });
    
    setIsProcessing(false);
    setApproveAlertOpen(false);
    setRejectAlertOpen(false);
    setSelectedRequest(null);
  };
  
   const handlePrint = async () => {
    if (!selectedRequest || !currentUserProfile) return;
    
    const toastId = toast.loading("Mempersiapkan Pratinjau Cetak...", {
        description: "Mohon tunggu sebentar.",
    });

    try {
        const requesterProfileSnap = await getDocs(query(collection(firestore, 'users'), where('id', '==', selectedRequest.requesterId)));
        const requesterProfile = requesterProfileSnap.docs.length > 0 ? requesterProfileSnap.docs[0].data() as UserProfile : null;
        
        const printableContent = (
            <PrintableLeaveRequest 
                request={selectedRequest}
                requester={requesterProfile}
                supervisor={currentUserProfile}
                leaveBalance={leaveBalance}
            />
        );

        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        document.body.appendChild(container);
        
        const { createRoot } = await import('react-dom/client');
        const root = createRoot(container);
        root.render(printableContent);

        await new Promise(resolve => setTimeout(resolve, 500)); 

        window.print();
        
        document.body.removeChild(container);
        root.unmount();

        toast.dismiss(toastId);
    } catch (error) {
        console.error("Failed to prepare for printing", error);
        toast.error("Gagal Mempersiapkan Cetak", {
            description: "Terjadi kesalahan saat mempersiapkan dokumen.",
        });
    }
  };


  const columns: ColumnDef<LeaveRequest>[] = [
    {
      accessorKey: "employeeName",
      header: "Nama Pegawai",
    },
    {
      accessorKey: "requestType",
      header: "Jenis Permohonan",
    },
    {
      accessorKey: "startDate",
      header: "Tanggal Mulai",
      cell: ({ row }) => formatDate(row.original.startDate),
    },
     {
      accessorKey: "endDate",
      header: "Tanggal Selesai",
      cell: ({ row }) => formatDate(row.original.endDate),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge className={badgeStatusClasses[row.original.status]}>{row.original.status}</Badge>,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const request = row.original;

        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Buka menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openDetailModal(request)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Lihat Detail
                    </DropdownMenuItem>
                    {request.status === 'Pending' && (
                        <>
                           <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-green-600 focus:bg-green-100 focus:text-green-700"
                                onClick={() => {
                                    setSelectedRequest(request);
                                    setApproveAlertOpen(true);
                                }}
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Setujui
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="text-red-600 focus:bg-red-100 focus:text-red-700"
                                onClick={() => {
                                    setSelectedRequest(request);
                                    setRejectAlertOpen(true);
                                }}
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Tolak
                            </DropdownMenuItem>
                        </>
                    )}
                    <DropdownMenuSeparator />
                     <DropdownMenuItem onClick={() => openEditModal(request)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="text-red-600 focus:bg-red-100 focus:text-red-700"
                        onClick={() => {
                            setSelectedRequest(request);
                            setDeleteAlertOpen(true);
                        }}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hapus
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: requests ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const isLoading = isLoadingRequests || isLoadingEmployees;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };
  
  const getSubtype = (request: LeaveRequest | null) => {
    if (!request) return '-';
    return request.leaveType || request.permitType || request.dutyType || '-';
  }

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <PageHeader title="Manajemen Cuti & Izin">
        <Dialog open={isNewModalOpen} onOpenChange={setNewModalOpen}>
            <DialogTrigger asChild>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="w-full sm:w-auto sm:ml-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Ajukan Permohonan
                </Button>
              </motion.div>
            </DialogTrigger>
            <AnimatedDialogContent open={isNewModalOpen} className="sm:max-w-2xl max-h-[90dvh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Form Permohonan Cuti / Izin / Tugas</DialogTitle>
                </DialogHeader>
                {isLoading ? (
                    <div className="flex justify-center items-center p-8">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : (
                    <NewLeaveRequestForm employees={employees ?? []} setModalOpen={setNewModalOpen} />
                )}
            </AnimatedDialogContent>
        </Dialog>
      </PageHeader>
      
      <MotionCard variants={itemVariants}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={columns.length}>
                         <Skeleton className="h-16 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      Belum ada data pengajuan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </MotionCard>
      
       {/* Modals and Alerts */}
      <AlertDialog open={isApproveAlertOpen} onOpenChange={setApproveAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Setujui Permohonan?</AlertDialogTitle>
                <AlertDialogDescription>
                    Anda akan menyetujui permohonan <strong>{selectedRequest?.requestType}</strong> dari <strong>{selectedRequest?.employeeName}</strong>. Tindakan ini tidak dapat dibatalkan.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleUpdateRequestStatus('Approved')} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Ya, Setujui
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isRejectAlertOpen} onOpenChange={setRejectAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Tolak Permohonan?</AlertDialogTitle>
                <AlertDialogDescription>
                    Anda akan menolak permohonan <strong>{selectedRequest?.requestType}</strong> dari <strong>{selectedRequest?.employeeName}</strong>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleUpdateRequestStatus('Rejected')} disabled={isProcessing} className="bg-destructive hover:bg-destructive/90">
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Ya, Tolak
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Hapus Permohonan?</AlertDialogTitle>
                <AlertDialogDescription>
                    Tindakan ini tidak bisa dibatalkan. Anda akan menghapus permohonan <strong>{selectedRequest?.requestType}</strong> dari <strong>{selectedRequest?.employeeName}</strong>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isProcessing} className="bg-destructive hover:bg-destructive/90">
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Ya, Hapus
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDetailModalOpen} onOpenChange={setDetailModalOpen}>
        <AnimatedDialogContent open={isDetailModalOpen} className="sm:max-w-xl max-h-[90dvh] flex flex-col">
          {selectedRequest && (
            <>
              <DialogHeader>
                  <DialogTitle>Detail Permohonan</DialogTitle>
                  <DialogDescription>
                      Permohonan dari {selectedRequest.employeeName}
                  </DialogDescription>
              </DialogHeader>
              <div className="flex-grow overflow-y-auto -mx-6 px-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5"/>Informasi Pegawai</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div className="font-semibold text-muted-foreground">Nama</div>
                      <div>{selectedRequest.employeeName}</div>
                      <div className="font-semibold text-muted-foreground">Jabatan</div>
                      <div>{selectedRequest.employeeJobTitle}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5"/>Detail Permohonan</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div className="font-semibold text-muted-foreground">Jenis Permohonan</div>
                      <div>{selectedRequest.requestType}</div>
                      <div className="font-semibold text-muted-foreground">Sub-Jenis</div>
                      <div>{getSubtype(selectedRequest)}</div>
                       <div className="font-semibold text-muted-foreground">Tanggal Mulai</div>
                      <div>{formatDate(selectedRequest.startDate)}</div>
                       <div className="font-semibold text-muted-foreground">Tanggal Selesai</div>
                      <div>{formatDate(selectedRequest.endDate)}</div>
                      <div className="font-semibold text-muted-foreground">Durasi</div>
                      <div>{selectedRequest.duration || 1} hari</div>
                      <div className="font-semibold text-muted-foreground">Status</div>
                      <div> <Badge className={badgeStatusClasses[selectedRequest.status]}>{selectedRequest.status}</Badge></div>
                      {selectedRequest.explanation && (
                        <>
                          <div className="font-semibold text-muted-foreground col-span-2 pt-2">Penjelasan</div>
                          <div className="col-span-2 text-muted-foreground bg-slate-50 p-2 rounded-md">{selectedRequest.explanation}</div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {leaveBalance !== null && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><CalendarDays className="h-5 w-5"/>Saldo Cuti Tahunan {getYear(new Date())}</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">{ANNUAL_LEAVE_QUOTA}</p>
                          <p className="text-xs text-muted-foreground">Hak Cuti</p>
                        </div>
                        <div>
                           <p className="text-2xl font-bold">{leaveBalance.used}</p>
                          <p className="text-xs text-muted-foreground">Terpakai</p>
                        </div>
                         <div>
                           <p className="text-2xl font-bold text-primary">{leaveBalance.remaining}</p>
                          <p className="text-xs text-muted-foreground">Sisa Cuti</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
              <DialogFooter className="pt-4 border-t print:hidden">
                    <Button variant="outline" onClick={() => setDetailModalOpen(false)}>Tutup</Button>
                    <Button onClick={handlePrint} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                        Cetak
                    </Button>
              </DialogFooter>
            </>
          )}
        </AnimatedDialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setEditModalOpen}>
        <AnimatedDialogContent open={isEditModalOpen} className="sm:max-w-2xl max-h-[90dvh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Edit Permohonan Cuti / Izin / Tugas</DialogTitle>
            </DialogHeader>
            {(isLoading || !selectedRequest) ? (
                <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            ) : (
                <EditLeaveRequestForm 
                    employees={employees ?? []} 
                    request={selectedRequest}
                    setModalOpen={setEditModalOpen} 
                />
            )}
        </AnimatedDialogContent>
      </Dialog>


      <div className="flex items-center justify-end space-x-2 py-4 print:hidden">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Sebelumnya
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Selanjutnya
          </Button>
        </motion.div>
      </div>

       <style jsx global>{`
        @media print {
          body > *:not(#printable-container) {
            display: none;
          }
          #printable-container {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
          }
          .print\\:hidden {
            display: none;
          }
        }
      `}</style>

    </motion.div>
  );
}
