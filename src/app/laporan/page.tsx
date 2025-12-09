
'use client';
import { motion } from 'framer-motion';
import { Users, FileText, FileWarning, CalendarCheck, UserPlus, Briefcase, FileDown, Loader2 } from 'lucide-react';
import PageHeader from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TurnoverChart } from '@/components/laporan/turnover-chart';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const StatCard = ({ title, value, icon: Icon, description, isLoading }: { title: string, value: string | number, icon: React.ElementType, description?: string, isLoading?: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <Skeleton className="h-8 w-16" />
            ) : (
                <>
                    <div className="text-2xl font-bold">{value}</div>
                    {description && <p className="text-xs text-muted-foreground">{description}</p>}
                </>
            )}
        </CardContent>
    </Card>
);

const LaporanPegawaiTab = () => {
    // Placeholder data for now
    const isLoading = false;
    const totalPegawai = 125;
    const pegawaiBaru = 5;
    const turnoverRate = "3.2%";

    return (
        <motion.div className="space-y-6 mt-4">
            <div className="flex items-center justify-between">
                <div/>
                <Button variant="outline" disabled={isLoading}>
                    {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <FileDown className="mr-2 h-4 w-4" />
                    )}
                    Ekspor ke Excel
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <StatCard 
                    title="Total Pegawai Aktif"
                    value={totalPegawai}
                    icon={Users}
                    isLoading={isLoading}
                />
                <StatCard 
                    title="Pegawai Baru"
                    value={pegawaiBaru}
                    icon={UserPlus}
                    description="Dalam 30 hari terakhir"
                    isLoading={isLoading}
                />
                <StatCard 
                    title="Tingkat Turnover"
                    value={turnoverRate}
                    icon={Users}
                    description="Bulan ini"
                    isLoading={isLoading}
                />
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        Distribusi Jabatan
                    </CardTitle>
                    <CardDescription>
                        Komposisi pegawai berdasarkan jabatan yang mereka pegang.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-8">
                       Grafik distribusi jabatan akan kita bangun di sini.
                    </p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Analisis Turnover Pegawai
                    </CardTitle>
                    <CardDescription>
                        Perbandingan jumlah pegawai yang masuk dan keluar setiap bulan.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                     <TurnoverChart />
                </CardContent>
            </Card>
        </motion.div>
    );
};


const ReportTabContent = ({ title, description }: { title: string, description: string }) => (
     <motion.div>
        <Card className="mt-4">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground text-center py-8">
                    Fitur laporan untuk {title.toLowerCase()} akan segera kita bangun di sini.
                </p>
            </CardContent>
        </Card>
     </motion.div>
  );

export default function LaporanPage() {
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
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <PageHeader
        title="Pusat Laporan HR"
        description="Analisis dan unduh data penting untuk kebutuhan HR."
      />

      <motion.div variants={itemVariants}>
        <Tabs defaultValue="pegawai" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="pegawai"><Users className="mr-2 h-4 w-4" /> Pegawai</TabsTrigger>
                <TabsTrigger value="briefing"><FileText className="mr-2 h-4 w-4" /> Briefing</TabsTrigger>
                <TabsTrigger value="peringatan"><FileWarning className="mr-2 h-4 w-4" /> Peringatan</TabsTrigger>
                <TabsTrigger value="absensi"><CalendarCheck className="mr-2 h-4 w-4" /> Absensi</TabsTrigger>
            </TabsList>
            <TabsContent value="pegawai">
                <LaporanPegawaiTab />
            </TabsContent>
            <TabsContent value="briefing">
                 <ReportTabContent 
                    title="Laporan Briefing"
                    description="Rekapitulasi pelaksanaan briefing, materi, dan daftar hadir."
                />
            </TabsContent>
            <TabsContent value="peringatan">
                 <ReportTabContent 
                    title="Laporan Surat Peringatan"
                    description="Analisis tren pelanggaran dan rekapitulasi surat peringatan aktif."
                />
            </TabsContent>
            <TabsContent value="absensi">
                 <ReportTabContent 
                    title="Laporan Absensi"
                    description="Rekapitulasi dan analisis tingkat kehadiran, keterlambatan, dan absensi."
                />
            </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
