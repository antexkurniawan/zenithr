
'use client';
import { motion } from 'framer-motion';
import PageHeader from "@/components/shared/page-header";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

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
        <Card>
          <CardContent className="p-10 text-center">
            <p className="text-muted-foreground">
              Fitur laporan sedang dalam tahap diskusi. Mari kita tentukan laporan apa saja yang perlu dibuat.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

    