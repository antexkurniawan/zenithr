
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, serverTimestamp, setDoc, addDoc, collection } from 'firebase/firestore';

import type { CompanyRule, WarningType } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  type: z.enum(["Teguran", "SP1", "SP2", "SP3"], { required_error: "Jenis aturan harus dipilih." }),
  description: z.string().min(10, 'Deskripsi minimal 10 karakter.'),
  text: z.string().min(10, 'Teks peraturan minimal 10 karakter.'),
});

type FormValues = z.infer<typeof formSchema>;

interface EditRuleFormProps {
  rule?: CompanyRule;
  setModalOpen: (open: boolean) => void;
}

export function EditRuleForm({ rule, setModalOpen }: EditRuleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: rule ? {
      type: rule.type,
      description: rule.description,
      text: rule.text,
    } : {
      type: "Teguran",
      description: "",
      text: "",
    },
  });

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      if (rule) {
        // Update existing rule
        const docRef = doc(firestore, 'company_rules', rule.id);
        await setDoc(docRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
        toast({ title: "Aturan Diperbarui", description: "Perubahan pada aturan telah disimpan." });
      } else {
        // Create new rule
        const collectionRef = collection(firestore, 'company_rules');
        await addDoc(collectionRef, { ...data, createdAt: serverTimestamp() });
        toast({ title: "Aturan Dibuat", description: "Aturan baru telah berhasil ditambahkan." });
      }
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      toast({
        title: "Terjadi Kesalahan",
        description: "Gagal menyimpan aturan. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jenis Aturan</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis aturan" />
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deskripsi Pelanggaran</FormLabel>
              <FormControl>
                <Textarea placeholder="Jelaskan deskripsi pelanggaran..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teks Peraturan</FormLabel>
              <FormControl>
                <Input placeholder="Contoh: Peraturan Perusahaan Pasal X Ayat Y..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan
          </Button>
        </div>
      </form>
    </Form>
  );
}
