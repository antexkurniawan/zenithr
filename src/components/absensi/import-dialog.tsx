
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Upload, FileCheck2, AlertCircle, Download } from 'lucide-react';
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
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
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
  checkIn?: string;
};

interface ImportDialogProps {
  setModalOpen: (open: boolean) => void;
}

const statusMap: { [key: string]: AttendanceStatus | null } = {
  'M': 'Hadir',
  'MASUK': 'Hadir',
  '24J': 'Hadir',
  'LKJ': 'Hadir',
  'S': 'Sakit',
  'SAKIT': 'Sakit',
  'I': 'Izin',
  'IZIN': 'Izin',
  'A': 'Alpha',
  'ALPHA': 'Alpha',
  'C': 'Cuti',
  'CUTI': 'Cuti',
  'O': 'Off',
  'OFF': 'Off',
  'OS': 'Off', // OFF Standby
  'LN': 'Off', // Libur Nasional
  'LIBUR': 'Off',
};

// Helper to convert Excel serial date to JS Date
const excelDateToJSDate = (serial: number) => {
    const utc_days  = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
};


export function ImportAbsensiDialog({ setModalOpen }: ImportDialogProps) {
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  

  const form = useForm<ImportFormValues>({
    resolver: zodResolver(formSchema),
  });

  const handleFileParse = (file: File) => {
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const wb = XLSX.read(event.target?.result, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        // Convert sheet to JSON, starting from row 6 (header at row 6)
        const jsonData: any[] = XLSX.utils.sheet_to_json(ws, { range: 5, header: 'A' });
        const records: ParsedRow[] = [];

        jsonData.forEach((row, index) => {
          // Assuming column order: NO, NIK, NAMA, KETERANGAN, TANGGAL, JAM
          const nik = row['B'];
          const name = row['C'];
          const keterangan = row['D'];
          const tanggal = row['E'];
          const jam = row['F'];

          if (!nik || !name || !keterangan || !tanggal) {
              return; // Skip rows that don't have essential data
          }
          
          const mappedStatus = statusMap[String(keterangan).trim().toUpperCase()];

          if (mappedStatus) {
            let recordDate: Date;
            if (typeof tanggal === 'number') { // Excel serial date
                recordDate = excelDateToJSDate(tanggal);
            } else if (tanggal instanceof Date) {
                recordDate = tanggal;
            } else {
                 try {
                    recordDate = new Date(tanggal);
                 } catch(e) {
                     console.warn(`Invalid date format for row ${index + 7}:`, tanggal);
                     return;
                 }
            }
             if (isNaN(recordDate.getTime())) {
                console.warn(`Could not parse date for row ${index + 7}:`, tanggal);
                return;
            }

            const checkInDateTime = jam ? `${recordDate.toISOString().split('T')[0]}T${jam}` : undefined;

            records.push({
                employeeNik: String(nik).trim(),
                employeeName: String(name).trim(),
                date: recordDate.toISOString().split('T')[0],
                status: mappedStatus,
                checkIn: checkInDateTime,
            });
          }
        });
        
        setParsedData(records);

      } catch (error) {
        console.error("Error parsing file:", error);
        toast.error('Gagal Membaca File', {
          description: 'Terjadi kesalahan saat memproses file Excel Anda. Pastikan formatnya benar.',
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
                checkIn: record.checkIn,
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

      toast.success('Impor Selesai!', {
        description: `${recordsAdded} data absensi berhasil diimpor. ${parsedData.length - recordsAdded} data diabaikan karena NIK tidak ditemukan.`,
      });
      setModalOpen(false);

    } catch (error) {
      console.error("Error importing attendance: ", error);
      toast.error('Impor Gagal', {
        description: 'Terjadi kesalahan saat menyimpan data. Silakan coba lagi.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const data = [
        { NO: 1, NIK: '12345', NAMA: 'JEMBRI J. SYAMSI', KETERANGAN: '24J', TANGGAL: '2024-07-01', JAM: '08:00' },
        { NO: 2, NIK: '12345', NAMA: 'JEMBRI J. SYAMSI', KETERANGAN: 'O', TANGGAL: '2024-07-02', JAM: '' },
        { NO: 3, NIK: '67890', NAMA: 'ISKANDAR DUNGGIO', KETERANGAN: 'LKJ', TANGGAL: '2024-07-01', JAM: '09:00' },
        { NO: 4, NIK: '67890', NAMA: 'ISKANDAR DUNGGIO', KETERANGAN: 'OS', TANGGAL: '2024-07-02', JAM: '' },
    ];
    const ws = XLSX.utils.json_to_sheet(data);

    // Add title and headers manually
    XLSX.utils.sheet_add_aoa(ws, [['LAPORAN KEHADIRAN KARYAWAN']], { origin: 'A1' });
    XLSX.utils.sheet_add_aoa(ws, [['PERIODE: JULI 2024']], { origin: 'A2' });
    XLSX.utils.sheet_add_aoa(ws, [[' ']], { origin: 'A3' }); // Spacer
    XLSX.utils.sheet_add_aoa(ws, [[' ']], { origin: 'A4' }); // Spacer
    XLSX.utils.sheet_add_aoa(ws, [['NO', 'NIK', 'NAMA', 'KETERANGAN', 'TANGGAL', 'JAM']], { origin: 'A6' });
    
    // Replace the auto-generated header
    ws['!rows'] = [{ hpt: 15 }, { hpt: 15 }, { hpt: 15 }, { hpt: 15 }, { hpt: 15 }, { hpt: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Kerja');
    XLSX.writeFile(wb, 'Template_Jadwal_Kerja.xlsx');
};

  return (
    <DialogContent className="sm:max-w-4xl max-h-[90dvh] flex flex-col">
      <DialogHeader className="flex-row items-center justify-between">
          <div className="space-y-1">
            <DialogTitle>Impor Data Absensi</DialogTitle>
            <DialogDescription>
              Unggah file laporan Excel absensi/jadwal kerja. Sistem akan membaca setiap baris sebagai data kehadiran.
            </DialogDescription>
          </div>
           <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Unduh Template
          </Button>
      </DialogHeader>

      <div className="flex-grow overflow-y-auto -mx-6 px-6">
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
              <div className="border rounded-md">
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
              </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            <p>Membaca dan memproses file...</p>
          </div>
        )}
      </div>
      
      <DialogFooter className='pt-4 border-t -mx-6 px-6 pb-0'>
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
