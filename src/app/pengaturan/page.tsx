
'use client';

import { useState } from 'react';
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
import { MoreHorizontal, PlusCircle } from "lucide-react";

// Mock data, to be replaced with Firestore data
const mockRules = {
    "Teguran": [
      { id: "TG-001", description: "Tidak mematuhi Pengarahaan atasannya...", text: "Pasal 23 Point 3.1 Huruf (a)" },
      { id: "TG-002", description: "Lalai dalam melaksanakan tugas...", text: "Pasal 23 Point 3.1 Huruf (b)" }
    ],
    "SP1": [
      { id: "SP1-001", description: "Pengulangan atas sanksi pelanggaran tingkat I...", text: "Pasal 23 Point 3.2 Huruf (a)" },
      { id: "SP1-002", description: "Datang terlambat masuk kerja 5 kali...", text: "Pasal 23 Point 3.2 Huruf (b)" }
    ],
    "SP2": [
       { id: "SP2-001", description: "Karyawan mengulangi pelanggaran yang sama setelah menerima SP1...", text: "Pasal 30 Ayat 2" }
    ],
    "SP3": [
        { id: "SP3-001", description: "Karyawan tetap melakukan pelanggaran lain meskipun telah menerima SP2...", text: "Pasal 30 Ayat 3" }
    ]
}

type Rule = {
    id: string;
    description: string;
    text: string;
}

type RuleCategory = "Teguran" | "SP1" | "SP2" | "SP3";

function RulesTable({ rules, category }: { rules: Rule[], category: RuleCategory }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
            <CardTitle>{category}</CardTitle>
            <CardDescription>Daftar aturan untuk kategori {category}.</CardDescription>
        </div>
        <Button size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Aturan
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID Aturan</TableHead>
              <TableHead>Deskripsi Pelanggaran</TableHead>
              <TableHead>Peraturan Perusahaan</TableHead>
              <TableHead className="w-[50px] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-mono text-xs">{rule.id}</TableCell>
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
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Hapus</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


export default function PengaturanPage() {
  return (
    <div className="space-y-6">
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
          <Card>
            <CardHeader>
              <CardTitle>Panduan Peraturan</CardTitle>
              <CardDescription>
                Kelola daftar peraturan perusahaan yang digunakan untuk membuat Surat Peringatan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
                    {Object.keys(mockRules).map((category, index) => (
                         <AccordionItem value={`item-${index}`} key={category}>
                            <AccordionTrigger className="text-lg font-medium">{category}</AccordionTrigger>
                            <AccordionContent>
                                <RulesTable rules={mockRules[category as RuleCategory]} category={category as RuleCategory} />
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

