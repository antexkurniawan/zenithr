
'use client';

import { useState, useMemo } from 'react';
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
import { Upload, MoreHorizontal, Download, FileDown, Loader2 } from 'lucide-react';
import { collection, query, orderBy, where } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Attendance, Employee } from '@/lib/types';
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
} from '@/components/ui/card';
import PageHeader from '@/components/shared/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ImportAbsensiDialog } from '@/components/absensi/import-dialog';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useToast } from '@/hooks/use-toast';
import { generatePdfFromComponent } from '@/lib/pdf-generator';
import { PrintableAbsensi } from '@/components/absensi/printable-absensi';

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

export default function AbsensiPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const firestore = useFirestore();
  
  const employeesCollection = useMemoFirebase(() => collection(firestore, 'employees'), [firestore]);
  const employeesQuery = useMemoFirebase(() => query(employeesCollection, orderBy('name', 'asc')), [employeesCollection]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    let q = query(collection(firestore, 'attendances'));
    if (dateRange?.from && dateRange?.to) {
      q = query(q, 
        where('date', '>=', dateRange.from.toISOString().split('T')[0]),
        where('date', '<=', dateRange.to.toISOString().split('T')[0])
      );
    } else if (dateRange?.from) {
      q = query(q, where('date', '>=', dateRange.from.toISOString().split('T')[0]));
    }
    return q;
  }, [firestore, dateRange]);
  
  const { data: attendances, isLoading: isLoadingAttendances } = useCollection<Attendance>(attendanceQuery);


  const attendanceSummary = useMemo(() => {
    if (!employees) return [];
    
    const summaryMap = new Map<string, AttendanceSummary>();

    // Initialize map with all employees
    employees.forEach(emp => {
      summaryMap.set(emp.id, {
        employeeId: emp.id,
        employeeName: emp.name,
        employeeNik: emp.nik,
        employeeJobTitle: emp.jobTitle,
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpha: 0,
        cuti: 0,
      });
    });

    // Populate with attendance data (which is already filtered by date from the hook)
    if(attendances){
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
    }


    return Array.from(summaryMap.values());
  }, [attendances, employees]);

  const handleDownloadTemplate = () => {
    const header = ["LAPORAN ABSENSI"];
    
    const tableHeader = ["NO", "NIK", "NAMA", "KETERANGAN", "TANGGAL", "JAM"];
    
    const exampleData = [
      {
        NO: 1,
        NIK: "12345",
        NAMA: "BUDI SANTOSO",
        KETERANGAN: "MASUK",
        TANGGAL: "2024-07-01",
        JAM: "08:00:00"
      },
       {
        NO: 2,
        NIK: "67890",
        NAMA: "RINA AMELIA",
        KETERANGAN: "SAKIT",
        TANGGAL: "2024-07-01",
        JAM: ""
      }
    ];

    const ws_data = [
      header,
      [], // Empty row for spacing
      [], // Empty row for spacing
      tableHeader,
      ...exampleData.map(d => [d.NO, d.NIK, d.NAMA, d.KETERANGAN, d.TANGGAL, d.JAM])
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Merge cells for the main header
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }]; // Merge A1 to F1

    // Style the main header
    if (ws['A1']) {
      ws['A1'].s = {
        font: { bold: true, sz: 16 },
        alignment: { horizontal: 'center' }
      };
    }

    // Style table header
    tableHeader.forEach((h, i) => {
        const cellRef = XLSX.utils.encode_cell({c: i, r: 3});
        if (ws[cellRef]) {
            ws[cellRef].s = {
                font: { bold: true, color: { rgb: "FFFFFF" } },
                fill: { fgColor: { rgb: "4F81BD" } },
                alignment: { horizontal: 'center' },
                border: {
                  top: { style: "thin" },
                  bottom: { style: "thin" },
                  left: { style: "thin" },
                  right: { style: "thin" }
                }
            };
        }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Absensi');
    XLSX.writeFile(wb, 'template_absensi.xlsx');
  }

  const handleExportPdf = async () => {
    if (!attendanceSummary || attendanceSummary.length === 0) {
      toast({
        title: "Tidak ada data untuk diekspor",
        variant: "destructive"
      });
      return;
    }
    setIsExporting(true);
    const { dismiss } = toast({
      title: "Mempersiapkan PDF...",
      description: "Mohon tunggu sebentar.",
    });

    try {
        const ComponentToPrint = <PrintableAbsensi data={attendanceSummary} period={dateRange} />;
        await generatePdfFromComponent(
            ComponentToPrint,
            `Rekap Absensi - ${dateRange?.from ? format(dateRange.from, 'dd-MM-yy') : ''} - ${dateRange?.to ? format(dateRange.to, 'dd-MM-yy') : ''}.pdf`
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
        setIsExporting(false);
    }
  };


  const columns: ColumnDef<AttendanceSummary>[] = [
    {
      accessorKey: "employeeName",
      header: "Nama Pegawai",
    },
    {
      accessorKey: "employeeNik",
      header: "NIK",
    },
    {
      accessorKey: "employeeJobTitle",
      header: "Jabatan",
    },
    {
      accessorKey: "hadir",
      header: "Hadir (HK)",
       cell: ({ row }) => <div className="text-center">{row.original.hadir}</div>
    },
    {
      accessorKey: "sakit",
      header: "Sakit",
      cell: ({ row }) => <div className="text-center">{row.original.sakit}</div>
    },
    {
      accessorKey: "izin",
      header: "Izin",
       cell: ({ row }) => <div className="text-center">{row.original.izin}</div>
    },
     {
      accessorKey: "alpha",
      header: "Alpha",
      cell: ({ row }) => <div className="text-center">{row.original.alpha}</div>
    },
     {
      accessorKey: "cuti",
      header: "Cuti",
       cell: ({ row }) => <div className="text-center">{row.original.cuti}</div>
    },
    {
      id: "actions",
      cell: () => {
        return (
            <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Buka menu</span>
                <MoreHorizontal className="h-4 w-4" />
            </Button>
        );
      },
    }
  ];

  const table = useReactTable({
    data: attendanceSummary,
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

  const isLoading = isLoadingAttendances || isLoadingEmployees;

  return (
    <div className="space-y-6">
      <PageHeader title="Rekap Absensi Pegawai">
        <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Input
              placeholder="Cari nama pegawai..."
              value={(table.getColumn("employeeName")?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn("employeeName")?.setFilterValue(event.target.value)
              }
              className="w-full sm:max-w-sm"
            />
            <DateRangePicker date={dateRange} onDateChange={setDateRange} className="w-full sm:w-auto" />
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={handleDownloadTemplate} className="w-full sm:w-auto">
                  <Download className="mr-2 h-4 w-4" />
                  Template
              </Button>
              <Button variant="outline" className="w-full sm:w-auto" disabled={isExporting} onClick={handleExportPdf}>
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                Ekspor PDF
              </Button>
              <Dialog open={isImportModalOpen} onOpenChange={setImportModalOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Upload className="mr-2 h-4 w-4" />
                    Import Data
                  </Button>
                </DialogTrigger>
                <ImportAbsensiDialog setModalOpen={setImportModalOpen} />
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
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={columns.length}>
                          <Skeleton className="h-12 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.original.employeeId}
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
                        Belum ada data absensi. Silakan impor data terlebih dahulu atau sesuaikan filter periode.
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
                  <Skeleton className="h-28 w-full" />
                </CardContent>
             </Card>
          ))
        ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const summary = row.original;
              return (
                <Card key={row.id} className="w-full">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <p className="font-semibold text-left">{summary.employeeName}</p>
                            <p className="text-sm text-muted-foreground">{summary.employeeJobTitle} (NIK: {summary.employeeNik})</p>
                        </div>
                        {flexRender(row.getVisibleCells().find(cell => cell.column.id === 'actions')?.column.columnDef.cell, row.getVisibleCells().find(cell => cell.column.id === 'actions')?.getContext())}
                    </div>
                     <div className="grid grid-cols-5 gap-2 text-center text-xs">
                        <div>
                            <p className="font-bold text-lg">{summary.hadir}</p>
                            <p className="text-muted-foreground">Hadir</p>
                        </div>
                        <div>
                            <p className="font-bold text-lg">{summary.sakit}</p>
                            <p className="text-muted-foreground">Sakit</p>
                        </div>
                        <div>
                            <p className="font-bold text-lg">{summary.izin}</p>
                            <p className="text-muted-foreground">Izin</p>
                        </div>
                        <div>
                            <p className="font-bold text-lg">{summary.alpha}</p>
                            <p className="text-muted-foreground">Alpha</p>
                        </div>
                        <div>
                            <p className="font-bold text-lg">{summary.cuti}</p>
                            <p className="text-muted-foreground">Cuti</p>
                        </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
        ) : (
          <Card>
            <CardContent className="p-4 text-center text-muted-foreground">
              Belum ada data absensi untuk periode ini.
            </CardContent>
          </Card>
        )}
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
    </div>
  );
}
