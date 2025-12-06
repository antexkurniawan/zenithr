
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, Loader2, PlusCircle, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';

import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { Employee, UserProfile } from '@/lib/types';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { StepIndicator } from './step-indicator';
import { toast } from 'sonner';

const formSchema = z.object({
    area: z.string().min(1, 'Area tugas harus diisi.'),
    briefingDate: z.date({ required_error: 'Tanggal dan waktu harus diisi.' }),
    items: z.array(
        z.object({
            topic: z.string().min(1, 'Topik tidak boleh kosong.'),
            content: z.string().min(1, 'Materi tidak boleh kosong.'),
        })
    ).min(1, 'Harus ada setidaknya satu topik dan materi briefing.'),
     participants: z.array(z.string()).min(1, "Anda harus memilih setidaknya satu peserta."),
});

type NewBriefingFormValues = z.infer<typeof formSchema>;

interface NewBriefingFormProps {
  employees: Employee[];
  setModalOpen: (open: boolean) => void;
}

export function NewBriefingForm({ setModalOpen, employees }: NewBriefingFormProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const form = useForm<NewBriefingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      area: userProfile?.workArea || '',
      briefingDate: new Date(),
      items: [{ topic: '', content: '' }],
      participants: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    if (userProfile?.workArea && userProfile.workArea !== 'Not Set') {
      form.setValue('area', userProfile.workArea);
    }
  }, [userProfile, form]);
  
  const handleNext = async () => {
    let fieldsToValidate: (keyof NewBriefingFormValues)[] = [];
    if (step === 1) fieldsToValidate = ['area', 'briefingDate'];
    if (step === 2) fieldsToValidate = ['items'];
    
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  async function onSubmit(data: NewBriefingFormValues) {
    if (!user || !userProfile) {
        toast.error("User tidak ditemukan");
        return;
    }
    setIsSubmitting(true);
    try {
        const batch = writeBatch(firestore);
        
        const briefingDocRef = doc(collection(firestore, 'briefings'));
        const newBriefingData = {
            area: data.area,
            briefingDate: data.briefingDate.toISOString(),
            topics: data.items.map(item => item.topic),
            content: data.items.map(item => item.content),
            items: data.items,
            createdBy: user.uid,
            creatorName: userProfile.name,
            creatorSignatureUrl: userProfile.signatureUrl || null,
            createdAt: serverTimestamp(),
            acknowledgerName: userProfile.operationPointCoordinatorName || null,
            acknowledgerSignatureUrl: userProfile.operationPointCoordinatorSignatureUrl || null,
        };
        batch.set(briefingDocRef, newBriefingData);

        const participantsCollectionRef = collection(briefingDocRef, 'participants');
        data.participants.forEach(employeeId => {
            const employee = employees.find(e => e.id === employeeId);
            if (employee) {
                const participantDocRef = doc(participantsCollectionRef);
                batch.set(participantDocRef, {
                    employeeId: employee.id,
                    employeeName: employee.name,
                    employeeJobTitle: employee.jobTitle,
                    hasSigned: false,
                });
            }
        });

        await batch.commit();

        toast.success('Briefing Berhasil Dibuat!', {
            description: `Materi briefing dan daftar peserta untuk area ${data.area} telah disimpan.`,
        });
        setModalOpen(false);
        form.reset();
    } catch (error) {
      console.error('Error adding briefing:', error);
      toast.error('Terjadi Kesalahan', {
        description: 'Gagal membuat materi briefing. Silakan coba lagi.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b">
            <StepIndicator currentStep={step} />
        </div>
        <div className="flex-grow overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6">
                <FormField
                    control={form.control}
                    name="area"
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
                    name="briefingDate"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Tanggal & Waktu</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={"outline"}
                                className={`w-full justify-start text-left font-normal ${!field.value && "text-muted-foreground"}`}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, 'dd/MM/yyyy HH:mm') : <span>Pilih tanggal dan waktu</span>}
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent 
                            className="w-auto p-0" 
                            align="start"
                            onInteractOutside={(e) => e.preventDefault()}
                        >
                            <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            />
                            <div className="p-2 border-t">
                                <Input type="time"
                                    defaultValue={format(field.value, 'HH:mm')}
                                    onChange={(e) => {
                                        const [hours, minutes] = e.target.value.split(':');
                                        const newDate = new Date(field.value);
                                        newDate.setHours(Number(hours), Number(minutes));
                                        field.onChange(newDate);
                                    }}
                                />
                            </div>
                        </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
          )}
          {step === 2 && (
             <div>
                <FormLabel>Topik & Materi Briefing</FormLabel>
                <FormDescription className="mb-2 text-xs">
                    Masukkan topik dan poin-poin materi yang akan disampaikan.
                </FormDescription>
                <ScrollArea className="h-80 pr-4">
                    <div className="space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="p-3 border rounded-md relative bg-muted/30">
                                <div className='space-y-2'>
                                <FormField
                                    control={form.control}
                                    name={`items.${index}.topic`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input placeholder={`Topik #${index + 1}`} {...field} className="bg-background"/>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`items.${index}.content`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Textarea placeholder={`Materi untuk topik #${index + 1}`} {...field} rows={2} className="bg-background"/>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                </div>
                                {fields.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-1 right-1 h-6 w-6 text-destructive"
                                        onClick={() => remove(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => append({ topic: '', content: '' })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tambah Materi
                </Button>
                <FormField
                    control={form.control}
                    name="items"
                    render={() => (<FormMessage className="mt-2" />)}
                />
            </div>
          )}
          {step === 3 && (
            <FormField
                control={form.control}
                name="participants"
                render={() => (
                    <FormItem>
                    <div className="mb-2">
                        <FormLabel className="text-base">Peserta Briefing</FormLabel>
                        <FormDescription className="text-xs">
                            Pilih karyawan yang menghadiri sesi briefing ini.
                        </FormDescription>
                    </div>
                    <ScrollArea className="h-[24rem] sm:h-96 border rounded-md p-2">
                        {employees.map((employee) => (
                        <FormField
                            key={employee.id}
                            control={form.control}
                            name="participants"
                            render={({ field }) => {
                            return (
                                <FormItem
                                key={employee.id}
                                className="flex flex-row items-start space-x-3 space-y-0 p-2 hover:bg-muted/50 rounded-md"
                                >
                                <FormControl>
                                    <Checkbox
                                    checked={field.value?.includes(employee.id)}
                                    onCheckedChange={(checked) => {
                                        return checked
                                        ? field.onChange([...(field.value || []), employee.id])
                                        : field.onChange(
                                            (field.value || [])?.filter(
                                                (value) => value !== employee.id
                                            )
                                            );
                                    }}
                                    />
                                </FormControl>
                                <FormLabel className="font-normal w-full text-sm">
                                    <div className="flex justify-between items-center">
                                        <span>{employee.name}</span>
                                        <span className="text-xs text-muted-foreground">{employee.jobTitle}</span>
                                    </div>
                                </FormLabel>
                                </FormItem>
                            );
                            }}
                        />
                        ))}
                    </ScrollArea>
                    <FormMessage />
                    </FormItem>
                )}
                />
          )}
        </div>
        <div className="flex justify-between gap-2 p-6 border-t">
          <div>
            <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={isSubmitting}
            >
                Batal
            </Button>
          </div>
          <div className='flex gap-2'>
            {step > 1 && (
                <Button
                    type="button"
                    variant="ghost"
                    onClick={handleBack}
                    disabled={isSubmitting}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Kembali
                </Button>
            )}
            {step < 3 && (
                 <Button
                    type="button"
                    onClick={handleNext}
                >
                    Selanjutnya
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            )}
            {step === 3 && (
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Simpan & Buat Briefing
                </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
