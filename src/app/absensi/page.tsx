
'use client';

import { useState } from "react";
import { PlusCircle, Upload, Loader2, CalendarRange } from "lucide-react";
import { motion } from "framer-motion";

import PageHeader from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AnimatedDialogContent } from "@/components/shared/animated-dialog";
import { ImportAbsensiDialog } from "@/components/absensi/import-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


export default function AbsensiPage() {
    const [isImportModalOpen, setImportModalOpen] = useState(false);

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
            <PageHeader title="Manajemen Absensi & Jadwal Kerja">
                <Dialog open={isImportModalOpen} onOpenChange={setImportModalOpen}>
                    <DialogTrigger asChild>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button>
                                <Upload className="mr-2 h-4 w-4" />
                                Impor Jadwal/Absensi
                            </Button>
                        </motion.div>
                    </DialogTrigger>
                    <AnimatedDialogContent open={isImportModalOpen}>
                        <ImportAbsensiDialog setModalOpen={setImportModalOpen} />
                    </AnimatedDialogContent>
                </Dialog>
            </PageHeader>

             <motion.div variants={itemVariants}>
                <Tabs defaultValue="jadwal" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="jadwal">Jadwal Kerja</TabsTrigger>
                        <TabsTrigger value="absensi">Rekap Absensi</TabsTrigger>
                    </TabsList>
                    <TabsContent value="jadwal">
                        <Card>
                            <CardHeader>
                                <CardTitle>Jadwal Kerja Bulanan</CardTitle>
                                <CardDescription>Tampilan jadwal kerja pegawai per bulan akan ditampilkan di sini.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-96 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg">
                                    <CalendarRange className="h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="font-semibold text-muted-foreground">Fitur dalam pengembangan</p>
                                    <p className="text-sm text-muted-foreground">Tampilan kalender atau tabel jadwal kerja akan segera hadir.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="absensi">
                        <Card>
                            <CardHeader>
                                <CardTitle>Daftar Kehadiran</CardTitle>
                                <CardDescription>Tampilan data kehadiran pegawai akan ditampilkan di sini.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-96 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg">
                                    <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
                                    <p className="font-semibold text-muted-foreground">Fitur dalam pengembangan</p>
                                    <p className="text-sm text-muted-foreground">Tampilan tabel data absensi akan segera hadir.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
             </motion.div>
        </motion.div>
    );
}
