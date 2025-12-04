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
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 text-gray-900 overflow-hidden p-4">
      {/* Background Animated Gradients */}
      <div className="absolute -top-1/4 -left-1/4 w-[32rem] h-[32rem] sm:w-[48rem] sm:h-[48rem] rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob" style={{backgroundColor: '#17c9ec'}}></div>
      <div className="absolute -bottom-1/4 -right-1/4 w-[32rem] h-[32rem] sm:w-[48rem] sm:h-[48rem] rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob animation-delay-4000" style={{backgroundColor: '#b21593'}}></div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 10s infinite;
        }
        .animation-delay-4000 {
          animation-delay: -4s;
        }
      `}</style>


      <div className="relative w-full max-w-5xl rounded-2xl shadow-2xl grid md:grid-cols-2 overflow-hidden bg-white/60 backdrop-blur-xl border border-gray-200/50">
        
        {/* Left Side - Branding */}
        <div className="hidden md:flex flex-col items-center justify-center p-12 bg-white/30 border-r border-gray-200/50">
          <div className="flex flex-col items-center justify-center text-center">
            <Image 
                src="/zenithr-logo.png"
                alt="ZENITHR Logo"
                width={200}
                height={56}
                className="object-contain"
                priority
            />
            <h1 className="text-5xl font-bold text-gray-800 mt-4 tracking-wider">ZENITHR</h1>
            <p className="text-gray-500 mt-2">Sistem Manajemen Sumber Daya Manusia Modern</p>
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
                <h3 className='text-3xl font-bold text-gray-800'>Selamat Datang!</h3>
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
                        <div className="relative rounded-md p-px bg-gradient-to-r from-[#17c9ec] to-[#b21593]">
                            <Input
                                type="email"
                                placeholder="nama@perusahaan.com"
                                className="bg-white border-0 focus-visible:ring-transparent focus-visible:ring-offset-0"
                                {...field}
                            />
                        </div>
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
                        <div className="relative rounded-md p-px bg-gradient-to-r from-[#17c9ec] to-[#b21593]">
                            <Input
                            type="password"
                            placeholder="******"
                            className="bg-white border-0 focus-visible:ring-transparent focus-visible:ring-offset-0"
                            {...field}
                            />
                        </div>
                      </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="text-right text-sm">
                <Link href="#" className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-[#17c9ec] to-[#b21593] hover:brightness-125">Lupa Password?</Link>
              </div>

              <Button 
                type="submit" 
                className="w-full font-bold text-base h-12 text-white transition-all duration-300 transform hover:scale-105"
                style={{
                  background: 'linear-gradient(to right, #17c9ec, #b21593)',
                }}
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
                  <Link href="#" className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-[#17c9ec] to-[#b21593] hover:brightness-125">
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
