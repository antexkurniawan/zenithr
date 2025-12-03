
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Upload, FileCheck2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { collection, writeBatch, serverTimestamp, getDocs, query, where, doc } from 'firebase/firestore';

import { useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ScrollArea } from '../ui/scroll-area';
import { Attendance, AttendanceStatus, Employee } from '@/lib/types';
import { Alert, AlertDescription } from '../ui/alert';

const formSchema = z.object({
  file: z.custom<FileList>().refine((files) => files?.length === 1, 'File is required.'),
});

type ImportFormValues = z.infer<typeof formSchema>;
type ParsedRow = {
  employeeNik: string;
  employeeName: string;
  date: string;
  status: AttendanceStatus;
};

interface ImportDialogProps {
  setModalOpen: (open: boolean) => void;
}

const statusMap: { [key: string]: AttendanceStatus | null } = {
  'H': 'Hadir', 'Hadir': 'Hadir', 'HADIR': 'Hadir',
  'S': 'Sakit', 'Sakit': 'Sakit', 'SAKIT': 'Sakit',
  'I': 'Izin', 'Izin': 'Izin', 'IZIN': 'Izin',
  'A': 'Alpha', 'Alpha': 'Alpha', 'ALPHA': 'Alpha',
  'C': 'Cuti', 'Cuti': 'Cuti', 'CUTI': 'Cuti',
  // Map other statuses to null to ignore them
  'OFF': null, 'L': null, 'C(B)': null,
};

const monthMap: { [key: string]: number } = {
  'januari': 1, 'februari': 2, 'maret': 3, 'april': 4, 'mei': 5, 'juni': 6,
  'juli': 7, 'agustus': 8, 'september': 9, 'oktober': 10, 'november': 11, 'desember': 12,
};

export function ImportAbsensiDialog({ setModalOpen }: ImportDialogProps) {
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<ImportFormValues>({
    resolver: zodResolver(formSchema),
  });

  const handleFileParse = (file: File) => {
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const wb = XLSX.read(event.target?.result, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        const match = wsname.match(/Laporan Bulan (\w+) (\d{4})/i);
        if (!match) {
            toast({
                title: 'Format Nama Sheet Salah',
                description: 'Nama sheet harus dalam format "Laporan Bulan [NamaBulan] [Tahun]", contoh: "Laporan Bulan Juli 2024".',
                variant: 'destructive',
            });
            setIsLoading(false);
            return;
        }
        const monthName = match[1].toLowerCase();
        const year = parseInt(match[2], 10);
        const month = monthMap[monthName];

        if (!month) {
            toast({ title: 'Nama Bulan Tidak Valid', variant: 'destructive' });
            setIsLoading(false);
            return;
        }

        const jsonData: any[] = XLSX.utils.sheet_to_json(ws);
        const records: ParsedRow[] = [];

        jsonData.forEach(row => {
          const nik = row['NIK'];
          const name = row['Nama Pegawai'];

          if (!nik || !name) return;

          for (let day = 1; day <= 31; day++) {
            const statusKey = String(day);
            const rawStatus = row[statusKey];

            if (rawStatus) {
                const mappedStatus = statusMap[String(rawStatus).trim()];
                if (mappedStatus) {
                    try {
                        const date = new Date(year, month - 1, day);
                        if (date.getMonth() + 1 === month) {
                             records.push({
                                employeeNik: String(nik),
                                employeeName: String(name),
                                date: date.toISOString().split('T')[0],
                                status: mappedStatus,
                            });
                        }
                    } catch(e) {
                        // ignore invalid dates
                    }
                }
            }
          }
        });
        
        setParsedData(records);

      } catch (error) {
        console.error("Error parsing file:", error);
        toast({
          title: 'Gagal Membaca File',
          description: 'Terjadi kesalahan saat memproses file Excel Anda.',
          variant: 'destructive',
        });
        setParsedData([]);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };
  
  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setIsSubmitting(true);
    
    try {
      const employeesCollectionRef = collection(firestore, 'employees');
      const batch = writeBatch(firestore);
      let recordsAdded = 0;

      const niksToQuery = [...new Set(parsedData.map(d => d.employeeNik))];
      const nikToIdMap = new Map<string, string>();
      
      // Firestore 'in' query supports up to 30 elements, so we chunk the NIKs
      for (let i = 0; i < niksToQuery.length; i += 30) {
        const chunk = niksToQuery.slice(i, i + 30);
        const q = query(employeesCollectionRef, where('nik', 'in', chunk));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(docSnap => {
          const employee = docSnap.data() as Employee;
          nikToIdMap.set(employee.nik, docSnap.id);
        });
      }

      parsedData.forEach(record => {
        const employeeId = nikToIdMap.get(record.employeeNik);
        if (employeeId) {
            const finalRecord: Omit<Attendance, 'id'> = { 
                employeeId,
                employeeName: record.employeeName,
                employeeNik: record.employeeNik,
                date: record.date,
                status: record.status,
                importedAt: serverTimestamp() as any,
            };
            const docRef = doc(collection(firestore, 'attendances'));
            batch.set(docRef, finalRecord);
            recordsAdded++;
        }
      });
      
      if (recordsAdded > 0) {
        await batch.commit();
      }

      toast({
        title: 'Impor Selesai!',
        description: `${recordsAdded} data absensi berhasil diimpor. ${parsedData.length - recordsAdded} data diabaikan karena NIK tidak ditemukan.`,
      });
      setModalOpen(false);

    } catch (error) {
      console.error("Error importing attendance: ", error);
      toast({
        title: 'Impor Gagal',
        description: 'Terjadi kesalahan saat menyimpan data. Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>Impor Data Absensi Bulanan</DialogTitle>
        <DialogDescription>
          Unggah file laporan Excel bulanan. Sistem akan secara otomatis membaca dan memproses data untuk rekapitulasi.
        </DialogDescription>
      </DialogHeader>

      {parsedData.length === 0 ? (
        <Form {...form}>
          <form className="space-y-4 py-4" id="import-form">
            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pilih File Excel (.xlsx, .xls)</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={(e) => {
                        field.onChange(e.target.files); // Update RHF state
                        if (e.target.files && e.target.files[0]) {
                          handleFileParse(e.target.files[0]); // Immediately parse the file
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      ) : (
        <div className="space-y-4">
            <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300">
                <AlertCircle className="h-4 w-4 !text-blue-800 dark:!text-blue-300" />
                <AlertDescription>
                    {parsedData.length} data absensi valid ditemukan dan siap untuk diimpor. Data dengan NIK yang tidak terdaftar akan diabaikan.
                </AlertDescription>
            </Alert>
            <ScrollArea className="h-64 w-full border rounded-md">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>NIK</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {parsedData.slice(0, 100).map((row, index) => (
                            <TableRow key={index}>
                                <TableCell>{row.employeeNik}</TableCell>
                                <TableCell>{row.employeeName}</TableCell>
                                <TableCell>{row.date}</TableCell>
                                <TableCell>{row.status}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                 {parsedData.length > 100 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        Menampilkan 100 dari {parsedData.length} baris...
                    </div>
                )}
            </ScrollArea>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          <p>Membaca dan memproses file...</p>
        </div>
      )}
      
      <DialogFooter>
        <Button variant="outline" onClick={() => setModalOpen(false)} disabled={isSubmitting}>
          Batal
        </Button>
        {parsedData.length > 0 && (
          <Button onClick={() => { setParsedData([]); form.reset(); }} variant="secondary" disabled={isSubmitting}>
            Pilih File Lain
          </Button>
        )}
        <Button onClick={handleImport} disabled={parsedData.length === 0 || isLoading || isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Impor {parsedData.length > 0 ? `${parsedData.length} Data` : ''}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
