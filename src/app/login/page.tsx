'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';

const formSchema = z.object({
  email: z
    .string({ required_error: 'Email harus diisi.' })
    .email('Format email tidak valid.'),
  password: z
    .string({ required_error: 'Password harus diisi.' })
    .min(6, 'Password minimal 6 karakter.'),
});

type LoginFormValues = z.infer<typeof formSchema>;

const ensureUserProfileExists = async (firestore: any, user: any) => {
  const userProfileRef = doc(firestore, 'users', user.uid);
  const userProfileSnap = await getDoc(userProfileRef);

  if (!userProfileSnap.exists()) {
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
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsSubmitting(true);
    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      
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
    <div className="relative flex min-h-screen items-center justify-center bg-gray-900 text-white overflow-hidden p-4">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/30 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/30 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-pulse animation-delay-4000"></div>

      <div className="relative w-full max-w-5xl rounded-2xl shadow-2xl grid md:grid-cols-2 overflow-hidden bg-gray-800/20 backdrop-blur-lg border border-white/10">
        
        {/* Left Side - Branding */}
        <div className="hidden md:flex flex-col items-center justify-center p-12 bg-gray-900/40 border-r border-white/10">
          <div className="flex flex-col items-center justify-center">
            <Image 
                src="/zenithr-logo.png"
                alt="ZENITHR Logo"
                width={250}
                height={70}
                className="object-contain"
                priority
            />
            <p className="text-white/60 mt-4 text-center">Sistem Manajemen Sumber Daya Manusia Modern</p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="p-8 sm:p-12">
           <div className='mb-8 text-center'>
                <div className="flex md:hidden items-center justify-center mb-6">
                     <Image 
                        src="/zenithr-logo.png"
                        alt="ZENITHR Logo"
                        width={180}
                        height={50}
                        className="object-contain"
                    />
                </div>
                <h3 className='text-3xl font-bold text-white'>Welcome Back!</h3>
                <p className='text-muted-foreground'>Silakan masuk untuk melanjutkan</p>
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
                        className="bg-gray-700/50 border-white/20 focus:bg-gray-700 focus:ring-primary focus:border-primary"
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
                           className="bg-gray-700/50 border-white/20 focus:bg-gray-700 focus:ring-primary focus:border-primary"
                          {...field}
                        />
                      </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="text-right text-sm">
                <Link href="#" className="text-primary/80 hover:text-primary hover:underline">Lupa Password?</Link>
              </div>

              <Button 
                type="submit" 
                className="w-full font-bold text-base h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Masuk'
                )}
              </Button>
              
               <div className="text-center text-sm text-muted-foreground">
                  Belum punya akun?{' '}
                  <Link href="#" className="text-primary/80 hover:text-primary hover:underline font-medium">
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
