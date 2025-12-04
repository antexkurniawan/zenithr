
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { doc, serverTimestamp, updateDoc, collection, getDocs, writeBatch } from 'firebase/firestore';

import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
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
import type { Briefing, Employee, BriefingParticipant, UserProfile } from '@/lib/types';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Separator } from '../ui/separator';

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

type EditBriefingFormValues = z.infer<typeof formSchema>;

interface EditBriefingFormProps {
  briefing: Briefing;
  employees: Employee[];
  setModalOpen: (open: boolean) => void;
}

export function EditBriefingForm({ briefing, employees, setModalOpen }: EditBriefingFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userProfileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const participantsCollectionRef = useMemoFirebase(() => collection(firestore, 'briefings', briefing.id, 'participants'), [firestore, briefing.id]);
  const { data: existingParticipants, isLoading: isLoadingParticipants } = useCollection<BriefingParticipant>(participantsCollectionRef);

  const form = useForm<EditBriefingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      area: briefing.area,
      briefingDate: new Date(briefing.briefingDate),
      items: briefing.items || [{ topic: '', content: '' }],
      participants: [],
    },
  });

   useEffect(() => {
    if (existingParticipants) {
      form.setValue('participants', existingParticipants.map(p => p.employeeId));
    }
  }, [existingParticipants, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  async function onSubmit(data: EditBriefingFormValues) {
    if (!userProfile) return;
    setIsSubmitting(true);
    try {
      const batch = writeBatch(firestore);

      const briefingDocRef = doc(firestore, 'briefings', briefing.id);
      const updatedBriefingData: Partial<Briefing> = {
        area: data.area,
        briefingDate: data.briefingDate.toISOString(),
        topics: data.items.map(item => item.topic),
        content: data.items.map(item => item.content),
        items: data.items,
        updatedAt: serverTimestamp(),
        // Also update acknowledger info from current profile state in case it changed
        acknowledgerName: userProfile.operationPointCoordinatorName || briefing.acknowledgerName || null,
        acknowledgerSignatureUrl: userProfile.operationPointCoordinatorSignatureUrl || briefing.acknowledgerSignatureUrl || null,
      };
      batch.update(briefingDocRef, updatedBriefingData);

      const participantsRef = collection(firestore, 'briefings', briefing.id, 'participants');
      
      const existingDocs = await getDocs(participantsRef);
      existingDocs.forEach(doc => batch.delete(doc.ref));

      data.participants.forEach(employeeId => {
        const employee = employees.find(e => e.id === employeeId);
        if (employee) {
          const newParticipantRef = doc(participantsRef);
          batch.set(newParticipantRef, {
            employeeId: employee.id,
            employeeName: employee.name,
            employeeJobTitle: employee.jobTitle,
            hasSigned: false,
          });
        }
      });
      
      await batch.commit();

      toast({
        title: 'Briefing Berhasil Diperbarui!',
        description: `Materi briefing dan daftar peserta untuk area ${data.area} telah diperbarui.`,
      });
      setModalOpen(false);
    } catch (error) {
      console.error('Error updating briefing:', error);
      toast({
        title: 'Terjadi Kesalahan',
        description: 'Gagal memperbarui materi briefing. Silakan coba lagi.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingParticipants) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow flex flex-col">
        <ScrollArea className="flex-grow pr-6 -mr-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Left Column: Material */}
                <div className="space-y-4">
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
                                <div className="relative">
                                    <Input
                                    value={field.value ? format(field.value, 'dd/MM/yyyy HH:mm') : ''}
                                    readOnly
                                    placeholder="Pilih tanggal dan waktu"
                                    className="pr-8"
                                    />
                                    <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                                </div>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-[101]" align="start">
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

                    <div>
                        <FormLabel>Topik & Materi Briefing</FormLabel>
                        <FormDescription className="mb-2 text-xs">
                            Masukkan topik dan poin-poin materi yang akan disampaikan.
                        </FormDescription>
                        <ScrollArea className="h-60 pr-4">
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
                </div>

                {/* Right Column: Participants */}
                <div className="space-y-2">
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
                            <ScrollArea className="h-[28.5rem] border rounded-md p-2">
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
                </div>
            </div>
          </div>
        </ScrollArea>
        <Separator className="mt-auto"/>
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
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Perubahan
            </Button>
        </div>
      </form>
    </Form>
  );
}
