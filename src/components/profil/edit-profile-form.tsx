'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

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
import type { UserProfile } from '@/lib/types';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const formSchema = z.object({
  name: z.string().min(2, 'Nama lengkap minimal 2 karakter.'),
  jobTitle: z.string().min(2, 'Jabatan minimal 2 karakter.'),
  workArea: z.string().min(2, 'Area kerja minimal 2 karakter.'),
});

type ProfileFormValues = z.infer<typeof formSchema>;

interface EditProfileFormProps {
  userProfile: UserProfile;
  userId: string;
  setModalOpen: (open: boolean) => void;
}

export function EditProfileForm({ userProfile, userId, setModalOpen }: EditProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: userProfile.name || '',
      jobTitle: userProfile.jobTitle || '',
      workArea: userProfile.workArea || '',
    },
  });

  async function onSubmit(data: ProfileFormValues) {
    setIsSubmitting(true);
    try {
      const userProfileRef = doc(firestore, 'users', userId);
      const updatedProfileData = {
        ...userProfile, // preserve existing data like email, signatureUrl, etc.
        ...data,
        updatedAt: serverTimestamp(),
      };
      
      // Use setDoc with merge to create or update the document
      await setDoc(userProfileRef, updatedProfileData, { merge: true });

      toast({
        title: 'Profil Berhasil Diperbarui!',
        description: 'Informasi profil Anda telah berhasil disimpan.',
      });
      setModalOpen(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Memperbarui Profil',
        description: error.message || 'Terjadi kesalahan. Silakan coba lagi.',
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama Lengkap</FormLabel>
              <FormControl>
                <Input placeholder="Nama lengkap Anda" {...field} />
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
              <FormControl>
                <Input placeholder="cth. Field Coordinator" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="workArea"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Area Kerja</FormLabel>
              <FormControl>
                <Input placeholder="cth. Gorontalo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-2 gap-2">
           <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={isSubmitting}>
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
