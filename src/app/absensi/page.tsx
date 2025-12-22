
'use client';

import { useState, useMemo, useEffect } from "react";
import { PlusCircle, Upload, Loader2, CalendarRange, ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDate, getDaysInMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { collection, query, where, getDocs } from 'firebase/firestore';
import * as XLSX from 'xlsx';

import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { AnimatedDialogContent } from "@/components/shared/animated-dialog";
import { ImportAbsensiDialog } from "@/components/absensi/import-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFirestore } from "@/firebase";
import { Employee, Attendance } from "@/lib/types";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

type ScheduleData = {
  [employeeId: string]: {
    employee: Employee;
    schedule: { [day: number]: string };
  };
};

export default function AbsensiPage() {
    const [isImportModalOpen, setImportModalOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [scheduleData, setScheduleData] = useState<ScheduleData>({});
    const [isLoading, setIsLoading] = useState(false);

    const firestore = useFirestore();

    const fetchScheduleData = async (month: Date) => {
        setIsLoading(true);
        try {
            const start = startOfMonth(month);
            const end = endOfMonth(month);

            const employeesQuery = query(collection(firestore, 'employees'));
            const attendanceQuery = query(
                collection(firestore, 'attendances'),
                where('date', '>=', format(start, 'yyyy-MM-dd')),
                where('date', '<=', format(end, 'yyyy-MM-dd'))
            );

            const [employeesSnapshot, attendanceSnapshot] = await Promise.all([
                getDocs(employeesQuery),
                getDocs(attendanceQuery),
            ]);

            const employees = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
            const attendances = attendanceSnapshot.docs.map(doc => doc.data() as Attendance);

            const data: ScheduleData = {};

            employees.forEach(emp => {
                data[emp.id] = {
                    employee: emp,
                    schedule: {}
                };
            });

            attendances.forEach(att => {
                if (data[att.employeeId]) {
                    const dayOfMonth = getDate(new Date(att.date));
                    data[att.employeeId].schedule[dayOfMonth] = att.status;
                }
            });
            
            setScheduleData(data);

        } catch (error) {
            console.error("Failed to fetch schedule data:", error);
            toast.error("Gagal Memuat Jadwal", {
                description: "Terjadi kesalahan saat mengambil data dari database."
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchScheduleData(currentMonth);
    }, [currentMonth]);
    
    const changeMonth = (amount: number) => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + amount, 1));
    };
    
    const daysInMonth = getDaysInMonth(currentMonth);
    const monthHeaders = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const handleExportExcel = () => {
        if (Object.keys(scheduleData).length === 0) {
            toast.error("Tidak ada data untuk diekspor.");
            return;
        }

        const dataToExport = Object.values(scheduleData).map(({ employee, schedule }) => {
            const row: { [key: string]: any } = {
                'NIK': employee.nik,
                'Nama': employee.name,
            };
            monthHeaders.forEach(day => {
                row[day] = schedule[day] || '';
            });
            return row;
        });

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Jadwal ${format(currentMonth, 'MMMM yyyy')}`);
        XLSX.writeFile(wb, `Jadwal Kerja - ${format(currentMonth, 'MMMM-yyyy')}.xlsx`);
    };

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
            <PageHeader title="Manajemen Absensi & Jadwal Kerja">
                <Dialog open={isImportModalOpen} onOpenChange={setImportModalOpen}>
                    <DialogTrigger asChild>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button>
                                <Upload className="mr-2 h-4 w-4" />
                                Impor Jadwal/Absensi
                            </Button>
                        </motion.div>
                    </DialogTrigger>
                    <AnimatedDialogContent open={isImportModalOpen}>
                        <ImportAbsensiDialog setModalOpen={setImportModalOpen} />
                    </AnimatedDialogContent>
                </Dialog>
            </PageHeader>

             <motion.div variants={itemVariants}>
                <Tabs defaultValue="jadwal" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="jadwal">Jadwal Kerja</TabsTrigger>
                        <TabsTrigger value="absensi">Rekap Absensi</TabsTrigger>
                    </TabsList>
                    <TabsContent value="jadwal">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <CardTitle>Jadwal Kerja Bulanan</CardTitle>
                                        <CardDescription>Menampilkan jadwal kerja pegawai per bulan.</CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}>
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="font-semibold text-center w-32">{format(currentMonth, 'MMMM yyyy', { locale: id })}</span>
                                        <Button variant="outline" size="icon" onClick={() => changeMonth(1)}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={isLoading}>
                                            <FileDown className="mr-2 h-4 w-4" />
                                            Ekspor
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto border rounded-lg">
                                    <Table className="min-w-max">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="sticky left-0 bg-background z-10 w-[250px]">Nama Pegawai</TableHead>
                                                {monthHeaders.map(day => (
                                                    <TableHead key={day} className="text-center">{day}</TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isLoading ? (
                                                Array.from({ length: 10 }).map((_, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell className="sticky left-0 bg-background z-10 w-[250px]"><Skeleton className="h-6 w-3/4" /></TableCell>
                                                        {monthHeaders.map(day => (
                                                            <TableCell key={day}><Skeleton className="h-6 w-6 mx-auto" /></TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))
                                            ) : Object.keys(scheduleData).length > 0 ? (
                                                Object.values(scheduleData).map(({ employee, schedule }) => (
                                                    <TableRow key={employee.id}>
                                                        <TableCell className="sticky left-0 bg-background z-10 font-medium w-[250px]">{employee.name}</TableCell>
                                                        {monthHeaders.map(day => (
                                                            <TableCell key={day} className="text-center">{schedule[day] || '-'}</TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={daysInMonth + 1} className="h-48 text-center">
                                                        Tidak ada data jadwal untuk bulan ini. Coba impor data terlebih dahulu.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="absensi">
                        <Card>
                            <CardHeader>
                                <CardTitle>Daftar Kehadiran</CardTitle>
                                <CardDescription>Tampilan data kehadiran pegawai akan ditampilkan di sini.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-96 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg">
                                    <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
                                    <p className="font-semibold text-muted-foreground">Fitur dalam pengembangan</p>
                                    <p className="text-sm text-muted-foreground">Tampilan tabel data absensi akan segera hadir.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
             </motion.div>
        </motion.div>
    );
}

