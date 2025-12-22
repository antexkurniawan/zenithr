
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Upload, FileCheck2, AlertCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { collection, writeBatch, serverTimestamp, getDocs, query, where, doc } from 'firebase/firestore';
import { format, isValid, parse, getYear, getMonth, setDate } from 'date-fns';
import { id } from 'date-fns/locale';

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

// Helper to get the year and month from the sheet name, e.g., "Juli 2024"
const parseSheetName = (sheetName: string): { year: number, month: number } | null => {
    const months: { [key: string]: number } = {
        'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
        'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
    };
    const parts = sheetName.trim().toLowerCase().split(' ');
    if (parts.length === 2) {
        const month = months[parts[0]];
        const year = parseInt(parts[1], 10);
        if (month !== undefined && !isNaN(year)) {
            return { year, month };
        }
    }
    return null;
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

        const dateInfo = parseSheetName(wsname);
        if (!dateInfo) {
            toast.error("Format Nama Sheet Salah", {
                description: "Nama sheet harus dalam format 'Bulan Tahun', contoh: 'Juli 2024'."
            });
            setIsLoading(false);
            return;
        }

        const { year, month } = dateInfo;

        const jsonData: any[] = XLSX.utils.sheet_to_json(ws);
        const records: ParsedRow[] = [];

        jsonData.forEach((row, index) => {
          const nik = row['NIK'];
          const name = row['Nama'];

          if (!nik || !name) {
              return; // Skip rows without NIK or Name
          }
          
          Object.keys(row).forEach(key => {
              const day = parseInt(key, 10);
              if (!isNaN(day) && day >= 1 && day <= 31) {
                  const statusValue = row[key];
                  const mappedStatus = statusMap[String(statusValue).trim().toUpperCase()];

                  if (mappedStatus) {
                      const recordDate = new Date(year, month, day);
                      if (isValid(recordDate) && getMonth(recordDate) === month) {
                         records.push({
                            employeeNik: String(nik).trim(),
                            employeeName: String(name).trim(),
                            date: format(recordDate, 'yyyy-MM-dd'),
                            status: mappedStatus,
                        });
                      }
                  }
              }
          })
        });
        
        setParsedData(records);

      } catch (error) {
        console.error("Error parsing file:", error);
        toast.error('Gagal Membaca File', {
          description: 'Terjadi kesalahan saat memproses file Excel Anda. Pastikan format dan nama sheet benar.',
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
    const currentMonthName = format(new Date(), 'MMMM yyyy', { locale: id });
    
    // Create header row with NIK, Nama, and days 1 to 31
    const header: {[key: string]: any} = { 'NIK': '', 'Nama': '' };
    for (let i = 1; i <= 31; i++) {
        header[i] = '';
    }

    const sampleRow1 = { ...header, 'NIK': '12345', 'Nama': 'JEMBRI J. SYAMSI' };
    sampleRow1[1] = 'M'; sampleRow1[2] = 'M'; sampleRow1[3] = 'O'; sampleRow1[4] = 'S';
    
    const sampleRow2 = { ...header, 'NIK': '67890', 'Nama': 'ISKANDAR DUNGGIO' };
    sampleRow2[1] = 'O'; sampleRow2[2] = 'O'; sampleRow2[3] = 'M'; sampleRow2[4] = 'M';

    const data = [sampleRow1, sampleRow2];
    
    const ws = XLSX.utils.json_to_sheet(data, {
        header: ['NIK', 'Nama', ...Array.from({length: 31}, (_, i) => i + 1)]
    });

    const wb = XLSX.utils.book_new();
    // Use a dynamic sheet name like "Juli 2024"
    XLSX.utils.book_append_sheet(wb, ws, currentMonthName);
    XLSX.writeFile(wb, `Template_Jadwal_Kerja_${currentMonthName}.xlsx`);
};

  return (
    <DialogContent className="sm:max-w-4xl max-h-[90dvh] flex flex-col">
      <DialogHeader className="flex-row items-center justify-between">
          <div className="space-y-1">
            <DialogTitle>Impor Data Jadwal Kerja</DialogTitle>
            <DialogDescription>
              Unggah file jadwal kerja bulanan. Nama sheet harus sesuai format "Bulan Tahun", cth: "Juli 2024".
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
                      {parsedData.length} data absensi valid ditemukan dan siap untuk diimpor. Data dengan NIK yang tidak terdaftar di database akan diabaikan.
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
