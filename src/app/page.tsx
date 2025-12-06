
'use client';

import {
  Users,
  FileWarning,
  UserPlus,
  CalendarClock,
  PlusCircle,
  Loader2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { collection, where, query, orderBy } from 'firebase/firestore';
import Image from 'next/image';
import { motion } from 'framer-motion';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Employee, Warning } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NewEmployeeForm } from '@/components/pegawai/new-employee-form';
import { useState } from 'react';
import { NewWarningForm } from '@/components/warnings/new-warning-form';
import { isAfter } from 'date-fns';
import { cn } from '@/lib/utils';

const MotionCard = motion(Card);

function StatCard({ 
    title, 
    value, 
    icon: Icon, 
    isLoading,
    description,
    className 
}: { 
    title: string, 
    value: string | number, 
    icon: React.ElementType, 
    isLoading: boolean,
    description?: string,
    className?: string 
}) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
        ) : (
            <>
                <div className="text-4xl font-bold">{value}</div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [isEmployeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [isWarningModalOpen, setWarningModalOpen] = useState(false);
  
  const firestore = useFirestore();

  const employeesCollection = useMemoFirebase(() => collection(firestore, 'employees'), [firestore]);
  const activeEmployeesQuery = useMemoFirebase(() => query(employeesCollection, orderBy('name', 'asc')), [employeesCollection]);
  
  // This is a subcollection query, which is more complex. Let's simplify for now.
  const warningsCollection = useMemoFirebase(() => collection(firestore, 'warnings'), [firestore]);
  const { data: allWarnings, isLoading: isLoadingWarnings } = useCollection<Warning>(warningsCollection);

  const { data: allEmployees, isLoading: isLoadingEmployees } = useCollection<Employee>(activeEmployeesQuery);
  
  const activeWarningsCount = allWarnings?.filter(w => isAfter(new Date(w.expiryDate), new Date())).length ?? 0;

  const totalEmployees = allEmployees?.length ?? 0;
  
  const expiringContracts = allEmployees?.filter(e => {
      if (!e.contractEndDate) return false;
      const diff = new Date(e.contractEndDate).getTime() - new Date().getTime();
      const days = diff / (1000 * 3600 * 24);
      return days > 0 && days <= 30;
  }).length ?? 0;

  const isLoading = isLoadingEmployees || isLoadingWarnings;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };

  return (
    <motion.div 
      className="space-y-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      
      <motion.div 
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        variants={containerVariants}
      >
        {/* Main Hero Card */}
        <MotionCard 
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          className="lg:col-span-3 relative flex flex-col justify-between overflow-hidden p-6 bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground"
        >
           <div className="space-y-2">
                <h2 className="text-lg font-semibold">Total Active Workforce</h2>
                {isLoading ? (
                     <Loader2 className="h-10 w-10 animate-spin" />
                ): (
                    <p className="text-6xl font-bold tracking-tighter">{totalEmployees}</p>
                )}
                {/* Placeholder for now */}
                <p className="text-sm opacity-80">Shift Compliance: 92%</p>
           </div>
        </MotionCard>

        {/* Other Stat Cards */}
        <MotionCard variants={itemVariants} whileHover={{ scale: 1.02 }}>
            <StatCard 
                title="SP Aktif" 
                value={activeWarningsCount} 
                icon={FileWarning} 
                isLoading={isLoadingWarnings}
                description="Surat peringatan yang masih berlaku"
            />
        </MotionCard>
        <MotionCard variants={itemVariants} whileHover={{ scale: 1.02 }}>
            <StatCard 
                title="Kontrak Segera Berakhir" 
                value={expiringContracts} 
                icon={CalendarClock} 
                isLoading={isLoadingEmployees}
                description="Dalam 30 hari ke depan"
            />
        </MotionCard>
        <MotionCard variants={itemVariants} whileHover={{ scale: 1.02 }}>
            <StatCard 
                title="Keterlambatan Check-in" 
                value={8} // Placeholder
                icon={AlertTriangle} 
                isLoading={false}
                description="Bulan ini"
            />
        </MotionCard>
         <MotionCard variants={itemVariants} whileHover={{ scale: 1.02 }}>
            <StatCard 
                title="Jam Lembur" 
                value={1200} // Placeholder
                icon={Clock} 
                isLoading={false}
                description="Bulan ini"
            />
        </MotionCard>
      </motion.div>
    </motion.div>
  );
}
