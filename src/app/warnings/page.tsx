
'use client';

import { useState } from 'react';
import { collection, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  useReactTable,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { PlusCircle, MoreHorizontal, Loader2, Edit, Trash2, Printer, Eye, FileWarning, Calendar, User, FileText } from 'lucide-react';

import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import type { Employee, Warning, WarningStatus, WarningType, UserProfile } from "@/lib/types";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { NewWarningForm } from '@/components/warnings/new-warning-form';
import { EditWarningForm } from '@/components/warnings/edit-warning-form';
import { generatePdfFromComponent } from '@/lib/pdf-generator';
import { PrintableWarningLetter } from '@/app/warnings/[id]/print/page';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isAfter } from 'date-fns';

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const statusVariant: Record<WarningStatus, 'destructive' | 'secondary'> = {
    'Aktif': 'destructive',
    'Arsip': 'secondary',
};

const getWarningStatus = (expiryDate: string): WarningStatus => {
    return isAfter(new Date(expiryDate), new Date()) ? 'Aktif' : 'Arsip';
}

const warningTypeVariant: Record<WarningType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    'Teguran': 'outline',
    'SP1': 'secondary',
    'SP2': 'secondary',
    'SP3': 'destructive',
};

export default function WarningsPage() {
  const [isNewModalOpen, setNewModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [isDetailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState<Warning | null>(null);

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { toast } = useToast();

  const firestore = useFirestore();
  const { user } = useUser();

  const warningsCollection = useMemoFirebase(() => collection(firestore, 'warnings'), [firestore]);
  const { data: warnings, isLoading: isLoadingWarnings } = useCollection<Warning>(warningsCollection);

  const employeesCollection = useMemoFirebase(() => collection(firestore, 'employees'), [firestore]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesCollection);

  const fieldCoordinatorProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: fieldCoordinator } = useDoc<UserProfile>(fieldCoordinatorProfileRef);

  const handlePrint = async (warning: Warning) => {
    setIsProcessing(warning.id);
    const { dismiss } = toast({
      title: "Mempersiapkan PDF...",
      description: "Mohon tunggu sebentar.",
    });

    try {
        const ComponentToPrint = PrintableWarningLetter({ warning, fieldCoordinator });
        await generatePdfFromComponent(
            ComponentToPrint,
            `Surat Peringatan - ${warning.employeeName}.pdf`
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
        setIsProcessing(null);
    }
  };

  const openDetailModal = (warning: Warning) => {
    setSelectedWarning(warning);
    setDetailModalOpen(true);
  };

  const openEditModal = (warning: Warning) => {
    setSelectedWarning(warning);
    setEditModalOpen(true);
  };

  const openDeleteAlert = (warning: Warning) => {
    setSelectedWarning(warning);
    setDeleteAlertOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedWarning) return;
    setIsProcessing(selectedWarning.id);
    try {
        const batch = writeBatch(firestore);
        const mainWarningRef = doc(firestore, 'warnings', selectedWarning.id);
        const employeeWarningRef = doc(firestore, `employees/${selectedWarning.employeeId}/warningLetters`, selectedWarning.id);
        
        batch.delete(mainWarningRef);
        batch.delete(employeeWarningRef);
        
        await batch.commit();

        toast({
            title: "Berhasil Dihapus",
            description: `Surat peringatan untuk ${selectedWarning.employeeName} telah dihapus.`,
        });
    } catch (error) {
        console.error("Error deleting warning:", error);
        toast({
            title: "Gagal Menghapus",
            description: "Terjadi kesalahan saat menghapus data.",
            variant: "destructive",
        });
    } finally {
        setIsProcessing(null);
        setDeleteAlertOpen(false);
        setSelectedWarning(null);
    }
  }


  const columns: ColumnDef<Warning>[] = [
    {
        accessorKey: "nomorSurat",
        header: "Nomor Surat",
    },
    {
      accessorKey: "employeeName",
      header: "Nama Pegawai",
       cell: ({ row }) => row.original.employeeName,
    },
    {
      accessorKey: "type",
      header: "Jenis Surat",
      cell: ({ row }) => <Badge variant={warningTypeVariant[row.original.type]}>{row.original.type}</Badge>
    },
    {
      accessorKey: "issueDate",
      header: "Tanggal Terbit",
      cell: ({ row }) => formatDate(row.getValue("issueDate")),
    },
    {
      accessorKey: "expiryDate",
      header: "Tanggal Kedaluwarsa",
      cell: ({ row }) => formatDate(row.getValue("expiryDate")),
    },
    {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = getWarningStatus(row.original.expiryDate);
            return <Badge variant={statusVariant[status]}>{status}</Badge>
        }
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Buka menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openDetailModal(row.original)}>
                <Eye className="mr-2 h-4 w-4" />
                <span>Lihat Detail</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePrint(row.original)} disabled={isProcessing === row.original.id}>
                {isProcessing === row.original.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Printer className="mr-2 h-4 w-4" />
                )}
                <span>Cetak</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEditModal(row.original)}>
              <Edit className="mr-2 h-4 w-4" />
              <span>Edit</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={() => openDeleteAlert(row.original)}
            >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Hapus</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data: warnings ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      columnFilters,
    },
  });

  const isLoading = isLoadingWarnings || isLoadingEmployees;

  return (
    <div className="space-y-6">
      <PageHeader title="Manajemen Surat Peringatan">
        <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Input
              placeholder="Cari nama pegawai..."
              value={(table.getColumn("employeeName")?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn("employeeName")?.setFilterValue(event.target.value)
              }
              className="w-full sm:max-w-sm"
            />
            <Select
              value={(table.getColumn("type")?.getFilterValue() as string) ?? ""}
              onValueChange={(value) => table.getColumn("type")?.setFilterValue(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter Jenis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="Teguran">Teguran</SelectItem>
                <SelectItem value="SP1">SP1</SelectItem>
                <SelectItem value="SP2">SP2</SelectItem>
                <SelectItem value="SP3">SP3</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isNewModalOpen} onOpenChange={setNewModalOpen}>
                <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto sm:ml-auto">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Buat Surat
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Buat Surat Peringatan Baru</DialogTitle>
                    </DialogHeader>
                    {isLoading ? (
                        <div className="flex justify-center items-center p-8">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    ) : (
                        <NewWarningForm employees={employees ?? []} setModalOpen={setNewModalOpen} />
                    )}
                </DialogContent>
            </Dialog>
        </div>
      </PageHeader>
      
      {selectedWarning && (
        <Dialog open={isEditModalOpen} onOpenChange={setEditModalOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Surat Peringatan</DialogTitle>
                </DialogHeader>
                {isLoading ? (
                    <div className="flex justify-center items-center p-8">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : (
                    <EditWarningForm 
                        warning={selectedWarning} 
                        employees={employees ?? []} 
                        setModalOpen={setEditModalOpen} 
                    />
                )}
            </DialogContent>
        </Dialog>
      )}

       <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data surat
                        peringatan secara permanen dari database.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={!!isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Hapus
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        {/* Detail Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setDetailModalOpen}>
            <DialogContent className="sm:max-w-2xl">
                {selectedWarning ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <FileWarning className="h-6 w-6 text-primary" />
                                Detail Surat Peringatan
                            </DialogTitle>
                            <DialogDescription>
                                No: {selectedWarning.nomorSurat}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <User className="h-5 w-5" />
                                        Informasi Pegawai
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <div className="font-semibold text-muted-foreground">Nama</div>
                                    <div>{selectedWarning.employeeName}</div>
                                    <div className="font-semibold text-muted-foreground">NIK</div>
                                    <div>{selectedWarning.employeeNik}</div>
                                    <div className="font-semibold text-muted-foreground">Jabatan</div>
                                    <div>{selectedWarning.employeeJobTitle}</div>
                                    <div className="font-semibold text-muted-foreground">Area Tugas</div>
                                    <div>{selectedWarning.employeeAreaTugas}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Detail Pelanggaran
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    <div>
                                        <p className="font-semibold text-muted-foreground">Jenis Surat</p>
                                        <p>{selectedWarning.type}</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-muted-foreground">Deskripsi Pelanggaran</p>
                                        <p>{selectedWarning.description}</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-muted-foreground">Peraturan yang Dilanggar</p>
                                        <p>{selectedWarning.peraturanDilanggar}</p>
                                    </div>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Calendar className="h-5 w-5" />
                                        Masa Berlaku
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <div className="font-semibold text-muted-foreground">Tanggal Terbit</div>
                                    <div>{formatDate(selectedWarning.issueDate)}</div>
                                    <div className="font-semibold text-muted-foreground">Tanggal Kedaluwarsa</div>
                                    <div>{formatDate(selectedWarning.expiryDate)}</div>
                                    <div className="font-semibold text-muted-foreground">Status</div>
                                    <div>
                                        <Badge variant={statusVariant[getWarningStatus(selectedWarning.expiryDate)]}>
                                            {getWarningStatus(selectedWarning.expiryDate)}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                ) : (
                    <div className="flex justify-center items-center p-8">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                )}
            </DialogContent>
        </Dialog>


      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
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
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
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
                      Tidak ada data surat peringatan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
