
'use client';

import { useState } from 'react';
import { collection, orderBy, query, doc, deleteDoc, getDocs, writeBatch, updateDoc, serverTimestamp, where, getDoc } from 'firebase/firestore';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { MoreHorizontal, PlusCircle, ArrowUpDown, Loader2, Trash2, Edit, FileDown, Users, CheckCircle, Printer, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

import { useCollection, useFirestore, useMemoFirebase, useDoc, useUser } from '@/firebase';
import type { Briefing, Employee, BriefingParticipant, UserProfile } from '@/lib/types';
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import PageHeader from '@/components/shared/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription as DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NewBriefingForm } from '@/components/briefings/new-briefing-form';
import { EditBriefingForm } from '@/components/briefings/edit-briefing-form';
import { useToast } from '@/hooks/use-toast';
import { PrintableBriefing } from "@/components/briefings/printable-briefing";
import { generatePdfFromComponent } from "@/lib/pdf-generator";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


const formatDateForDisplay = (dateString: string) => {
  if (!dateString) return '-';
  return format(new Date(dateString), "eeee, d MMM yyyy 'jam' HH:mm", { locale: id });
};

const formatDateForCard = (dateString: string) => {
    if (!dateString) return { date: '-', time: '-' };
    const date = new Date(dateString);
    return {
        date: format(date, "d MMM yyyy", { locale: id }),
        time: format(date, "HH:mm", { locale: id }),
    };
};

export default function BriefingsPage() {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAcknowledgeModalOpen, setIsAcknowledgeModalOpen] = useState(false);
  
  const [selectedBriefing, setSelectedBriefing] = useState<Briefing | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);


  const [sorting, setSorting] = useState<SortingState>([
    { id: 'briefingDate', desc: true }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();

  const briefingsCollection = useMemoFirebase(() => collection(firestore, 'briefings'), [firestore]);
  const briefingsQuery = useMemoFirebase(() => query(briefingsCollection, orderBy('briefingDate', 'desc')), [briefingsCollection]);
  
  const { data: briefings, isLoading: isLoadingBriefings } = useCollection<Briefing>(briefingsQuery);

  const employeesCollection = useMemoFirebase(() => collection(firestore, 'employees'), [firestore]);
  const employeesQuery = useMemoFirebase(() => query(employeesCollection, orderBy('name', 'asc')), [employeesCollection]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);
  
  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);
  
  // Data for Detail Modal
  const participantsCollectionRef = useMemoFirebase(() => selectedBriefing ? collection(firestore, 'briefings', selectedBriefing.id, 'participants') : null, [firestore, selectedBriefing]);
  const { data: participants, isLoading: isLoadingParticipants } = useCollection<BriefingParticipant>(participantsCollectionRef);

  const openDetailModal = (briefing: Briefing) => {
    setSelectedBriefing(briefing);
    setIsDetailModalOpen(true);
  };

  const openEditModal = (briefing: Briefing) => {
    setSelectedBriefing(briefing);
    setIsEditModalOpen(true);
  };

  const openDeleteAlert = (briefing: Briefing) => {
    setSelectedBriefing(briefing);
    setDeleteAlertOpen(true);
  };

  const handlePrint = async (briefingToPrint: Briefing) => {
    if (!briefingToPrint || !userProfile) return;
    setProcessingId(briefingToPrint.id);
    const { dismiss } = toast({
      title: "Mempersiapkan PDF...",
      description: "Mengambil data tanda tangan dan membuat file.",
    });

    try {
        // Fetch participants
        const participantsSnapshot = await getDocs(collection(firestore, 'briefings', briefingToPrint.id, 'participants'));
        const briefingParticipants = participantsSnapshot.docs.map(doc => ({...doc.data(), id: doc.id} as BriefingParticipant));

        const employeeIds = briefingParticipants.map(p => p.employeeId);
        
        const employeesData: Record<string, Employee> = {};
        if (employeeIds.length > 0) {
             const allEmployees = employees || [];
             allEmployees.forEach(emp => {
                 if(employeeIds.includes(emp.id)) {
                    employeesData[emp.id] = emp;
                 }
             })
        }
        
        const participantsWithFullData = briefingParticipants.map(p => ({
            ...p,
            employee: employeesData[p.employeeId] || undefined,
        }));

        const briefingWithSignatures = {
            ...briefingToPrint,
            // Ensure creator signature is from briefing, but fallback to current profile
            creatorSignatureUrl: briefingToPrint.creatorSignatureUrl || userProfile.signatureUrl,
            // Ensure acknowledger signature is from briefing, but fallback to current profile's OPC
            acknowledgerName: briefingToPrint.acknowledgerName || userProfile.operationPointCoordinatorName,
            acknowledgerSignatureUrl: briefingToPrint.acknowledgerSignatureUrl || userProfile.operationPointCoordinatorSignatureUrl,
        };

        const ComponentToPrint = PrintableBriefing({ briefing: briefingWithSignatures, participants: participantsWithFullData });
        await generatePdfFromComponent(
            ComponentToPrint,
            `Briefing - ${briefingToPrint.area} - ${format(new Date(briefingToPrint.briefingDate), 'yyyy-MM-dd')}.pdf`
        );
        dismiss();
    } catch (error) {
        console.error("Failed to generate PDF", error);
        dismiss();
        toast({
            id: 'pdf-error',
            title: "Gagal Membuat PDF",
            description: "Terjadi kesalahan saat mencoba membuat file PDF.",
            variant: "destructive",
        });
    } finally {
        setProcessingId(null);
    }
  };
  
   const handleAcknowledge = async () => {
        if (!user || !userProfile || !selectedBriefing) return;
        setIsProcessing(true);
        try {
            const briefingRef = doc(firestore, 'briefings', selectedBriefing.id);
            const updatedData = {
                acknowledgedBy: user.uid,
                acknowledgerName: userProfile.name, // Use current user's name
                acknowledgerSignatureUrl: userProfile.signatureUrl || null,
                acknowledgedAt: serverTimestamp(),
            };

            await updateDoc(briefingRef, updatedData);

            toast({
                title: "Briefing Disetujui",
                description: `Briefing telah disetujui oleh ${userProfile.name}.`,
            });
            
            setSelectedBriefing(prev => prev ? { 
                ...prev, 
                acknowledgedBy: user.uid, 
                acknowledgerName: userProfile.name,
                acknowledgerSignatureUrl: userProfile.signatureUrl,
                acknowledgedAt: new Date() 
            } : null);
            setIsAcknowledgeModalOpen(false);

        } catch (error) {
            console.error("Failed to acknowledge briefing:", error);
            toast({
                title: "Gagal Menyetujui",
                description: "Terjadi kesalahan. Silakan coba lagi.",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };
  
  const handleDelete = async () => {
    if (!selectedBriefing) return;
    setIsProcessing(true);

    try {
        const batch = writeBatch(firestore);
        const participantsCollectionRef = collection(firestore, `briefings/${selectedBriefing.id}/participants`);
        const participantsSnapshot = await getDocs(participantsCollectionRef);
        participantsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        const mainBriefingRef = doc(firestore, 'briefings', selectedBriefing.id);
        batch.delete(mainBriefingRef);

        await batch.commit();

        toast({
            title: "Berhasil Dihapus",
            description: `Briefing untuk area ${selectedBriefing.area} telah dihapus.`,
        });
    } catch (error) {
        console.error("Error deleting briefing:", error);
        toast({
            title: "Gagal Menghapus",
            description: "Terjadi kesalahan saat menghapus data.",
            variant: "destructive",
        });
    } finally {
        setIsProcessing(false);
        setDeleteAlertOpen(false);
        setSelectedBriefing(null);
    }
  }
  
  const columns: ColumnDef<Briefing>[] = [
    {
      accessorKey: "briefingDate",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Tanggal & Waktu
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => formatDateForDisplay(row.getValue("briefingDate")),
    },
    {
      accessorKey: "area",
      header: "Area",
    },
    {
      accessorKey: "topics",
      header: "Topik",
      cell: ({ row }) => (row.original.topics || []).join(', '),
    },
    {
      accessorKey: "creatorName",
      header: "Dibuat Oleh",
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const briefing = row.original;
        const isCurrentlyProcessing = processingId === briefing.id;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Buka menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openDetailModal(briefing)}>
                <Eye className="mr-2 h-4 w-4" />
                <span>Lihat Detail</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlePrint(briefing)} disabled={isCurrentlyProcessing}>
                {isCurrentlyProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                <span>Cetak</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditModal(briefing)}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={() => openDeleteAlert(briefing)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Hapus</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: briefings ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  const isLoading = isLoadingBriefings || isLoadingEmployees;
  
  const formattedDate = selectedBriefing ? format(new Date(selectedBriefing.briefingDate), "eeee, d MMMM yyyy 'pukul' HH:mm 'WITA'", { locale: id }) : '';
  const formattedAcknowledgedDate = selectedBriefing?.acknowledgedAt ? format(new Date(selectedBriefing.acknowledgedAt instanceof Date ? selectedBriefing.acknowledgedAt : selectedBriefing.acknowledgedAt.toDate()), "d MMMM yyyy 'pukul' HH:mm", { locale: id }) : '';


  return (
    <div className="space-y-6">
      <PageHeader title="Riwayat Briefing">
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Buat Briefing Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl max-h-[90dvh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Buat Materi Briefing Baru</DialogTitle>
              </DialogHeader>
               {isLoading ? (
                  <div className="flex justify-center items-center p-8">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  </div>
              ) : (
                  <NewBriefingForm setModalOpen={setIsNewModalOpen} employees={employees || []} />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>
      
       {/* Desktop Table */}
      <div className="hidden md:block">
        <Card>
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
                  {isLoadingBriefings ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={columns.length}>
                          <Skeleton className="h-16 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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
                        Belum ada data briefing.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

       {/* Mobile Card View */}
      <div className="grid gap-4 md:hidden">
        {isLoadingBriefings ? (
          Array.from({ length: 5 }).map((_, i) => (
             <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
             </Card>
          ))
        ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const briefing = row.original;
              const { date, time } = formatDateForCard(briefing.briefingDate);
              return (
                <Card key={row.id} className="w-full">
                  <CardContent className="p-4 flex gap-4">
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-left">{briefing.area}</p>
                          <p className="text-sm text-muted-foreground">{date} jam {time}</p>
                        </div>
                        {flexRender(row.getVisibleCells().find(cell => cell.column.id === 'actions')?.column.columnDef.cell, row.getVisibleCells().find(cell => cell.column.id === 'actions')?.getContext())}
                      </div>
                      <div className="border-t my-2"></div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                            <span>Topik:</span>
                            <span className="font-medium text-foreground text-right truncate pl-4">{(briefing.topics || []).join(', ')}</span>
                        </div>
                         <div className="flex justify-between">
                            <span>Dibuat oleh:</span>
                            <span className="font-medium text-foreground">{briefing.creatorName}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
        ) : (
          <Card>
            <CardContent className="p-4 text-center text-muted-foreground">
              Belum ada data briefing.
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Edit Modal */}
      {selectedBriefing && (
        <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => {
            setIsEditModalOpen(isOpen);
            if (!isOpen) setSelectedBriefing(null);
        }}>
          <DialogContent className="sm:max-w-3xl max-h-[90dvh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit Materi Briefing</DialogTitle>
            </DialogHeader>
             {isLoading ? (
                  <div className="flex justify-center items-center p-8">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  </div>
              ) : (
                <EditBriefingForm 
                    briefing={selectedBriefing} 
                    employees={employees || []}
                    setModalOpen={setIsEditModalOpen} 
                />
              )}
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Alert */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data briefing
                      untuk area <strong>{selectedBriefing?.area}</strong> pada tanggal <strong>{selectedBriefing ? formatDateForDisplay(selectedBriefing.briefingDate) : ''}</strong> secara permanen.
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

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={(isOpen) => {
          setIsDetailModalOpen(isOpen);
          if (!isOpen) setSelectedBriefing(null);
      }}>
        <DialogContent className="sm:max-w-4xl max-h-[90dvh] flex flex-col">
            {selectedBriefing && (
                <>
                    <DialogHeader>
                        <DialogTitle>Detail Briefing Area {selectedBriefing.area}</DialogTitle>
                        <DialogDescription>{formattedDate}</DialogDescription>
                    </DialogHeader>
                    <div className="flex-grow overflow-y-auto -mx-6 px-6">
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Materi Briefing</CardTitle>
                                    <CardDescription>Topik: {selectedBriefing.topics.join(', ')}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {(selectedBriefing.items && selectedBriefing.items.length > 0) ? selectedBriefing.items.map((item, index) => (
                                        <div key={index}>
                                            <p className="font-semibold">{item.topic}</p>
                                            <p className="text-muted-foreground whitespace-pre-line pl-4">{item.content}</p>
                                        </div>
                                    )) : (
                                        <ul className="list-disc space-y-2 pl-5">
                                            {selectedBriefing.content.map((item, index) => (
                                                <li key={index}>{item}</li>
                                            ))}
                                        </ul>
                                    )}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Peserta Briefing</CardTitle>
                                    <CardDescription>Jumlah peserta: {participants?.length ?? 0}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {isLoadingParticipants ? (
                                        <div className="flex justify-center items-center p-8">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        </div>
                                    ) : participants && participants.length > 0 ? (
                                        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                            {participants.map(p => (
                                                <li key={p.id} className="text-sm">
                                                    <p className="font-medium">{p.employeeName}</p>
                                                    <p className="text-muted-foreground">{p.employeeJobTitle}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="text-center text-muted-foreground py-8">
                                            <Users className="mx-auto h-12 w-12" />
                                            <p className="mt-4">Belum ada peserta yang ditambahkan.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Validasi & Persetujuan</CardTitle>
                                    <CardDescription>Status persetujuan untuk dokumen briefing ini.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border p-4">
                                        <div>
                                            <p className="font-semibold">Dibuat Oleh</p>
                                            <p className="text-muted-foreground text-sm">{selectedBriefing.creatorName || 'N/A'}</p>
                                        </div>
                                        {selectedBriefing.acknowledgedBy ? (
                                            <div className="text-left sm:text-right">
                                                <div className="flex items-center gap-2 justify-start sm:justify-end text-green-600">
                                                    <CheckCircle className="h-4 w-4" />
                                                    <p className="font-semibold">Telah Disetujui</p>
                                                </div>
                                                <p className="text-muted-foreground text-sm">
                                                    oleh {selectedBriefing.acknowledgerName} pada {formattedAcknowledgedDate}
                                                </p>
                                            </div>
                                        ) : (
                                            <DialogTrigger asChild>
                                                <Button onClick={() => setIsAcknowledgeModalOpen(true)} disabled={isProcessing}>
                                                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Tandai "Mengetahui"
                                                </Button>
                                            </DialogTrigger>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </>
            )}
        </DialogContent>
      </Dialog>

      {/* Acknowledge Modal */}
      <Dialog open={isAcknowledgeModalOpen} onOpenChange={setIsAcknowledgeModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Tandai "Mengetahui"</DialogTitle>
                <DialogDescription>
                    Apakah Anda yakin ingin menyetujui materi briefing ini? Tindakan ini akan menggunakan nama dan tanda tangan dari profil Anda.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsAcknowledgeModalOpen(false)}>Batal</Button>
                <Button onClick={handleAcknowledge} disabled={isProcessing}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Ya, Setujui
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>


      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Sebelumnya
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Selanjutnya
        </Button>
      </div>
    </div>
  );
}
