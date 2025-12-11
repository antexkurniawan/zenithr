
'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, FileWarning, CalendarCheck, UserPlus, Briefcase, FileDown, Loader2, Cake, FileClock, UserRound } from 'lucide-react';
import { collection, query, where, orderBy, getDocs, doc } from 'firebase/firestore';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import * as XLSX from 'xlsx';

import PageHeader from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TurnoverChart } from '@/components/laporan/turnover-chart';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import type { Employee, Attendance, UserProfile, Warning } from '@/lib/types';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { isWithinInterval, addDays, startOfMonth, endOfMonth, getMonth, parseISO, differenceInYears, differenceInDays, isPast, differenceInMonths, format, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarImage } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { generatePdfFromComponent } from '@/lib/pdf-generator';
import { PrintableAbsensi } from '@/components/absensi/printable-absensi';


type FilterType = 'aktif' | 'habis_kontrak' | 'ulang_tahun';
type AttendanceSummary = {
  employeeId: string;
  employeeName: string;
  employeeNik: string;
  employeeJobTitle: string;
  hadir: number;
  sakit: number;
  izin: number;
  alpha: number;
  cuti: number;
};
type WarningSummary = {
  employeeId: string;
  employeeName: string;
  employeeJobTitle: string;
  Teguran: number;
  SP1: number;
  SP2: number;
  SP3: number;
}


const StatCard = ({ title, value, icon: Icon, isLoading, isActive, onClick }: { title: string, value: string | number, icon: React.ElementType, isLoading?: boolean, isActive: boolean, onClick: () => void }) => (
    <motion.div whileHover={{ scale: 1.03 }} className="h-full">
        <Card 
            className={cn("h-full cursor-pointer transition-all", isActive ? "ring-2 ring-primary bg-primary/10" : "hover:bg-muted/50")}
            onClick={onClick}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                ) : (
                    <div className="text-2xl font-bold">{value}</div>
                )}
            </CardContent>
        </Card>
    </motion.div>
);

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


const LaporanPegawaiTab = () => {
    const [activeFilter, setActiveFilter] = useState<FilterType>('aktif');
    const [filteredData, setFilteredData] = useState<Employee[]>([]);

    const firestore = useFirestore();
    const employeesCollectionRef = useMemoFirebase(() => collection(firestore, 'employees'), [firestore]);
    const { data: employees, isLoading } = useCollection<Employee>(employeesCollectionRef);
    
    const pegawaiAktif = useMemo(() => employees?.filter(e => e.status === 'Aktif' || e.status === 'Kontrak') || [], [employees]);

    const pegawaiHabisKontrak = useMemo(() => {
        const today = new Date();
        const next30Days = addDays(today, 30);
        return pegawaiAktif.filter(e => {
            if (!e.contractEndDate) return false;
            try {
                const endDate = new Date(e.contractEndDate);
                return isWithinInterval(endDate, { start: today, end: next30Days });
            } catch (error) {
                return false;
            }
        });
    }, [pegawaiAktif]);

    const pegawaiUlangTahun = useMemo(() => {
        const currentMonth = getMonth(new Date());
        return pegawaiAktif.filter(e => {
            if (!e.birthDate) return false;
            try {
                const birthDate = new Date(e.birthDate);
                return getMonth(birthDate) === currentMonth;
            } catch (error) {
                return false;
            }
        });
    }, [pegawaiAktif]);

    useEffect(() => {
        switch (activeFilter) {
            case 'aktif':
                setFilteredData(pegawaiAktif);
                break;
            case 'habis_kontrak':
                setFilteredData(pegawaiHabisKontrak);
                break;
            case 'ulang_tahun':
                setFilteredData(pegawaiUlangTahun);
                break;
            default:
                setFilteredData(pegawaiAktif);
        }
    }, [activeFilter, pegawaiAktif, pegawaiHabisKontrak, pegawaiUlangTahun]);

    const handleExportExcel = () => {
        if (filteredData.length === 0) {
            toast.error("Tidak ada data untuk diekspor.");
            return;
        }
        const dataToExport = filteredData.map(emp => ({
            NIK: emp.nik,
            Nama: emp.name,
            Jabatan: emp.jobTitle,
            'Area Tugas': emp.areaTugas,
            'Tanggal Lahir': emp.birthDate ? new Date(emp.birthDate).toLocaleDateString('id-ID') : '',
            'Awal Kontrak': emp.contractStartDate ? new Date(emp.contractStartDate).toLocaleDateString('id-ID') : '',
            'Akhir Kontrak': emp.contractEndDate ? new Date(emp.contractEndDate).toLocaleDateString('id-ID') : '',
            Status: emp.status
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Laporan Pegawai - ${activeFilter}`);
        XLSX.writeFile(wb, `Laporan Pegawai - ${activeFilter}.xlsx`);
    };

    const columns = useMemo<ColumnDef<Employee>[]>(() => {
        const baseColumns: ColumnDef<Employee>[] = [
            {
                accessorKey: "name",
                header: "Nama Pegawai",
                cell: ({ row }) => {
                    const employee = row.original;
                    const { imageUrl } = getAvatarImage(employee.name);
                    return (
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={imageUrl} alt={employee.name} />
                          <AvatarFallback>
                            {employee.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-muted-foreground">NIK: {employee.nik}</p>
                        </div>
                      </div>
                    );
                },
            },
            { accessorKey: "jobTitle", header: "Jabatan" },
        ];
        
        if (activeFilter === 'ulang_tahun') {
            return [
                ...baseColumns,
                {
                    accessorKey: "birthDate",
                    header: "Tgl. Ulang Tahun",
                    cell: ({ row }) => row.original.birthDate ? new Date(row.original.birthDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' }) : '-',
                },
                {
                    id: "age",
                    header: "Umur",
                    cell: ({ row }) => {
                        if(!row.original.birthDate) return '-';
                        const birthDate = new Date(row.original.birthDate);
                        const age = differenceInYears(new Date(), birthDate);
                        return `${age} tahun`;
                    },
                },
            ];
        }
        
        if (activeFilter === 'habis_kontrak') {
            return [
                ...baseColumns,
                 { 
                    accessorKey: "contractEndDate", 
                    header: "Akhir Kontrak", 
                    cell: ({row}) => row.original.contractEndDate ? new Date(row.original.contractEndDate).toLocaleDateString('id-ID') : '-'
                 },
                 {
                    id: 'remainingContract',
                    header: "Sisa Kontrak",
                    cell: ({ row }) => {
                        const { text, color } = getRemainingContract(row.original.contractEndDate);
                        return <span className={color}>{text}</span>;
                    }
                },
            ];
        }

        // Default columns for 'aktif'
        return [
            ...baseColumns,
            { accessorKey: "areaTugas", header: "Area Tugas" },
            { accessorKey: "contractEndDate", header: "Akhir Kontrak", cell: ({row}) => row.original.contractEndDate ? new Date(row.original.contractEndDate).toLocaleDateString('id-ID') : '-' },
        ];
    }, [activeFilter]);


    const table = useReactTable({
        data: filteredData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });


    return (
        <motion.div className="space-y-6 mt-4">
             <div className="grid gap-4 md:grid-cols-3">
                <StatCard 
                    title="Pegawai Aktif"
                    value={pegawaiAktif.length}
                    icon={Users}
                    isLoading={isLoading}
                    isActive={activeFilter === 'aktif'}
                    onClick={() => setActiveFilter('aktif')}
                />
                <StatCard 
                    title="Akan Habis Kontrak"
                    value={pegawaiHabisKontrak.length}
                    icon={FileClock}
                    isLoading={isLoading}
                    isActive={activeFilter === 'habis_kontrak'}
                    onClick={() => setActiveFilter('habis_kontrak')}
                />
                <StatCard 
                    title="Ulang Tahun Bulan Ini"
                    value={pegawaiUlangTahun.length}
                    icon={Cake}
                    isLoading={isLoading}
                    isActive={activeFilter === 'ulang_tahun'}
                    onClick={() => setActiveFilter('ulang_tahun')}
                />
            </div>
            
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                           <UserRound className="h-5 w-5" />
                           Data Pegawai
                        </CardTitle>
                        <CardDescription>
                            Menampilkan data pegawai berdasarkan filter yang dipilih.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                         {activeFilter !== 'aktif' && (
                            <Button variant="ghost" onClick={() => setActiveFilter('aktif')}>Lihat Semua Pegawai Aktif</Button>
                         )}
                        <Button variant="outline" onClick={handleExportExcel} disabled={isLoading || filteredData.length === 0}>
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <FileDown className="mr-2 h-4 w-4" />
                            )}
                            Ekspor ke Excel
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
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
                                                <Skeleton className="h-12 w-full" />
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
                                            Tidak ada data untuk ditampilkan.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
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
                </CardContent>
            </Card>
        </motion.div>
    );
};


const ReportTabContent = ({ title, description }: { title: string, description: string }) => (
     <motion.div>
        <Card className="mt-4">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground text-center py-8">
                    Fitur laporan untuk {title.toLowerCase()} akan segera kita bangun di sini.
                </p>
            </CardContent>
        </Card>
     </motion.div>
  );

const LaporanAbsensiTab = () => {
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: new Date(),
    });
    const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [reportGenerated, setReportGenerated] = useState(false);
    
    const firestore = useFirestore();
    const { user } = useUser();
    
    const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
    const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

    const handleGenerateReport = async () => {
        if (!dateRange?.from) {
            toast.error("Periode tidak valid", { description: "Silakan pilih tanggal mulai." });
            return;
        }
        setIsLoading(true);
        setReportGenerated(false);

        try {
            // 1. Fetch all employees first
            const employeesQuery = query(collection(firestore, 'employees'), orderBy('name', 'asc'));
            const employeesSnapshot = await getDocs(employeesQuery);
            const allEmployees = employeesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Employee[];

            // 2. Initialize summary map with all employees
            const summaryMap = new Map<string, AttendanceSummary>();
            allEmployees.forEach(emp => {
                summaryMap.set(emp.id, {
                    employeeId: emp.id, 
                    employeeName: emp.name, 
                    employeeNik: emp.nik, 
                    employeeJobTitle: emp.jobTitle,
                    hadir: 0, sakit: 0, izin: 0, alpha: 0, cuti: 0,
                });
            });

            // 3. Fetch attendance data for the selected period
            const attendanceQuery = query(
                collection(firestore, 'attendances'),
                where('date', '>=', dateRange.from.toISOString().split('T')[0]),
                where('date', '<=', (dateRange.to || dateRange.from).toISOString().split('T')[0])
            );
            const attendanceSnapshot = await getDocs(attendanceQuery);
            const attendances = attendanceSnapshot.docs.map(doc => doc.data()) as Attendance[];
            
            // 4. Populate the summary map with attendance data
            attendances.forEach(att => {
                const summary = summaryMap.get(att.employeeId);
                if (summary) {
                    switch (att.status) {
                        case 'Hadir': summary.hadir++; break;
                        case 'Sakit': summary.sakit++; break;
                        case 'Izin': summary.izin++; break;
                        case 'Alpha': summary.alpha++; break;
                        case 'Cuti': summary.cuti++; break;
                    }
                }
            });

            // 5. Set the final summary array to state
            setAttendanceSummary(Array.from(summaryMap.values()));
            setReportGenerated(true);
            
        } catch (error) {
            console.error(error);
            toast.error("Gagal mengambil data", { description: "Terjadi kesalahan saat memuat laporan absensi." });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleExportPdf = async () => {
        if (!attendanceSummary || attendanceSummary.length === 0) {
          toast.error("Tidak ada data untuk diekspor");
          return;
        }
        setIsExporting(true);
        const toastId = toast.loading("Mempersiapkan PDF...", {
          description: "Mohon tunggu sebentar.",
        });

        try {
            const ComponentToPrint = <PrintableAbsensi data={attendanceSummary} period={dateRange} userProfile={userProfile} />;
            await generatePdfFromComponent(
                ComponentToPrint,
                `Rekap Absensi - ${dateRange?.from ? format(dateRange.from, 'dd-MM-yy') : ''} - ${dateRange?.to ? format(dateRange.to, 'dd-MM-yy') : ''}.pdf`
            );
            toast.dismiss(toastId);
        } catch (error) {
            console.error("Failed to generate PDF", error);
            toast.error("Gagal Membuat PDF", {
                id: 'pdf-error',
                description: "Terjadi kesalahan saat mencoba membuat file PDF.",
            });
        } finally {
            setIsExporting(false);
        }
    };


    const columns: ColumnDef<AttendanceSummary>[] = [
        { accessorKey: "employeeNik", header: "NIK" },
        { accessorKey: "employeeName", header: "Nama Pegawai" },
        { accessorKey: "employeeJobTitle", header: "Jabatan" },
        { accessorKey: "hadir", header: "Hadir", cell: ({ row }) => <div className="text-center">{row.original.hadir}</div> },
        { accessorKey: "sakit", header: "Sakit", cell: ({ row }) => <div className="text-center">{row.original.sakit}</div> },
        { accessorKey: "izin", header: "Izin", cell: ({ row }) => <div className="text-center">{row.original.izin}</div> },
        { accessorKey: "alpha", header: "Alpha", cell: ({ row }) => <div className="text-center">{row.original.alpha}</div> },
        { accessorKey: "cuti", header: "Cuti", cell: ({ row }) => <div className="text-center">{row.original.cuti}</div> },
    ];

    const table = useReactTable({
        data: attendanceSummary,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle>Laporan Rekapitulasi Absensi</CardTitle>
                <CardDescription>Pilih periode untuk menampilkan rekap absensi pegawai, lalu ekspor ke PDF.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-lg bg-muted/50">
                    <DateRangePicker date={dateRange} onDateChange={setDateRange} className="w-full sm:w-auto" />
                    <Button onClick={handleGenerateReport} disabled={isLoading} className="w-full sm:w-auto">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Tampilkan Laporan
                    </Button>
                    <Button variant="outline" onClick={handleExportPdf} disabled={!reportGenerated || isExporting} className="w-full sm:w-auto">
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                        Ekspor PDF
                    </Button>
                </div>

                {isLoading && (
                    <div className="flex flex-col items-center justify-center text-center py-16">
                        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                        <p className="font-semibold">Memuat Data Laporan...</p>
                        <p className="text-sm text-muted-foreground">Ini mungkin memakan waktu beberapa saat.</p>
                    </div>
                )}

                {reportGenerated && !isLoading && (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows?.length ? (
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow key={row.id}>
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center">Tidak ada data absensi untuk periode ini.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {!reportGenerated && !isLoading && (
                     <div className="flex flex-col items-center justify-center text-center py-16 border-2 border-dashed rounded-lg">
                        <CalendarCheck className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="font-semibold">Laporan Absensi Belum Dibuat</p>
                        <p className="text-sm text-muted-foreground">Pilih periode tanggal dan klik "Tampilkan Laporan" untuk memulai.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

const LaporanPeringatanTab = () => {
    const firestore = useFirestore();

    const employeesCollectionRef = useMemoFirebase(() => query(collection(firestore, 'employees'), orderBy('name', 'asc')), [firestore]);
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesCollectionRef);

    const warningsCollectionRef = useMemoFirebase(() => query(collection(firestore, 'warnings')), [firestore]);
    const { data: warnings, isLoading: isLoadingWarnings } = useCollection<Warning>(warningsCollectionRef);

    const warningSummary = useMemo<WarningSummary[]>(() => {
        if (!employees || !warnings) return [];

        const activeWarnings = warnings.filter(w => isAfter(new Date(w.expiryDate), new Date()));
        
        const summaryMap = new Map<string, WarningSummary>();

        // Initialize map with all employees
        employees.forEach(emp => {
            summaryMap.set(emp.id, {
                employeeId: emp.id,
                employeeName: emp.name,
                employeeJobTitle: emp.jobTitle,
                Teguran: 0,
                SP1: 0,
                SP2: 0,
                SP3: 0,
            });
        });

        // Populate with active warnings count
        activeWarnings.forEach(warning => {
            const summary = summaryMap.get(warning.employeeId);
            if (summary) {
                summary[warning.type]++;
            }
        });
        
        return Array.from(summaryMap.values());
    }, [employees, warnings]);
    
    const handleExportExcel = () => {
        if (warningSummary.length === 0) {
            toast.error("Tidak ada data untuk diekspor.");
            return;
        }
        const dataToExport = warningSummary.map(item => ({
            'Nama Pegawai': item.employeeName,
            'Jabatan': item.employeeJobTitle,
            'ST': item.Teguran,
            'SP 1': item.SP1,
            'SP 2': item.SP2,
            'SP 3': item.SP3,
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Rekap Surat Peringatan");
        XLSX.writeFile(wb, "Laporan Rekap Peringatan.xlsx");
    };

    const columns: ColumnDef<WarningSummary>[] = [
        { accessorKey: "employeeName", header: "Nama Pegawai" },
        { accessorKey: "employeeJobTitle", header: "Jabatan" },
        { accessorKey: "Teguran", header: "ST", cell: ({ row }) => <div className="text-center">{row.original.Teguran || 0}</div> },
        { accessorKey: "SP1", header: "SP 1", cell: ({ row }) => <div className="text-center">{row.original.SP1 || 0}</div> },
        { accessorKey: "SP2", header: "SP 2", cell: ({ row }) => <div className="text-center">{row.original.SP2 || 0}</div> },
        { accessorKey: "SP3", header: "SP 3", cell: ({ row }) => <div className="text-center">{row.original.SP3 || 0}</div> },
    ];

    const table = useReactTable({
        data: warningSummary,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });
    
    const isLoading = isLoadingEmployees || isLoadingWarnings;

    return (
        <Card className="mt-4">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Rekapitulasi Surat Peringatan Aktif</CardTitle>
                    <CardDescription>Tabel ini merangkum jumlah surat peringatan (SP) dan surat teguran (ST) yang masih aktif untuk setiap pegawai.</CardDescription>
                </div>
                 <Button variant="outline" onClick={handleExportExcel} disabled={isLoading || warningSummary.length === 0}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Ekspor ke Excel
                </Button>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={columns.length}>
                                            <Skeleton className="h-10 w-full" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow key={row.id}>
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={columns.length} className="h-24 text-center">Tidak ada data peringatan untuk ditampilkan.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
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
            </CardContent>
        </Card>
    );
};


export default function LaporanPage() {
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
      <PageHeader
        title="Pusat Laporan HR"
        description="Analisis dan unduh data penting untuk kebutuhan HR."
      />

      <motion.div variants={itemVariants}>
        <Tabs defaultValue="pegawai" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="pegawai"><Users className="mr-2 h-4 w-4" /> Pegawai</TabsTrigger>
                <TabsTrigger value="briefing"><FileText className="mr-2 h-4 w-4" /> Briefing</TabsTrigger>
                <TabsTrigger value="peringatan"><FileWarning className="mr-2 h-4 w-4" /> Peringatan</TabsTrigger>
                <TabsTrigger value="absensi"><CalendarCheck className="mr-2 h-4 w-4" /> Absensi</TabsTrigger>
            </TabsList>
            <TabsContent value="pegawai">
                <LaporanPegawaiTab />
            </TabsContent>
            <TabsContent value="briefing">
                 <ReportTabContent 
                    title="Laporan Briefing"
                    description="Rekapitulasi pelaksanaan briefing, materi, dan daftar hadir."
                />
            </TabsContent>
            <TabsContent value="peringatan">
                 <LaporanPeringatanTab />
            </TabsContent>
            <TabsContent value="absensi">
                 <LaporanAbsensiTab />
            </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
