
'use client';

import { useState } from 'react';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { PlusCircle, Loader2, MoreHorizontal, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
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
} from "@/components/ui/dialog";
import { AnimatedDialogContent } from "@/components/shared/animated-dialog";
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { NewLeaveRequestForm } from '@/components/cuti/new-leave-request-form';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const MotionCard = motion(Card);

const statusVariant: Record<RequestStatus, 'success' | 'secondary' | 'destructive'> = {
    'Pending': 'secondary',
    'Approved': 'success',
    'Rejected': 'destructive',
};

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
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isApproveAlertOpen, setApproveAlertOpen] = useState(false);
  const [isRejectAlertOpen, setRejectAlertOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const firestore = useFirestore();
  const { user } = useUser();

  const requestsCollection = useMemoFirebase(() => collection(firestore, 'leave_requests'), [firestore]);
  const requestsQuery = useMemoFirebase(() => query(requestsCollection, orderBy('createdAt', 'desc')), [requestsCollection]);
  const { data: requests, isLoading: isLoadingRequests, refetch: refetchRequests } = useCollection<LeaveRequest>(requestsQuery);

  const employeesCollection = useMemoFirebase(() => collection(firestore, 'employees'), [firestore]);
  const employeesQuery = useMemoFirebase(() => query(employeesCollection, orderBy('name', 'asc')), [employeesCollection]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  const handleUpdateRequestStatus = async (status: 'Approved' | 'Rejected') => {
    if (!selectedRequest || !user) return;
    setIsProcessing(true);
    
    const requestRef = doc(firestore, 'leave_requests', selectedRequest.id);
    
    await updateDoc(requestRef, {
        status: status,
        approvedBy: status === 'Approved' ? user.uid : null,
        rejectedBy: status === 'Rejected' ? user.uid : null,
    });
    
    toast.success(`Permohonan ${status === 'Approved' ? 'Disetujui' : 'Ditolak'}`, {
        description: `Permohonan dari ${selectedRequest.employeeName} telah diubah.`,
    });
    
    // The useCollection hook will automatically refetch. No manual refetch needed here.
    
    setIsProcessing(false);
    setApproveAlertOpen(false);
    setRejectAlertOpen(false);
    setSelectedRequest(null);
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
        if (request.status !== 'Pending') return null;

        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Buka menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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

      <div className="flex items-center justify-end space-x-2 py-4">
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
    </motion.div>
  );
}
