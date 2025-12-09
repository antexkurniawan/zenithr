
'use client';
import { motion } from 'framer-motion';
import { Users, FileText, FileWarning, CalendarCheck } from 'lucide-react';
import PageHeader from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const ReportTabContent = ({ title, description }: { title: string, description: string }) => (
     <motion.div variants={itemVariants}>
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
                <ReportTabContent 
                    title="Laporan Data Pegawai"
                    description="Analisis demografi, status kontrak, dan data master pegawai lainnya."
                />
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
