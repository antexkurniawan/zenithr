
"use client";

import { useState, useEffect } from 'react';
import { collection, writeBatch, serverTimestamp, doc, getDocs, query, where, updateDoc, orderBy } from 'firebase/firestore';
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
import { MoreHorizontal, PlusCircle, Download, Upload, ArrowUpDown, Loader2, Edit, FileText, User, ShieldAlert, PenSquare, CalendarDays } from 'lucide-react';
import * as XLSX from 'xlsx';
import { differenceInDays, differenceInMonths, isPast, isAfter } from 'date-fns';
import Image from 'next/image';

import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import type { Employee, UserProfile, Warning, WarningStatus } from '@/lib/types';
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import PageHeader from '@/components/shared/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { NewEmployeeForm } from '@/components/pegawai/new-employee-form';
import { ImportDialog } from '@/components/pegawai/import-dialog';
import { EditEmployeeForm } from '@/components/pegawai/edit-employee-form';
import { getAvatarImage } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SignaturePad } from '@/components/pegawai/signature-pad';
import { ScrollArea } from '@/components/ui/scroll-area';


const formatDateForDisplay = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDateForExport = (dateString: string) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return '';
    }
};

const getRemainingContract = (endDateString?: string | null) => {
    if (!endDateString) {
      return { text: '-', color: 'text-muted-foreground' };
    }
    const endDate = new Date(endDateString);
    if (isPast(endDate)) {
        return { text: 'Kontrak Berakhir', color: 'text-muted-foreground' };
    }

    const today = new Date();
    const daysRemaining = differenceInDays(endDate, today);

    if (daysRemaining <= 30) {
        return { text: `${daysRemaining} hari`, color: 'text-red-500 font-semibold' };
    }
    if (daysRemaining <= 90) {
         return { text: `${daysRemaining} hari`, color: 'text-yellow-500 font-semibold' };
    }

    const months = differenceInMonths(endDate, today);
    const remainingDaysAfterMonths = differenceInDays(endDate, new Date(today.setMonth(today.getMonth() + months)));

    let text = '';
    if (months > 0) {
        text += `${months} bulan`;
    }
    if (remainingDaysAfterMonths > 0) {
        text += ` ${remainingDaysAfterMonths} hari`;
    }

    return { text: text.trim(), color: 'text-foreground' };
};

const getWarningStatus = (expiryDate: string): WarningStatus => {
    return isAfter(new Date(expiryDate), new Date()) ? 'Aktif' : 'Arsip';
}

function DetailModalContent({ employee, onSignatureUploaded, closeMainModal }: { employee: Employee, onSignatureUploaded: (updatedEmployee: Employee) => void, closeMainModal: () => void }) {
    const firestore = useFirestore();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    
    const warningsCollectionRef = useMemoFirebase(() => collection(firestore, 'employees', employee.id, 'warningLetters'), [firestore, employee.id]);
    const { data: employeeWarnings, isLoading: isLoadingWarnings } = useCollection<Warning>(warningsCollectionRef);

    const { imageUrl, imageHint } = getAvatarImage(employee.name || '');

    const handleInternalSignatureUploaded = async (newSignatureUrl: string) => {
        const updatedEmployee: Employee = { ...employee, signatureUrl: newSignatureUrl };
        const employeeRef = doc(firestore, 'employees', employee.id);
        await updateDoc(employeeRef, { signatureUrl: newSignatureUrl });
        onSignatureUploaded(updatedEmployee); // Pass updated employee data up
        setIsSignatureModalOpen(false);
    };

    return (
        <>
            <DialogHeader>
                <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                        <AvatarImage src={imageUrl} alt={employee.name} data-ai-hint={imageHint} />
                        <AvatarFallback>{employee.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <DialogTitle className="text-2xl">{employee.name}</DialogTitle>
                        <DialogDescription>{employee.jobTitle} (NIK: {employee.nik})</DialogDescription>
                    </div>
                </div>
            </DialogHeader>

            <ScrollArea className="flex-grow -mx-6">
                <div className="px-6">
                    <Tabs defaultValue="profil" className="w-full mt-4">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="profil"><User className="mr-2 h-4 w-4" /> Profil</TabsTrigger>
                            <TabsTrigger value="dokumen"><FileText className="mr-2 h-4 w-4" /> Dokumen</TabsTrigger>
                            <TabsTrigger value="peringatan"><ShieldAlert className="mr-2 h-4 w-4" /> Riwayat Peringatan</TabsTrigger>
                        </TabsList>
                        <TabsContent value="profil" className="mt-6 grid gap-6 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Informasi Kontrak</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center">
                                        <CalendarDays className="h-4 w-4 mr-3 text-muted-foreground" />
                                        <span className="text-sm">Awal Kontrak: {formatDateForDisplay(employee.contractStartDate)}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <CalendarDays className="h-4 w-4 mr-3 text-muted-foreground" />
                                        <span className="text-sm">Akhir Kontrak: {formatDateForDisplay(employee.contractEndDate)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Tanda Tangan Digital</CardTitle>
                                    <CardDescription>Digunakan untuk absensi briefing.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {employee.signatureUrl ? (
                                        <div className="space-y-4">
                                            <div className="border rounded-md p-2 bg-muted/50 flex justify-center items-center">
                                                <Image src={employee.signatureUrl} alt="Tanda tangan" width={200} height={100} className="object-contain" />
                                            </div>
                                            <Button variant="outline" className="w-full" onClick={() => setIsSignatureModalOpen(true)}>Ganti Tanda Tangan</Button>
                                        </div>
                                    ) : (
                                        <Button className="w-full" onClick={() => setIsSignatureModalOpen(true)}>
                                            <PenSquare className="mr-2 h-4 w-4"/>
                                            Upload Tanda Tangan
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="dokumen" className="mt-6">
                            <Card>
                                <CardHeader>
                                <CardTitle>Dokumen Pegawai</CardTitle>
                                <CardDescription>
                                    Kumpulan dokumen pribadi dan kontrak kerja. (Fitur segera hadir)
                                </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center text-muted-foreground py-8">
                                        <FileText className="mx-auto h-12 w-12" />
                                        <p className="mt-4">Belum ada dokumen yang diunggah.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="peringatan" className="mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Riwayat Surat Peringatan</CardTitle>
                                    <CardDescription>Daftar semua surat peringatan yang pernah diterima.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                {isLoadingWarnings ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : employeeWarnings && employeeWarnings.length > 0 ? (
                                    <div className='overflow-x-auto'>
                                    <Table>
                                        <TableHeader>
                                        <TableRow>
                                            <TableHead>Jenis</TableHead>
                                            <TableHead>Tanggal Terbit</TableHead>
                                            <TableHead>Deskripsi</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                        {employeeWarnings.map((warning) => {
                                            const status = getWarningStatus(warning.expiryDate);
                                            return (
                                            <TableRow key={warning.id}>
                                                <TableCell className="font-semibold">{warning.type}</TableCell>
                                                <TableCell>{formatDateForDisplay(warning.issueDate)}</TableCell>
                                                <TableCell className="max-w-xs truncate">{warning.description}</TableCell>
                                                <TableCell>
                                                <Badge variant={status === 'Aktif' ? 'destructive' : 'secondary'}>{status}</Badge>
                                                </TableCell>
                                            </TableRow>
                                            )
                                        })}
                                        </TableBody>
                                    </Table>
                                    </div>
                                ) : (
                                    <div className="text-center text-muted-foreground py-8">
                                    <ShieldAlert className="mx-auto h-12 w-12" />
                                    <p className="mt-4">Tidak ada riwayat surat peringatan.</p>
                                    </div>
                                )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </ScrollArea>
            
            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                <Button variant="outline" onClick={closeMainModal}>Tutup</Button>
                <Button onClick={() => setIsEditModalOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profil
                </Button>
            </div>

            {/* Nested Modals */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Edit Data Pegawai</DialogTitle>
                        <DialogDescription>Perbarui informasi detail untuk pegawai ini.</DialogDescription>
                    </DialogHeader>
                    <EditEmployeeForm employee={employee} setModalOpen={setIsEditModalOpen} />
                </DialogContent>
            </Dialog>
            <Dialog open={isSignatureModalOpen} onOpenChange={setIsSignatureModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload Tanda Tangan</DialogTitle>
                    </DialogHeader>
                    <SignaturePad 
                        docId={employee.id} 
                        onSignatureUploaded={(newUrl) => handleInternalSignatureUploaded(newUrl)}
                        collectionPath="employees"
                    />
                </DialogContent>
            </Dialog>
        </>
    )
}


export default function PegawaiPage() {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const { toast } = useToast();

  const firestore = useFirestore();
  const { user } = useUser();

  const employeesCollectionRef = useMemoFirebase(() => collection(firestore, 'employees'), [firestore]);
  const employeesQuery = useMemoFirebase(() => query(employeesCollectionRef, orderBy('name', 'asc')), [employeesCollectionRef]);
  const { data: employeesData, isLoading, error } = useCollection<Employee>(employeesQuery);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    if (employeesData) {
      setEmployees(employeesData);
    }
  }, [employeesData]);

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const openDetailModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDetailModalOpen(true);
  };
  
  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Nama Pegawai
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const employee = row.original;
        const { imageUrl, imageHint } = getAvatarImage(employee.name);
        return (
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={imageUrl} alt={employee.name} data-ai-hint={imageHint} />
              <AvatarFallback>
                {employee.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <button onClick={() => openDetailModal(employee)} className="font-medium hover:underline text-left">{employee.name}</button>
              <div className="text-sm text-muted-foreground">NIK: {employee.nik}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "jobTitle",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Jabatan
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
    },
    {
      accessorKey: "areaTugas",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Area Tugas
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
    },
    {
      accessorKey: "contractEndDate",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Akhir Kontrak
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => formatDateForDisplay(row.getValue("contractEndDate")),
    },
    {
        id: 'remainingContract',
        header: "Sisa Kontrak",
        cell: ({ row }) => {
            const { text, color } = getRemainingContract(row.original.contractEndDate);
            return <span className={color}>{text}</span>;
        }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const employee = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Buka menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openDetailModal(employee)}>Lihat Detail</DropdownMenuItem>
              {/* Edit is now inside the detail modal */}
              <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">Non-aktifkan</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: employees ?? [],
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

  const handleDownloadData = () => {
    if (!employees || employees.length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Tidak ada data pegawai untuk diunduh.",
        variant: "destructive",
      });
      return;
    }

    const dataToExport = employees.map(emp => ({
      nik: emp.nik,
      name: emp.name,
      jobTitle: emp.jobTitle,
      areaTugas: emp.areaTugas,
      contractStartDate: formatDateForExport(emp.contractStartDate),
      contractEndDate: formatDateForExport(emp.contractEndDate),
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Pegawai');
    XLSX.writeFile(wb, 'data_pegawai.xlsx');
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 
        nik: '', 
        name: '', 
        jobTitle: 'Driver/Dispatcher/Checker/Field Coordinator', 
        areaTugas: userProfile?.workArea || '',
        contractStartDate: 'YYYY-MM-DD', 
        contractEndDate: 'YYYY-MM-DD' 
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'template_pegawai.xlsx');
  };

  const handleSignatureUploaded = (updatedEmployee: Employee) => {
    // Update the state of the main employee list
    setEmployees(prevEmployees =>
        prevEmployees.map(emp =>
            emp.id === updatedEmployee.id ? updatedEmployee : emp
        )
    );

    // Also update the selected employee if it's the one being edited
    if (selectedEmployee && selectedEmployee.id === updatedEmployee.id) {
        setSelectedEmployee(updatedEmployee);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Database Pegawai">
        <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Input
              placeholder="Cari nama pegawai..."
              value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn("name")?.setFilterValue(event.target.value)
              }
              className="w-full sm:max-w-sm"
            />
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={handleDownloadData} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button variant="outline" onClick={handleDownloadTemplate} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Template
              </Button>
              <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </Button>
                </DialogTrigger>
                <ImportDialog setModalOpen={setIsImportModalOpen} />
              </Dialog>
              <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tambah
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Tambah Pegawai Baru</DialogTitle>
                  </DialogHeader>
                  <NewEmployeeForm setModalOpen={setIsNewModalOpen} />
                </DialogContent>
              </Dialog>
            </div>
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
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        );
                      })}
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
                        Tidak ada data.
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
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
             <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
             </Card>
          ))
        ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const employee = row.original;
              const { imageUrl, imageHint } = getAvatarImage(employee.name);
              const { text: remainingText, color: remainingColor } = getRemainingContract(employee.contractEndDate);
              return (
                <Card key={row.id} className="w-full">
                  <CardContent className="p-4 flex gap-4">
                     <Avatar>
                        <AvatarImage src={imageUrl} alt={employee.name} data-ai-hint={imageHint} />
                        <AvatarFallback>
                          {employee.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <div>
                          <button onClick={() => openDetailModal(employee)} className="font-semibold text-left hover:underline">{employee.name}</button>
                          <p className="text-sm text-muted-foreground">{employee.jobTitle}</p>
                        </div>
                         {flexRender(row.getVisibleCells().find(cell => cell.column.id === 'actions')?.column.columnDef.cell, row.getVisibleCells().find(cell => cell.column.id === 'actions')?.getContext())}
                      </div>
                      <div className="border-t my-2"></div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                            <span>NIK:</span>
                            <span className="font-medium text-foreground">{employee.nik}</span>
                        </div>
                         <div className="flex justify-between">
                            <span>Area:</span>
                            <span className="font-medium text-foreground">{employee.areaTugas}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sisa Kontrak:</span>
                          <span className={remainingColor}>{remainingText}</span>
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
              Tidak ada data pegawai.
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Detail/Edit Modal */}
       <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
            <DialogContent className="sm:max-w-4xl max-h-[90dvh] flex flex-col">
                {selectedEmployee ? (
                    <DetailModalContent 
                        employee={selectedEmployee} 
                        onSignatureUploaded={handleSignatureUploaded}
                        closeMainModal={() => setIsDetailModalOpen(false)}
                    />
                ) : (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}
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

    
