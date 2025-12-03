
'use client';

import {
  Users,
  FileWarning,
  UserPlus,
  CalendarClock,
  PlusCircle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { collection, where, query } from 'firebase/firestore';

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

function StatCard({ title, value, icon: Icon, isLoading }: { title: string, value: string | number, icon: React.ElementType, isLoading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
        ) : (
            <div className="text-4xl font-bold">{value}</div>
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
  const activeEmployeesQuery = useMemoFirebase(() => query(employeesCollection), [employeesCollection]);
  
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

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
            title="Total Pegawai" 
            value={totalEmployees} 
            icon={Users} 
            isLoading={isLoadingEmployees}
        />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SP Aktif</CardTitle>
            <FileWarning className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingWarnings ? <Loader2 className="h-8 w-8 animate-spin" /> : <div className="text-4xl font-bold">{activeWarningsCount}</div> }
          </CardContent>
          <CardFooter>
            <Button size="sm" asChild>
              <Link href="/warnings">Lihat Detail</Link>
            </Button>
          </CardFooter>
        </Card>
        <StatCard 
            title="Perekrutan Bulan Ini" 
            value={0} // Static for now
            icon={UserPlus} 
            isLoading={false}
        />
        <StatCard 
            title="Kontrak Segera Berakhir" 
            value={expiringContracts} 
            icon={CalendarClock} 
            isLoading={isLoadingEmployees}
        />
      </div>

      <div className="grid gap-8 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Aksi Cepat</CardTitle>
            <CardDescription>
              Mulai tugas umum dengan satu klik.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Dialog open={isEmployeeModalOpen} onOpenChange={setEmployeeModalOpen}>
                <DialogTrigger asChild>
                    <Button size="lg" className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Tambah Pegawai Baru
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Tambah Pegawai Baru</DialogTitle>
                    </DialogHeader>
                    <NewEmployeeForm setModalOpen={setEmployeeModalOpen} />
                </DialogContent>
            </Dialog>

            <Dialog open={isWarningModalOpen} onOpenChange={setWarningModalOpen}>
                <DialogTrigger asChild>
                    <Button size="lg" variant="secondary" className="w-full">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Buat Surat Peringatan
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Buat Surat Peringatan Baru</DialogTitle>
                    </DialogHeader>
                    {isLoadingEmployees ? (
                        <div className="flex justify-center items-center p-8">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    ) : (
                        <NewWarningForm employees={allEmployees ?? []} setModalOpen={setWarningModalOpen} />
                    )}
                </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    
