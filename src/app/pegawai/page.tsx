
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
import { MoreHorizontal, PlusCircle, Download, Upload, ArrowUpDown, Loader2, Edit, FileText, User, ShieldAlert, PenSquare, CalendarDays, RefreshCw, Cake } from 'lucide-react';
import * as XLSX from 'xlsx';
import { differenceInDays, differenceInMonths, isPast, isAfter, addMonths, startOfMonth } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

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
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AnimatedDialogContent } from "@/components/shared/animated-dialog";
import { NewEmployeeForm } from '@/components/pegawai/new-employee-form';
import { ImportDialog } from '@/components/pegawai/import-dialog';
import { EditEmployeeForm } from '@/components/pegawai/edit-employee-form';
import { getAvatarImage } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SignaturePad } from '@/components/pegawai/signature-pad';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

const MotionCard = motion(Card);

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

function DetailModalContent({ 
    employee, 
    onSignatureUploaded, 
    onContractRenewed,
    closeMainModal, 
    openEditModal, 
    openSignatureModal, 
    openRenewContractModal 
}: { 
    employee: Employee, 
    onSignatureUploaded: (updatedEmployee: Employee) => void, 
    onContractRenewed: (updatedEmployee: Employee) => void,
    closeMainModal: () => void, 
    openEditModal: () => void, 
    openSignatureModal: () => void,
    openRenewContractModal: () => void
}) {
    const firestore = useFirestore();
    
    const warningsCollectionRef = useMemoFirebase(() => collection(firestore, 'employees', employee.id, 'warningLetters'), [firestore, employee.id]);
    const { data: employeeWarnings, isLoading: isLoadingWarnings } = useCollection<Warning>(warningsCollectionRef);

    const { imageUrl, imageHint } = getAvatarImage(employee.name || '');

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

            <div className="flex-grow overflow-y-auto -mx-6 px-6">
                <div className="space-y-4 pt-4">
                    <Tabs defaultValue="profil" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="profil"><User className="mr-2 h-4 w-4" /> Profil</TabsTrigger>
                            <TabsTrigger value="dokumen"><FileText className="mr-2 h-4 w-4" /> Dokumen</TabsTrigger>
                            <TabsTrigger value="peringatan"><ShieldAlert className="mr-2 h-4 w-4" /> Riwayat Peringatan</TabsTrigger>
                        </TabsList>
                        <TabsContent value="profil" className="mt-6 grid gap-6 md:grid-cols-2">
                             <Card>
                                <CardHeader>
                                    <CardTitle>Informasi Pribadi</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center">
                                        <Cake className="h-4 w-4 mr-3 text-muted-foreground" />
                                        <span className="text-sm">Tgl Lahir: {formatDateForDisplay(employee.birthDate)}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <CalendarDays className="h-4 w-4 mr-3 text-muted-foreground" />
                                        <span className="text-sm">Tgl Bergabung: {formatDateForDisplay(employee.joinDate)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Informasi Kontrak</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center">
                                        <CalendarDays className="h-4 w-4 mr-3 text-muted-foreground" />
                                        <span className="text-sm">Awal: {formatDateForDisplay(employee.contractStartDate)}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <CalendarDays className="h-4 w-4 mr-3 text-muted-foreground" />
                                        <span className="text-sm">Akhir: {formatDateForDisplay(employee.contractEndDate)}</span>
                                    </div>
                                    <Button variant="outline" className="w-full" onClick={openRenewContractModal}>
                                        <RefreshCw className="mr-2 h-4 w-4"/>
                                        Perbarui Kontrak
                                    </Button>
                                </CardContent>
                            </Card>
                            <Card className="md:col-span-2">
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
                                            <Button variant="outline" className="w-full" onClick={openSignatureModal}>Ganti Tanda Tangan</Button>
                                        </div>
                                    ) : (
                                        <Button className="w-full" onClick={openSignatureModal}>
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
            </div>
            
            <DialogFooter className="pt-4 border-t -mx-6 px-6 pb-0">
                <Button variant="outline" onClick={closeMainModal}>Tutup</Button>
                <Button onClick={openEditModal}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profil
                </Button>
            </DialogFooter>
        </>
    )
}


export default function PegawaiPage() {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isRenewContractModalOpen, setIsRenewContractModalOpen] = useState(false);
  const [renewalMonths, setRenewalMonths] = useState([6]);
  const [isProcessingRenewal, setIsProcessingRenewal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  

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
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Buka menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </motion.div>
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
      toast.error("Tidak ada data", {
        description: "Tidak ada data pegawai untuk diunduh.",
      });
      return;
    }

    const dataToExport = employees.map(emp => ({
      nik: emp.nik,
      name: emp.name,
      jobTitle: emp.jobTitle,
      areaTugas: emp.areaTugas,
      birthDate: formatDateForExport(emp.birthDate),
      joinDate: formatDateForExport(emp.joinDate),
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
        birthDate: 'YYYY-MM-DD',
        joinDate: 'YYYY-MM-DD',
        contractStartDate: 'YYYY-MM-DD', 
        contractEndDate: 'YYYY-MM-DD' 
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'template_pegawai.xlsx');
  };

  const updateEmployeeState = (updatedEmployee: Employee) => {
    setEmployees(prev => prev.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp));
    if (selectedEmployee && selectedEmployee.id === updatedEmployee.id) {
        setSelectedEmployee(updatedEmployee);
    }
  }

  const handleRenewContract = async () => {
    if (!selectedEmployee) return;
    setIsProcessingRenewal(true);
    try {
        const employeeRef = doc(firestore, 'employees', selectedEmployee.id);
        
        // The new start date is the 1st of the next month after the old contract ends.
        const currentEndDate = new Date(selectedEmployee.contractEndDate);
        const nextMonth = new Date(currentEndDate.getFullYear(), currentEndDate.getMonth() + 1, 1);
        const newStartDate = startOfMonth(nextMonth);
        
        // The new end date is calculated from the new start date.
        const newEndDate = addMonths(newStartDate, renewalMonths[0]);
        
        await updateDoc(employeeRef, {
            contractStartDate: newStartDate.toISOString(),
            contractEndDate: newEndDate.toISOString()
        });

        const updatedEmployee = { 
            ...selectedEmployee, 
            contractStartDate: newStartDate.toISOString(),
            contractEndDate: newEndDate.toISOString() 
        };
        updateEmployeeState(updatedEmployee);
        
        toast.success("Kontrak Diperpanjang", {
            description: `Kontrak ${selectedEmployee.name} telah diperpanjang. Mulai: ${formatDateForDisplay(newStartDate.toISOString())}, Berakhir: ${formatDateForDisplay(newEndDate.toISOString())}`
        });
        setIsRenewContractModalOpen(false);

    } catch (error) {
        console.error("Error renewing contract:", error);
        toast.error("Gagal Memperbarui Kontrak");
    } finally {
        setIsProcessingRenewal(false);
    }
};


  const newContractStartDate = selectedEmployee
    ? startOfMonth(addMonths(new Date(selectedEmployee.contractEndDate), 1))
    : new Date();
  
  const newContractEndDate = addMonths(newContractStartDate, renewalMonths[0]);


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
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
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
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" onClick={handleDownloadData} className="w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" onClick={handleDownloadTemplate} className="w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" />
                  Template
                </Button>
              </motion.div>
              <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                <DialogTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Upload className="mr-2 h-4 w-4" />
                      Import
                    </Button>
                  </motion.div>
                </DialogTrigger>
                <AnimatedDialogContent open={isImportModalOpen}>
                  <ImportDialog setModalOpen={setIsImportModalOpen} />
                </AnimatedDialogContent>
              </Dialog>
              <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
                <DialogTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button className="w-full sm:w-auto">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Tambah
                    </Button>
                  </motion.div>
                </DialogTrigger>
                <AnimatedDialogContent open={isNewModalOpen} className="sm:max-w-[600px] max-h-[90dvh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Tambah Pegawai Baru</DialogTitle>
                  </DialogHeader>
                  <NewEmployeeForm setModalOpen={setIsNewModalOpen} />
                </AnimatedDialogContent>
              </Dialog>
            </div>
        </div>
      </PageHeader>
      
      {/* Desktop Table */}
      <MotionCard 
        className="hidden md:block"
        variants={itemVariants}
      >
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
      </MotionCard>

      {/* Mobile Card View */}
      <motion.div 
        className="grid gap-4 md:hidden"
        variants={containerVariants}
      >
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
                <MotionCard 
                  key={row.id} 
                  className="w-full"
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                >
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
                </MotionCard>
              )
            })
        ) : (
          <Card>
            <CardContent className="p-4 text-center text-muted-foreground">
              Tidak ada data pegawai.
            </CardContent>
          </Card>
        )}
      </motion.div>
      
      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <AnimatePresence>
            {isDetailModalOpen && (
              <AnimatedDialogContent open={isDetailModalOpen} className="sm:max-w-4xl max-h-[90dvh] flex flex-col">
                  {selectedEmployee ? (
                      <DetailModalContent 
                          employee={selectedEmployee} 
                          onSignatureUploaded={updateEmployeeState}
                          onContractRenewed={updateEmployeeState}
                          closeMainModal={() => setIsDetailModalOpen(false)}
                          openEditModal={() => setIsEditModalOpen(true)}
                          openSignatureModal={() => setIsSignatureModalOpen(true)}
                          openRenewContractModal={() => setIsRenewContractModalOpen(true)}
                      />
                  ) : (
                      <div className="flex items-center justify-center p-8">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                  )}
              </AnimatedDialogContent>
            )}
          </AnimatePresence>
      </Dialog>
        
      {/* Nested Modals from Detail */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <AnimatePresence>
          {isEditModalOpen && (
            <AnimatedDialogContent open={isEditModalOpen} className="sm:max-w-[600px] max-h-[90dvh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Edit Data Pegawai</DialogTitle>
                    <DialogDescription>Perbarui informasi detail untuk pegawai ini.</DialogDescription>
                </DialogHeader>
                {selectedEmployee && <EditEmployeeForm employee={selectedEmployee} setModalOpen={setIsEditModalOpen} />}
            </AnimatedDialogContent>
          )}
        </AnimatePresence>
      </Dialog>

      <Dialog open={isSignatureModalOpen} onOpenChange={setIsSignatureModalOpen}>
        <AnimatePresence>
          {isSignatureModalOpen && (
            <AnimatedDialogContent open={isSignatureModalOpen}>
                {selectedEmployee && (
                    <SignaturePad 
                        docId={selectedEmployee.id} 
                        onSignatureUploaded={(newUrl) => {
                            const updatedEmployee = { ...selectedEmployee, signatureUrl: newUrl };
                            updateEmployeeState(updatedEmployee);
                            setIsSignatureModalOpen(false);
                        }}
                        collectionPath="employees"
                    />
                )}
            </AnimatedDialogContent>
          )}
        </AnimatePresence>
      </Dialog>
      
      <Dialog open={isRenewContractModalOpen} onOpenChange={setIsRenewContractModalOpen}>
        <AnimatePresence>
          {isRenewContractModalOpen && (
             <AnimatedDialogContent open={isRenewContractModalOpen} className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Perbarui Kontrak</DialogTitle>
                    <DialogDescription>Perpanjang masa kontrak untuk {selectedEmployee?.name}.</DialogDescription>
                </DialogHeader>
                {selectedEmployee && (
                  <div className="space-y-6 pt-4">
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">Kontrak saat ini berakhir pada:</p>
                      <p className="font-semibold">{formatDateForDisplay(selectedEmployee.contractEndDate)}</p>
                    </div>
                    <div className="space-y-4">
                      <Label htmlFor="renewal-slider">Durasi Perpanjangan: <span className="font-bold text-primary">{renewalMonths[0]} bulan</span></Label>
                      <Slider
                        id="renewal-slider"
                        min={1}
                        max={12}
                        step={1}
                        value={renewalMonths}
                        onValueChange={setRenewalMonths}
                      />
                    </div>
                    <div className="space-y-2 text-sm p-4 border rounded-lg bg-muted/50">
                      <div>
                          <p className="text-muted-foreground">Mulai Kontrak Baru:</p>
                          <p className="font-bold text-lg text-primary">
                            {newContractStartDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                      </div>
                      <div>
                          <p className="text-muted-foreground">Akhir Kontrak Baru:</p>
                          <p className="font-bold text-lg text-primary">
                            {newContractEndDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter className="pt-4">
                    <Button variant="outline" onClick={() => setIsRenewContractModalOpen(false)} disabled={isProcessingRenewal}>Batal</Button>
                    <Button onClick={handleRenewContract} disabled={isProcessingRenewal}>
                        {isProcessingRenewal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Simpan Perpanjangan
                    </Button>
                </DialogFooter>
            </AnimatedDialogContent>
          )}
        </AnimatePresence>
      </Dialog>


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
