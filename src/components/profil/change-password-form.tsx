
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

import { useAuth, useUser } from '@/firebase';
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

const formSchema = z
  .object({
    currentPassword: z.string().min(6, 'Password saat ini minimal 6 karakter.'),
    newPassword: z.string().min(6, 'Password baru minimal 6 karakter.'),
    confirmPassword: z.string().min(6, 'Konfirmasi password minimal 6 karakter.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Password baru dan konfirmasi password tidak cocok.',
    path: ['confirmPassword'],
  });

type ChangePasswordFormValues = z.infer<typeof formSchema>;

interface ChangePasswordFormProps {
  setModalOpen: (open: boolean) => void;
}

export function ChangePasswordForm({ setModalOpen }: ChangePasswordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const auth = useAuth();
  const { user } = useUser();

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(data: ChangePasswordFormValues) {
    if (!user || !user.email) {
      toast.error('Gagal Mengubah Password', {
        description: 'Pengguna tidak terautentikasi dengan benar.',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 1. Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // 2. Update password
      await updatePassword(user, data.newPassword);

      toast.success('Password Berhasil Diperbarui!', {
        description: 'Silakan gunakan password baru Anda saat login berikutnya.',
      });
      setModalOpen(false);

    } catch (error: any) {
      let description = 'Terjadi kesalahan. Silakan coba lagi.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = 'Password saat ini yang Anda masukkan salah.';
        form.setError('currentPassword', { type: 'manual', message: description });
      }
      console.error('Error updating password:', error);
      toast.error('Gagal Memperbarui Password', {
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
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password Baru</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Konfirmasi Password Baru</FormLabel>
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
            Simpan Password Baru
          </Button>
        </div>
      </form>
    </Form>
  );
}
