
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/page-header";
import { MoreHorizontal, PlusCircle, Loader2, Edit, Trash2 } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { CompanyRule, WarningType } from '@/lib/types';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { EditRuleForm } from '@/components/pengaturan/edit-rule-form';

import * as initialData from './initial-rules.json';

const MotionCard = motion(Card);

function RulesTable({ rules, category, isLoading, onEdit, onDelete }: { rules: CompanyRule[], category: WarningType, isLoading: boolean, onEdit: (rule: CompanyRule) => void, onDelete: (rule: CompanyRule) => void }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
            <CardTitle>{category}</CardTitle>
            <CardDescription>Daftar aturan untuk kategori {category}.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deskripsi Pelanggaran</TableHead>
              <TableHead>Peraturan Perusahaan</TableHead>
              <TableHead className="w-[50px] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell colSpan={3}>
                            <Skeleton className="h-8 w-full" />
                        </TableCell>
                    </TableRow>
                ))
            ) : rules.length > 0 ? (
                rules.map((rule) => (
                <TableRow key={rule.id}>
                    <TableCell>{rule.description}</TableCell>
                    <TableCell>{rule.text}</TableCell>
                    <TableCell className="text-right">
                    <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Buka menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEdit(rule)}><Edit className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(rule)}><Trash2 className="mr-2 h-4 w-4"/>Hapus</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow>
                    <TableCell colSpan={3} className="text-center h-24">Belum ada aturan untuk kategori ini.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


export default function PengaturanPage() {
  const firestore = useFirestore();
  
  const [isSeeding, setIsSeeding] = useState(false);
  const [selectedRule, setSelectedRule] = useState<CompanyRule | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const rulesCollectionRef = useMemoFirebase(() => collection(firestore, 'company_rules'), [firestore]);
  const { data: rules, isLoading, error } = useCollection<CompanyRule>(rulesCollectionRef);
  
  useEffect(() => {
    const seedData = async () => {
      if (!isLoading && rules && rules.length === 0 && !isSeeding) {
        setIsSeeding(true);
        toast.info("Inisialisasi Data Master", {
          description: "Menyiapkan data peraturan awal. Mohon tunggu...",
        });

        try {
          const batch = writeBatch(firestore);
          const rulesToSeed = (initialData as any).companyRules;

          Object.keys(rulesToSeed).forEach((category: string) => {
            rulesToSeed[category as keyof typeof rulesToSeed].forEach((rule: any) => {
              const newDocRef = doc(collection(firestore, 'company_rules'));
              const newRule: Omit<CompanyRule, 'id'> = {
                type: category as WarningType,
                description: rule.description,
                text: rule.text,
              };
              batch.set(newDocRef, newRule);
            });
          });
          await batch.commit();
          toast.success("Data Master Berhasil Disiapkan", {
            description: "Panduan peraturan telah berhasil dimuat ke database.",
          });
        } catch (err) {
          console.error("Failed to seed company rules:", err);
          toast.error("Gagal Menyiapkan Data", {
            description: "Terjadi kesalahan saat menyimpan data peraturan awal.",
          });
        } finally {
          setIsSeeding(false);
        }
      }
    };

    seedData();
  }, [isLoading, rules, firestore, isSeeding]);

  const groupedRules = useMemo(() => {
    const groups: Record<string, CompanyRule[]> = {
        "Teguran": [], "SP1": [], "SP2": [], "SP3": []
    };
    if (rules) {
      rules.forEach(rule => {
        if (groups[rule.type]) {
          groups[rule.type].push(rule);
        }
      });
    }
    return groups;
  }, [rules]);

  const handleEdit = (rule: CompanyRule) => {
    setSelectedRule(rule);
    setIsEditModalOpen(true);
  };
  
  const handleDelete = (rule: CompanyRule) => {
    setSelectedRule(rule);
    setIsDeleteAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedRule) return;
    setIsProcessingDelete(true);
    try {
        await deleteDoc(doc(firestore, 'company_rules', selectedRule.id));
        toast.success("Aturan Dihapus", {
            description: "Aturan peraturan telah berhasil dihapus."
        });
        setIsDeleteAlertOpen(false);
        setSelectedRule(null);
    } catch(err) {
        toast.error("Gagal Menghapus");
    } finally {
        setIsProcessingDelete(false);
    }
  }

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
        title="Pengaturan Aplikasi"
        description="Kelola data master, integrasi, dan preferensi aplikasi Anda."
      />

      <Tabs defaultValue="master-data" className="space-y-4">
        <TabsList>
          <TabsTrigger value="master-data">Master Data</TabsTrigger>
          <TabsTrigger value="integrasi" disabled>
            Integrasi
          </TabsTrigger>
          <TabsTrigger value="preferensi" disabled>
            Preferensi
          </TabsTrigger>
        </TabsList>
        <TabsContent value="master-data" className="space-y-4">
          <MotionCard variants={itemVariants}>
            <CardHeader className="flex flex-row justify-between items-start">
              <div>
                <CardTitle>Panduan Peraturan</CardTitle>
                <CardDescription>
                  Kelola daftar peraturan perusahaan yang digunakan untuk membuat Surat Peringatan.
                </CardDescription>
              </div>
              <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
                  <DialogTrigger asChild>
                      <Button>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Tambah Aturan Baru
                      </Button>
                  </DialogTrigger>
                  <DialogContent>
                      <DialogHeader>
                          <DialogTitle>Buat Aturan Peraturan Baru</DialogTitle>
                      </DialogHeader>
                      <EditRuleForm setModalOpen={setIsNewModalOpen} />
                  </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="space-y-4">
               {(isLoading && !rules) || isSeeding ? (
                <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="ml-4 text-muted-foreground">Memuat data peraturan...</p>
                </div>
               ) : (
                <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
                    {Object.keys(groupedRules).map((category, index) => (
                         <AccordionItem value={`item-${index}`} key={category}>
                            <AccordionTrigger className="text-lg font-medium">{category} ({groupedRules[category].length})</AccordionTrigger>
                            <AccordionContent>
                                <RulesTable 
                                  rules={groupedRules[category as WarningType]} 
                                  category={category as WarningType} 
                                  isLoading={isLoading}
                                  onEdit={handleEdit}
                                  onDelete={handleDelete}
                                />
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
               )}
            </CardContent>
          </MotionCard>
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Aturan Peraturan</DialogTitle>
            </DialogHeader>
            {selectedRule && <EditRuleForm rule={selectedRule} setModalOpen={setIsEditModalOpen} />}
        </DialogContent>
      </Dialog>
      
      {/* Delete Alert */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Tindakan ini tidak dapat dibatalkan. Aturan ini akan dihapus secara permanen dari database.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDelete} disabled={isProcessingDelete} className="bg-destructive hover:bg-destructive/90">
                      {isProcessingDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Ya, Hapus
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

    </motion.div>
  );
}

    