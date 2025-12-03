
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format, parse } from 'date-fns';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import type { Employee } from '@/lib/types';
import { DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

const formSchema = z.object({
  name: z.string().min(2, 'Nama lengkap minimal 2 karakter.'),
  nik: z.string().min(5, 'NIK minimal 5 karakter.'),
  jobTitle: z.enum(['Driver', 'Dispatcher', 'Checker', 'Field Coordinator'], {
    required_error: 'Jabatan harus dipilih.',
  }),
  areaTugas: z.string().min(1, 'Area tugas harus diisi.'),
  status: z.enum(['Aktif', 'Kontrak', 'Resign'], { required_error: 'Status harus dipilih.' }),
  contractStartDate: z.date({ required_error: 'Tanggal awal kontrak harus diisi.' }),
  contractEndDate: z.date({ required_error: 'Tanggal akhir kontrak harus diisi.' }),
});

type EditEmployeeFormValues = z.infer<typeof formSchema>;

interface EditEmployeeFormProps {
  employee: Employee;
  setModalOpen: (open: boolean) => void;
}

export function EditEmployeeForm({ employee, setModalOpen }: EditEmployeeFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditEmployeeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: employee.name,
      nik: employee.nik,
      jobTitle: employee.jobTitle,
      areaTugas: employee.areaTugas || '',
      status: employee.status,
      contractStartDate: new Date(employee.contractStartDate),
      contractEndDate: new Date(employee.contractEndDate),
    },
  });

  async function onSubmit(data: EditEmployeeFormValues) {
    setIsSubmitting(true);
    try {
      const employeeDocRef = doc(firestore, 'employees', employee.id);
      
      const updatedEmployeeData = {
        ...data,
        contractStartDate: data.contractStartDate.toISOString(),
        contractEndDate: data.contractEndDate.toISOString(),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(employeeDocRef, updatedEmployeeData);

      toast({
        title: 'Pegawai Berhasil Diperbarui!',
        description: `Data ${data.name} telah diperbarui.`,
      });
      setModalOpen(false);
    } catch (error) {
      console.error('Error updating employee:', error);
      toast({
        title: 'Terjadi Kesalahan',
        description: 'Gagal memperbarui data pegawai. Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
    <DialogHeader>
        <DialogTitle>Edit Data Pegawai</DialogTitle>
        <DialogDescription>Perbarui informasi detail untuk pegawai ini.</DialogDescription>
    </DialogHeader>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nik"
            render={({ field }) => (
              <FormItem>
                <FormLabel>NIK</FormLabel>
                <FormControl>
                  <Input placeholder="cth. 123456789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Lengkap</FormLabel>
                <FormControl>
                  <Input placeholder="cth. Budi Susanto" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="jobTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jabatan</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jabatan" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Driver">Driver</SelectItem>
                    <SelectItem value="Dispatcher">Dispatcher</SelectItem>
                    <SelectItem value="Checker">Checker</SelectItem>
                    <SelectItem value="Field Coordinator">Field Coordinator</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="areaTugas"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Area Tugas</FormLabel>
                <FormControl>
                  <Input placeholder="cth. Gorontalo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Aktif">Aktif</SelectItem>
                    <SelectItem value="Kontrak">Kontrak</SelectItem>
                    <SelectItem value="Resign">Resign</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <div></div>
          <FormField
            control={form.control}
            name="contractStartDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Awal Kontrak</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <div className="relative">
                        <Input
                          value={field.value ? format(field.value, 'dd/MM/yyyy') : ''}
                          onChange={(e) => {
                            try {
                              const parsedDate = parse(e.target.value, 'dd/MM/yyyy', new Date());
                              if (!isNaN(parsedDate.getTime())) {
                                field.onChange(parsedDate);
                              }
                            } catch (error) {
                              // Handle parsing error if needed
                            }
                          }}
                          placeholder="dd/mm/yyyy"
                          className="pr-8"
                        />
                        <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                      </div>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100]" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contractEndDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Akhir Kontrak</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <div className="relative">
                        <Input
                          value={field.value ? format(field.value, 'dd/MM/yyyy') : ''}
                          onChange={(e) => {
                            try {
                              const parsedDate = parse(e.target.value, 'dd/MM/yyyy', new Date());
                              if (!isNaN(parsedDate.getTime())) {
                                field.onChange(parsedDate);
                              }
                            } catch (error) {
                              // Handle parsing error if needed
                            }
                          }}
                          placeholder="dd/mm/yyyy"
                          className="pr-8"
                        />
                        <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                      </div>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-[100]" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setModalOpen(false)}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </Form>
    </>
  );
}

    