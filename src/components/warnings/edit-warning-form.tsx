
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Calendar as CalendarIcon, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { format, parse } from "date-fns";
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';

import type { Employee, Warning } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  employeeId: z.string({ required_error: "Pegawai harus dipilih." }),
  nomorSurat: z.string().min(1, "Nomor surat harus diisi."),
  type: z.enum(["Teguran", "SP1", "SP2", "SP3"], { required_error: "Jenis surat harus dipilih."}),
  issueDate: z.date({ required_error: "Tanggal terbit harus diisi." }),
  expiryDate: z.date({ required_error: "Tanggal kedaluwarsa harus diisi." }),
  description: z.string().min(10, "Deskripsi pelanggaran minimal 10 karakter."),
  peraturanDilanggar: z.string().min(5, "Peraturan yang dilanggar harus diisi."),
});

type EditWarningFormValues = z.infer<typeof formSchema>;

interface EditWarningFormProps {
  warning: Warning;
  employees: Employee[];
  setModalOpen: (open: boolean) => void;
}

export function EditWarningForm({ warning, employees, setModalOpen }: EditWarningFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComboboxOpen, setComboboxOpen] = useState(false);
  
  const form = useForm<EditWarningFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        employeeId: warning.employeeId,
        nomorSurat: warning.nomorSurat,
        type: warning.type,
        issueDate: new Date(warning.issueDate),
        expiryDate: new Date(warning.expiryDate),
        description: warning.description,
        peraturanDilanggar: warning.peraturanDilanggar,
    },
  });

  async function onSubmit(data: EditWarningFormValues) {
    const selectedEmployee = employees.find(e => e.id === data.employeeId);
    if (!selectedEmployee) {
      toast({
        title: "Pegawai tidak valid",
        description: "Silakan pilih pegawai yang valid.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
        const batch = writeBatch(firestore);
        const mainWarningRef = doc(firestore, 'warnings', warning.id);
        const employeeWarningRef = doc(firestore, `employees/${warning.employeeId}/warningLetters`, warning.id);

        const updatedWarningData = {
            ...data,
            employeeName: selectedEmployee.name,
            employeeNik: selectedEmployee.nik,
            employeeJobTitle: selectedEmployee.jobTitle,
            employeeAreaTugas: selectedEmployee.areaTugas || '',
            issueDate: data.issueDate.toISOString(),
            expiryDate: data.expiryDate.toISOString(),
            updatedAt: serverTimestamp(),
        };
        
        batch.update(mainWarningRef, updatedWarningData);
        batch.update(employeeWarningRef, updatedWarningData);
        
        await batch.commit();

        toast({
            title: "Surat Peringatan Berhasil Diperbarui!",
            description: `Perubahan pada surat untuk ${selectedEmployee.name} telah disimpan.`,
        });
        setModalOpen(false);

    } catch (error) {
        console.error("Error updating warning letter:", error);
        toast({
            title: "Terjadi Kesalahan",
            description: "Gagal memperbarui surat peringatan. Silakan coba lagi.",
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-hidden">
        <div className="flex-grow overflow-y-auto pr-6 -mr-6 pl-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem className="flex flex-col sm:col-span-2">
                  <FormLabel>Nama Pegawai</FormLabel>
                   <Popover open={isComboboxOpen} onOpenChange={setComboboxOpen} modal={false}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isComboboxOpen}
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value
                          ? employees.find((employee) => employee.id === field.value)?.name
                          : "Pilih pegawai"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                      <Command>
                        <CommandInput placeholder="Cari nama atau NIK pegawai..." />
                        <CommandList>
                          <CommandEmpty>Pegawai tidak ditemukan.</CommandEmpty>
                          <CommandGroup>
                            {employees.map((employee) => (
                              <CommandItem
                                value={employee.name}
                                key={employee.id}
                                onSelect={() => {
                                  form.setValue("employeeId", employee.id);
                                  form.trigger("employeeId");
                                  setComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    employee.id === field.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {employee.name} ({employee.nik})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="nomorSurat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor Surat</FormLabel>
                  <FormControl>
                    <Input placeholder="cth. 015/ST-SPP/XI/2025" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Jenis Surat</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                          <SelectValue placeholder="Pilih jenis SP" />
                      </SelectTrigger>
                    </FormControl>
                      <SelectContent>
                      <SelectItem value="Teguran">Teguran</SelectItem>
                      <SelectItem value="SP1">SP1</SelectItem>
                      <SelectItem value="SP2">SP2</SelectItem>
                      <SelectItem value="SP3">SP3</SelectItem>
                      </SelectContent>
                  </Select>
                  <FormMessage />
                  </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="issueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Tanggal Terbit</FormLabel>
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
                    <PopoverContent className="w-auto p-0" align="start">
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
              name="expiryDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Tanggal Kedaluwarsa</FormLabel>
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
                    <PopoverContent className="w-auto p-0" align="start">
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
              name="peraturanDilanggar"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Peraturan yang Dilanggar</FormLabel>
                  <FormControl>
                    <Input placeholder="cth. Peraturan Perusahaan Pasal 23..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                <FormItem className="sm:col-span-2">
                    <FormLabel>Deskripsi Pelanggaran</FormLabel>
                    <FormControl>
                    <Textarea
                        placeholder="Jelaskan secara rinci pelanggaran yang terjadi..."
                        rows={4}
                        {...field}
                    />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 mt-auto sm:col-span-2 px-6 pb-6 -mx-6 border-t bg-background">
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
  )
}
