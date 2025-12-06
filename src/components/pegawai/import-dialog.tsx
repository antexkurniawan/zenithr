'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Upload, FileCheck2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { collection, writeBatch, serverTimestamp, doc, getDocs, query, where } from 'firebase/firestore';

import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
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
import { ScrollArea } from '../ui/scroll-area';
import { Employee, UserProfile } from '@/lib/types';

const formSchema = z.object({
  file: z
    .custom<FileList>()
    .refine((files) => files?.length === 1, 'File is required.')
    .refine(
      (files) =>
        ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(files?.[0]?.type),
      'Hanya file .xlsx yang didukung.'
    ),
});

type ImportFormValues = z.infer<typeof formSchema>;
type EmployeeImportData = {
  nik: string;
  name: string;
  jobTitle: 'Driver' | 'Dispatcher' | 'Checker' | 'Field Coordinator';
  areaTugas: string;
  contractStartDate: string;
  contractEndDate: string;
  [key: string]: any;
};

interface ImportDialogProps {
  setModalOpen: (open: boolean) => void;
}

export function ImportDialog({ setModalOpen }: ImportDialogProps) {
  const [data, setData] = useState<EmployeeImportData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const form = useForm<ImportFormValues>({
    resolver: zodResolver(formSchema),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const wb = XLSX.read(event.target?.result, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData: EmployeeImportData[] = XLSX.utils.sheet_to_json(ws);
        
        const defaultWorkArea = userProfile?.workArea && userProfile.workArea !== 'Not Set' ? userProfile.workArea : '';
        
        const normalizedData = jsonData.map(row => ({
          ...row,
          areaTugas: row.areaTugas || defaultWorkArea,
          contractStartDate: row.contractStartDate instanceof Date ? row.contractStartDate.toISOString().split('T')[0] : String(row.contractStartDate),
          contractEndDate: row.contractEndDate instanceof Date ? row.contractEndDate.toISOString().split('T')[0] : String(row.contractEndDate),
        }));

        setData(normalizedData);
      } catch (error) {
        console.error("Error parsing file:", error);
        toast.error('Gagal Membaca File', {
          description: 'Pastikan format file benar sesuai template.',
        });
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
    if (data.length === 0) return;
    setIsSubmitting(true);
    
    try {
      const employeesCollectionRef = collection(firestore, 'employees');
      const batch = writeBatch(firestore);
      let newEntriesCount = 0;
      let updatedEntriesCount = 0;

      // Create a map of NIK to employee data from the Excel file
      const importDataMap = new Map(data.map(item => [item.nik, item]));
      const niksToQuery = Array.from(importDataMap.keys());

      // Find existing employees with matching NIKs in chunks to avoid query limits
      const existingEmployeesMap = new Map<string, { id: string; data: Employee }>();
      for (let i = 0; i < niksToQuery.length; i += 30) {
          const chunk = niksToQuery.slice(i, i + 30);
          const q = query(employeesCollectionRef, where('nik', 'in', chunk));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach(docSnap => {
              const employee = docSnap.data() as Employee;
              existingEmployeesMap.set(employee.nik, { id: docSnap.id, data: employee });
          });
      }

      for (const [nik, importData] of importDataMap.entries()) {
        const existingEmployee = existingEmployeesMap.get(nik);

        if (existingEmployee) {
          // --- UPDATE EXISTING EMPLOYEE ---
          const docRef = doc(firestore, 'employees', existingEmployee.id);
          const updatedData = {
            ...existingEmployee.data, // Keep existing data
            ...importData, // Overwrite with new data from Excel
            updatedAt: serverTimestamp(),
          };
          batch.update(docRef, updatedData);
          updatedEntriesCount++;
        } else {
          // --- CREATE NEW EMPLOYEE ---
          const docRef = doc(employeesCollectionRef);
          const newEmployee: Omit<Employee, 'id'> = {
            ...importData,
            status: 'Kontrak',
            createdAt: serverTimestamp(),
          };
          batch.set(docRef, newEmployee);
          newEntriesCount++;
        }
      }
      
      if (newEntriesCount > 0 || updatedEntriesCount > 0) {
        await batch.commit();
      }

      toast.success('Impor Selesai!', {
        description: `${newEntriesCount} data baru ditambahkan, ${updatedEntriesCount} data diperbarui.`,
      });
      setModalOpen(false);

    } catch (error) {
      console.error("Error importing employees: ", error);
      toast.error('Impor Gagal', {
        description: 'Terjadi kesalahan saat menyimpan data. Silakan coba lagi.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>Impor Data Pegawai</DialogTitle>
        <DialogDescription>
          Unggah file Excel (.xlsx). Data dengan NIK yang sudah ada akan diperbarui, data baru akan ditambahkan.
        </DialogDescription>
      </DialogHeader>

      {data.length === 0 ? (
        <Form {...form}>
          <form className="space-y-4 py-4" id="import-form">
            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pilih File Excel</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept=".xlsx"
                      onChange={(e) => {
                        field.onChange(e.target.files);
                        handleFileChange(e);
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
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-700 dark:text-green-300">
                <FileCheck2 className="h-5 w-5" />
                <p className='text-sm font-medium'>
                    {data.length} data siap untuk diimpor. Silakan periksa preview di bawah ini.
                </p>
            </div>
            <ScrollArea className="h-64 w-full border rounded-md">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>NIK</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead>Jabatan</TableHead>
                            <TableHead>Area Tugas</TableHead>
                            <TableHead>Awal Kontrak</TableHead>
                            <TableHead>Akhir Kontrak</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((row, index) => (
                            <TableRow key={index}>
                                <TableCell>{row.nik}</TableCell>
                                <TableCell>{row.name}</TableCell>
                                <TableCell>{row.jobTitle}</TableCell>
                                <TableCell>{row.areaTugas}</TableCell>
                                <TableCell>{row.contractStartDate}</TableCell>
                                <TableCell>{row.contractEndDate}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          <p>Membaca file...</p>
        </div>
      )}
      
      <DialogFooter>
        <Button variant="outline" onClick={() => setModalOpen(false)} disabled={isSubmitting}>
          Batal
        </Button>
        {data.length > 0 && (
          <Button onClick={() => setData([])} variant="secondary" disabled={isSubmitting}>
            Pilih File Lain
          </Button>
        )}
        <Button onClick={handleImport} disabled={data.length === 0 || isLoading || isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Impor {data.length > 0 ? `${data.length} Data` : ''}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
