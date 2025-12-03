'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword, UserCredential } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';

const formSchema = z.object({
  email: z
    .string({ required_error: 'Email harus diisi.' })
    .email('Format email tidak valid.'),
  password: z
    .string({ required_error: 'Password harus diisi.' })
    .min(6, 'Password minimal 6 karakter.'),
  remember: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof formSchema>;

const ensureUserProfileExists = async (firestore: any, user: any) => {
  const userProfileRef = doc(firestore, 'users', user.uid);
  const userProfileSnap = await getDoc(userProfileRef);

  if (!userProfileSnap.exists()) {
    // User profile doesn't exist, create one
    try {
      await setDoc(userProfileRef, {
        id: user.uid,
        email: user.email || '',
        name: user.displayName || user.email?.split('@')[0] || 'Pengguna Baru',
        jobTitle: 'Not Set',
        workArea: 'Not Set',
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to create user profile:", error);
      // We can decide to throw the error or handle it gracefully
    }
  }
};


export default function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: 'hrd@example.com',
      password: 'password',
      remember: false,
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsSubmitting(true);
    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      
      // Ensure user profile exists before redirecting
      await ensureUserProfileExists(firestore, userCredential.user);

      toast({
        title: 'Login Berhasil!',
        description: 'Selamat datang kembali.',
      });
      router.push('/');
    } catch (error: any) {
      console.error('Login failed:', error);
      let description = 'Terjadi kesalahan. Silakan coba lagi.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = 'Email atau password yang Anda masukkan salah.';
      }
      toast({
        variant: 'destructive',
        title: 'Login Gagal',
        description,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl rounded-2xl shadow-2xl grid md:grid-cols-2 overflow-hidden bg-card text-card-foreground">
        
        {/* Left Side */}
        <div className="hidden md:flex flex-col justify-between p-10 bg-primary text-primary-foreground relative">
           <div className="absolute inset-0 bg-black/10"></div>
           <div className="relative z-10">
             <h2 className="text-3xl font-bold">ZENITHR</h2>
             <p className="text-white/80">Sistem Manajemen Sumber Daya Manusia</p>
          </div>
          <div className="relative z-10 text-sm">
            &copy; 2024 FICO
          </div>
        </div>

        {/* Right Side */}
        <div className="p-6 sm:p-10">
          <div className='mb-8 text-center'>
            <h3 className='text-2xl font-bold text-gray-800 dark:text-gray-200'>Selamat Datang</h3>
            <p className='text-muted-foreground'>Silakan masuk ke akun Anda</p>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="nama@perusahaan.com"
                        className="bg-gray-100 dark:bg-gray-800 focus:bg-white"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                     <FormControl>
                        <Input
                          type="password"
                          placeholder="******"
                           className="bg-gray-100 dark:bg-gray-800 focus:bg-white"
                          {...field}
                        />
                      </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col sm:flex-row items-center justify-between text-sm gap-4">
                <FormField
                  control={form.control}
                  name="remember"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal text-muted-foreground">Ingat saya</FormLabel>
                    </FormItem>
                  )}
                />
                <Link href="#" className="text-primary hover:underline">Lupa Password?</Link>
              </div>

              <Button type="submit" className="w-full font-bold text-base h-12" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Masuk'
                )}
              </Button>
              
               <div className="text-center text-sm text-muted-foreground">
                  Belum punya akun?{' '}
                  <Link href="#" className="text-primary hover:underline font-medium">
                    Hubungi Administrator
                  </Link>
               </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
