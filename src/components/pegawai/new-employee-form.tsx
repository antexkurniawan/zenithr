
'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format, parse } from 'date-fns';
import { collection, serverTimestamp, doc } from 'firebase/firestore';

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
import { toast } from 'sonner';
import { useFirestore, addDocumentNonBlocking, useUser, useDoc, useMemoFirebase } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';

const formSchema = z.object({
  name: z.string().min(2, 'Nama lengkap minimal 2 karakter.'),
  nik: z.string().min(5, 'NIK minimal 5 karakter.'),
  jobTitle: z.enum(['Driver', 'Dispatcher', 'Checker', 'Field Coordinator'], {
    required_error: 'Jabatan harus dipilih.',
  }),
  areaTugas: z.string().min(1, 'Area tugas harus diisi.'),
  contractStartDate: z.date({ required_error: 'Tanggal awal kontrak harus diisi.' }),
  contractEndDate: z.date({ required_error: 'Tanggal akhir kontrak harus diisi.' }),
});

type NewEmployeeFormValues = z.infer<typeof formSchema>;

interface NewEmployeeFormProps {
  setModalOpen: (open: boolean) => void;
}

export function NewEmployeeForm({ setModalOpen }: NewEmployeeFormProps) {
  
  const firestore = useFirestore();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const form = useForm<NewEmployeeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      nik: '',
      areaTugas: userProfile?.workArea || '',
    },
  });

  useEffect(() => {
    if (userProfile?.workArea && userProfile.workArea !== 'Not Set') {
      form.setValue('areaTugas', userProfile.workArea);
    }
  }, [userProfile, form]);

  async function onSubmit(data: NewEmployeeFormValues) {
    setIsSubmitting(true);
    try {
      const employeesCollectionRef = collection(firestore, 'employees');
      
      const newEmployeeData = {
        ...data,
        contractStartDate: data.contractStartDate.toISOString(),
        contractEndDate: data.contractEndDate.toISOString(),
        status: 'Kontrak', // Default status for new employee with contract
        createdAt: serverTimestamp(),
      };

      await addDocumentNonBlocking(employeesCollectionRef, newEmployeeData);

      toast.success('Pegawai Berhasil Ditambahkan!', {
        description: `${data.name} telah ditambahkan ke database.`,
      });
      setModalOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error adding employee:', error);
      toast.error('Terjadi Kesalahan', {
        description: 'Gagal menambahkan pegawai. Silakan coba lagi.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-hidden">
        <div className="flex-grow overflow-auto pr-6 -mr-6">
          <div className="space-y-4">
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
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 mt-auto">
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
            Simpan
          </Button>
        </div>
      </form>
    </Form>
  );
}
