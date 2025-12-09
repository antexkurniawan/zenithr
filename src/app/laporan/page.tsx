
'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, FileWarning, CalendarCheck, UserPlus, Briefcase, FileDown, Loader2, Cake, FileClock, UserRound } from 'lucide-react';
import { collection, query, where, orderBy } from 'firebase/firestore';
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
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Employee } from '@/lib/types';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { isWithinInterval, addDays, startOfMonth, endOfMonth, getMonth, parseISO, differenceInYears } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarImage } from '@/lib/utils';

type FilterType = 'aktif' | 'habis_kontrak' | 'ulang_tahun';


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
            const endDate = parseISO(e.contractEndDate);
            return isWithinInterval(endDate, { start: today, end: next30Days });
        });
    }, [pegawaiAktif]);

    const pegawaiUlangTahun = useMemo(() => {
        const currentMonth = getMonth(new Date());
        return pegawaiAktif.filter(e => {
            if (!e.birthDate) return false;
            const birthDate = parseISO(e.birthDate);
            return getMonth(birthDate) === currentMonth;
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
            'Tanggal Lahir': emp.birthDate,
            'Awal Kontrak': emp.contractStartDate,
            'Akhir Kontrak': emp.contractEndDate,
            Status: emp.status
        }));
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Laporan Pegawai - ${activeFilter}`);
        XLSX.writeFile(wb, `Laporan Pegawai - ${activeFilter}.xlsx`);
    };

    const columns = useMemo<ColumnDef<Employee>[]>(() => {
        const defaultColumns: ColumnDef<Employee>[] = [
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
            { accessorKey: "areaTugas", header: "Area Tugas" },
            { accessorKey: "contractEndDate", header: "Akhir Kontrak", cell: ({row}) => new Date(row.original.contractEndDate).toLocaleDateString('id-ID') },
        ];

        const birthdayColumns: ColumnDef<Employee>[] = [
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
            {
                accessorKey: "birthDate",
                header: "Tgl. Ulang Tahun",
                cell: ({ row }) => new Date(row.original.birthDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' }),
            },
            {
                id: "age",
                header: "Umur",
                cell: ({ row }) => {
                    const birthDate = new Date(row.original.birthDate);
                    const age = differenceInYears(new Date(), birthDate);
                    return `${age + 1} tahun`;
                },
            },
        ];

        return activeFilter === 'ulang_tahun' ? birthdayColumns : defaultColumns;
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
                 <ReportTabContent 
                    title="Laporan Surat Peringatan"
                    description="Analisis tren pelanggaran dan rekapitulasi surat peringatan aktif."
                />
            </TabsContent>
            <TabsContent value="absensi">
                 <ReportTabContent 
                    title="Laporan Absensi"
                    description="Rekapitulasi dan analisis tingkat kehadiran, keterlambatan, dan absensi."
                />
            </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
