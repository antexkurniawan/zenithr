
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { EmailAuthProvider, reauthenticateWithCredential, verifyBeforeUpdateEmail } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

import { useAuth, useUser, useFirestore } from '@/firebase';
import { toast } from 'sonner';
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

const formSchema = z.object({
    newEmail: z.string().email('Format email tidak valid.'),
    currentPassword: z.string().min(1, 'Password saat ini harus diisi.'),
});

type ChangeEmailFormValues = z.infer<typeof formSchema>;

interface ChangeEmailFormProps {
  setModalOpen: (open: boolean) => void;
}

export function ChangeEmailForm({ setModalOpen }: ChangeEmailFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<ChangeEmailFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newEmail: '',
      currentPassword: '',
    },
  });

  async function onSubmit(data: ChangeEmailFormValues) {
    if (!user || !user.email) {
      toast.error('Gagal Mengubah Email', {
        description: 'Pengguna tidak terautentikasi dengan benar.',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 1. Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // 2. Send verification email to the new address
      await verifyBeforeUpdateEmail(user, data.newEmail);

      // Also update the email in the user's Firestore profile
      const userProfileRef = doc(firestore, 'users', user.uid);
      await updateDoc(userProfileRef, { email: data.newEmail });

      toast.success('Verifikasi Email Terkirim!', {
        description: `Kami telah mengirimkan link verifikasi ke ${data.newEmail}. Silakan klik link tersebut untuk menyelesaikan perubahan email.`,
        duration: 8000,
      });
      setModalOpen(false);

    } catch (error: any) {
      let description = 'Terjadi kesalahan. Silakan coba lagi.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = 'Password saat ini yang Anda masukkan salah.';
        form.setError('currentPassword', { type: 'manual', message: description });
      } else if (error.code === 'auth/email-already-in-use') {
         description = 'Alamat email ini sudah digunakan oleh akun lain.';
         form.setError('newEmail', { type: 'manual', message: description });
      }
      console.error('Error updating email:', error);
      toast.error('Gagal Memperbarui Email', {
        description,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="newEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Baru</FormLabel>
              <FormControl>
                <Input type="email" placeholder="email.baru@contoh.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password Saat Ini</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4 gap-2">
           <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={isSubmitting}>
                Batal
           </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kirim Verifikasi
          </Button>
        </div>
      </form>
    </Form>
  );
}

    