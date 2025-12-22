
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format, differenceInDays, differenceInYears } from 'date-fns';
import { collection, doc, serverTimestamp, addDoc } from 'firebase/firestore';

import type { Employee, UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "../ui/input";
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { toast } from 'sonner';
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { ScrollArea } from '../ui/scroll-area';
import { DateRangePicker } from '../ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';


const formSchema = z.object({
    employeeId: z.string({ required_error: "Pegawai harus dipilih." }),
    requestType: z.enum(["Cuti", "Izin", "Tugas Kantor"], { required_error: "Jenis permohonan harus dipilih." }),
    leaveType: z.enum(["Tahunan", "Besar", "Hamil/Keguguran"]).optional(),
    permitType: z.enum(["Haid", "Lainnya", "Terlambat Masuk Kantor", "Meninggalkan Kantor"]).optional(),
    dutyType: z.enum(["Sidak", "Training", "Tugas Lapangan", "Kunjungan Customer"]).optional(),
    dateRange: z.custom<DateRange>(val => val && (val as DateRange).from, {
        message: "Tanggal mulai harus diisi.",
    }),
    explanation: z.string().optional(),
    contactAddress: z.string().optional(),
    contactPhone: z.string().optional(),
    deductLeave: z.boolean().optional(),
}).refine(data => {
    if (data.requestType === "Cuti") return !!data.leaveType;
    if (data.requestType === "Izin") return !!data.permitType;
    if (data.requestType === "Tugas Kantor") return !!data.dutyType;
    return false;
}, {
    message: "Sub-jenis permohonan harus dipilih.",
    path: ["leaveType"], // a bit of a hack, but shows error in a reasonable place
});

type NewRequestFormValues = z.infer<typeof formSchema>;

interface NewLeaveRequestFormProps {
  employees: Employee[];
  setModalOpen: (open: boolean) => void;
}

export function NewLeaveRequestForm({ employees, setModalOpen }: NewLeaveRequestFormProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEligibleForLeave, setIsEligibleForLeave] = useState<boolean | null>(null);

  const form = useForm<NewRequestFormValues>({
    resolver: zodResolver(formSchema),
  });
  
  const requestType = form.watch("requestType");
  const selectedEmployeeId = form.watch("employeeId");

  useEffect(() => {
    if (selectedEmployeeId && requestType === 'Cuti') {
      const employee = employees.find(e => e.id === selectedEmployeeId);
      if (employee && employee.joinDate) {
        const tenure = differenceInYears(new Date(), new Date(employee.joinDate));
        setIsEligibleForLeave(tenure >= 1);
        if (tenure < 1) {
            form.setValue('requestType', undefined); // Reset selection if not eligible
        }
      } else {
        setIsEligibleForLeave(false); // Not eligible if no join date
      }
    } else {
      setIsEligibleForLeave(true); // Always eligible for non-leave requests
    }
  }, [selectedEmployeeId, employees, requestType, form]);


  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.nik.includes(searchQuery)
  );

  async function onSubmit(data: NewRequestFormValues) {
    if (!user || !userProfile) {
        toast.error("User tidak valid");
        return;
    }
    const selectedEmployee = employees.find(e => e.id === data.employeeId);
    if (!selectedEmployee) {
      toast.error("Pegawai tidak valid");
      return;
    }

    setIsSubmitting(true);
    try {
        const requestsCollectionRef = collection(firestore, 'leave_requests');
        
        const startDate = data.dateRange.from as Date;
        const endDate = data.dateRange.to || startDate;
        
        let duration = 0;
        if(startDate && endDate) {
            duration = differenceInDays(endDate, startDate) + 1;
        }

        const newRequestData: any = {
            employeeId: selectedEmployee.id,
            employeeName: selectedEmployee.name,
            employeeJobTitle: selectedEmployee.jobTitle,
            requestType: data.requestType,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            status: "Pending",
            requesterId: user.uid,
            requesterName: userProfile.name,
            createdAt: serverTimestamp(),
        };

        if (data.leaveType) newRequestData.leaveType = data.leaveType;
        if (data.permitType) newRequestData.permitType = data.permitType;
        if (data.dutyType) newRequestData.dutyType = data.dutyType;
        if (duration > 0) newRequestData.duration = duration;
        if (data.explanation) newRequestData.explanation = data.explanation;
        if (data.contactAddress) newRequestData.contactAddress = data.contactAddress;
        if (data.contactPhone) newRequestData.contactPhone = data.contactPhone;
        if (data.deductLeave) newRequestData.deductLeave = data.deductLeave;

        await addDoc(requestsCollectionRef, newRequestData);

        toast.success("Permohonan Berhasil Diajukan!", {
            description: `Permohonan ${data.requestType} untuk ${selectedEmployee.name} telah disimpan.`,
        });
        setModalOpen(false);

    } catch (error) {
        console.error("Error creating leave request:", error);
        toast.error("Gagal Mengajukan Permohonan");
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-hidden">
        <ScrollArea className="flex-grow p-6 -mx-6">
            <div className="px-6 space-y-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Nama Pegawai</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Pilih pegawai..." />
                              </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              <div className="p-2">
                                  <Input
                                      placeholder="Cari nama atau NIK..."
                                      value={searchQuery}
                                      onChange={(e) => setSearchQuery(e.target.value)}
                                      className="w-full"
                                  />
                              </div>
                              <ScrollArea className="h-[150px]">
                                {filteredEmployees.map((employee) => (
                                    <SelectItem key={employee.id} value={employee.id}>
                                        {employee.name} ({employee.nik})
                                    </SelectItem>
                                ))}
                              </ScrollArea>
                          </SelectContent>
                      </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requestType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Jenis Permohonan</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="Cuti" disabled={!isEligibleForLeave} /></FormControl>
                          <FormLabel className={`font-normal ${!isEligibleForLeave ? 'text-muted-foreground cursor-not-allowed' : ''}`}>Cuti</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="Izin" /></FormControl>
                          <FormLabel className="font-normal">Izin</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="Tugas Kantor" /></FormControl>
                          <FormLabel className="font-normal">Tugas Kantor</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                    {isEligibleForLeave === false && (
                        <Alert variant="destructive" className="text-xs">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Tidak Berhak Cuti Tahunan</AlertTitle>
                            <AlertDescription>
                                Pegawai ini belum memiliki masa kerja 1 tahun.
                            </AlertDescription>
                        </Alert>
                    )}
                  </FormItem>
                )}
              />
            
              {requestType === "Cuti" && (
                <FormField
                  control={form.control}
                  name="leaveType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Cuti</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Pilih jenis cuti..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Tahunan" disabled={!isEligibleForLeave}>Tahunan</SelectItem>
                          <SelectItem value="Besar">Besar</SelectItem>
                          <SelectItem value="Hamil/Keguguran">Hamil / Keguguran</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {requestType === "Izin" && (
                <FormField
                  control={form.control}
                  name="permitType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Izin</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Pilih jenis izin..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Haid">Haid</SelectItem>
                          <SelectItem value="Lainnya">Lainnya</SelectItem>
                          <SelectItem value="Terlambat Masuk Kantor">Terlambat Masuk Kantor</SelectItem>
                          <SelectItem value="Meninggalkan Kantor">Meninggalkan Kantor</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {requestType === "Tugas Kantor" && (
                <FormField
                  control={form.control}
                  name="dutyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Tugas Kantor</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Pilih jenis tugas..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Sidak">Sidak</SelectItem>
                          <SelectItem value="Training">Training</SelectItem>
                          <SelectItem value="Tugas Lapangan">Tugas Lapangan</SelectItem>
                          <SelectItem value="Kunjungan Customer">Kunjungan Customer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            
              <FormField
                control={form.control}
                name="dateRange"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Tanggal</FormLabel>
                    <DateRangePicker date={field.value} onDateChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="explanation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Penjelasan</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Berikan penjelasan singkat untuk izin atau tugas Anda..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {requestType === "Cuti" && (
                  <>
                  <FormField
                    control={form.control}
                    name="contactAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alamat Selama Cuti</FormLabel>
                        <FormControl>
                          <Input placeholder="Alamat yang bisa dihubungi" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telepon Selama Cuti</FormLabel>
                        <FormControl>
                          <Input placeholder="Nomor telepon aktif" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {requestType === "Izin" && (
                 <FormField
                    control={form.control}
                    name="deductLeave"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Potong Cuti Tahunan</FormLabel>
                                <FormDescription>
                                    Aktifkan jika izin ini akan memotong sisa cuti tahunan.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
              )}
            </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 p-6 pt-4 mt-auto border-t -mx-6 bg-background">
          <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={isSubmitting}>Batal</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ajukan
          </Button>
        </div>
      </form>
    </Form>
  );
}
