'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { signInWithEmailAndPassword, UserCredential } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { motion } from 'framer-motion';

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
      email: '',
      password: '',
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
  
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1],
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  };
  
  const sideVariants = {
    leftHidden: { opacity: 0, x: -50 },
    rightHidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } },
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gray-50 text-gray-900 overflow-hidden p-4">
      {/* Background Animated Gradients */}
      <motion.div 
        animate={{
            x: ['-20%', '15%', '-20%'],
            y: ['-20%', '10%', '-20%'],
            scale: [1, 1.2, 1],
            rotate: [0, 15, 0],
        }}
        transition={{
            duration: 20,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatType: 'reverse',
        }}
        className="absolute -top-1/4 -left-1/4 w-[32rem] h-[32rem] sm:w-[48rem] sm:h-[48rem] rounded-full mix-blend-multiply filter blur-2xl opacity-50" style={{backgroundColor: '#17c9ec'}}></motion.div>
      <motion.div 
        animate={{
            x: ['20%', '-15%', '20%'],
            y: ['20%', '-10%', '20%'],
            scale: [1, 1.1, 1],
            rotate: [0, -15, 0],
        }}
        transition={{
            duration: 25,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatType: 'reverse',
            delay: 5,
        }}
        className="absolute -bottom-1/4 -right-1/4 w-[32rem] h-[32rem] sm:w-[48rem] sm:h-[48rem] rounded-full mix-blend-multiply filter blur-2xl opacity-50" style={{backgroundColor: '#b21593'}}></motion.div>


      <motion.div 
        className="relative w-full max-w-5xl rounded-2xl shadow-2xl grid md:grid-cols-2 overflow-hidden bg-white/60 backdrop-blur-xl border border-gray-200/50"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        
        {/* Left Side - Branding */}
        <motion.div 
          className="hidden md:flex flex-col items-center justify-center p-12 bg-white/30 border-r border-gray-200/50"
          variants={sideVariants}
          initial="leftHidden"
          animate="visible"
        >
          <div className="flex flex-col items-center justify-center text-center">
            <motion.div
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
            >
              <Image 
                  src="/zenithr-logo.png"
                  alt="ZENITHR Logo"
                  width={200}
                  height={56}
                  className="object-contain"
                  priority
              />
            </motion.div>
            <h1 className="text-5xl font-bold text-gray-800 mt-4 tracking-wider">ZENITHR</h1>
            <p className="text-gray-500 mt-2">Sistem Manajemen Sumber Daya Manusia Modern</p>
          </div>
        </motion.div>

        {/* Right Side - Form */}
        <motion.div 
          className="p-8 sm:p-12"
          variants={sideVariants}
          initial="rightHidden"
          animate="visible"
        >
           <motion.div className='mb-8 text-center' variants={itemVariants}>
                <div className="flex md:hidden items-center justify-center mb-6">
                    <motion.div
                        whileHover={{ rotate: 360, scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    >
                      <Image 
                          src="/zenithr-logo.png"
                          alt="ZENITHR Logo"
                          width={180}
                          height={50}
                          className="object-contain"
                      />
                    </motion.div>
                </div>
                <h3 className='text-3xl font-bold text-gray-800'>Selamat Datang!</h3>
                <p className='text-muted-foreground'>Silakan masuk untuk melanjutkan</p>
            </motion.div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <motion.div variants={itemVariants}>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                          <div className="relative rounded-md p-px bg-gradient-to-r from-[#17c9ec] to-[#b21593] focus-within:animate-gradient-border group">
                              <Input
                                  type="email"
                                  placeholder="Masukkan email Anda"
                                  className="bg-white border-0 focus-visible:ring-transparent focus-visible:ring-offset-0"
                                  {...field}
                              />
                          </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>
              <motion.div variants={itemVariants}>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                           <div className="relative rounded-md p-px bg-gradient-to-r from-[#17c9ec] to-[#b21593] focus-within:animate-gradient-border group">
                              <Input
                              type="password"
                              placeholder="Masukkan password Anda"
                              className="bg-white border-0 focus-visible:ring-transparent focus-visible:ring-offset-0"
                              {...field}
                              />
                          </div>
                        </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
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
              </motion.div>
            </form>
          </Form>
        </motion.div>
      </motion.div>
      <footer className="absolute bottom-4 text-center text-sm text-gray-500">
        ZENITHR by AfrIbr
      </footer>
    </div>
  );
}
