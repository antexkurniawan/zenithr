
'use client';

import { useState } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { PlusCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import type { Employee, LeaveRequest, UserProfile, RequestStatus } from "@/lib/types";
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AnimatedDialogContent } from "@/components/shared/animated-dialog";
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { NewLeaveRequestForm } from '@/components/cuti/new-leave-request-form';
import { Card, CardContent } from '@/components/ui/card';

const MotionCard = motion(Card);

const statusVariant: Record<RequestStatus, 'default' | 'secondary' | 'destructive'> = {
    'Pending': 'secondary',
    'Approved': 'default',
    'Rejected': 'destructive',
};

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return format(new Date(dateString), "d MMM yyyy", { locale: id });
};


export default function CutiPage() {
  const [isNewModalOpen, setNewModalOpen] = useState(false);
  
  const firestore = useFirestore();
  const { user } = useUser();

  const requestsCollection = useMemoFirebase(() => collection(firestore, 'leave_requests'), [firestore]);
  const requestsQuery = useMemoFirebase(() => query(requestsCollection, orderBy('createdAt', 'desc')), [requestsCollection]);
  const { data: requests, isLoading: isLoadingRequests } = useCollection<LeaveRequest>(requestsQuery);

  const employeesCollection = useMemoFirebase(() => collection(firestore, 'employees'), [firestore]);
  const employeesQuery = useMemoFirebase(() => query(employeesCollection, orderBy('name', 'asc')), [employeesCollection]);
  const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

  const columns: ColumnDef<LeaveRequest>[] = [
    {
      accessorKey: "employeeName",
      header: "Nama Pegawai",
    },
    {
      accessorKey: "requestType",
      header: "Jenis Permohonan",
    },
    {
      accessorKey: "startDate",
      header: "Tanggal Mulai",
      cell: ({ row }) => formatDate(row.original.startDate),
    },
     {
      accessorKey: "endDate",
      header: "Tanggal Selesai",
      cell: ({ row }) => formatDate(row.original.endDate),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant={statusVariant[row.original.status]}>{row.original.status}</Badge>,
    },
  ];

  const table = useReactTable({
    data: requests ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const isLoading = isLoadingRequests || isLoadingEmployees;

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
      <PageHeader title="Manajemen Cuti & Izin">
        <Dialog open={isNewModalOpen} onOpenChange={setNewModalOpen}>
            <DialogTrigger asChild>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="w-full sm:w-auto sm:ml-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Ajukan Permohonan
                </Button>
              </motion.div>
            </DialogTrigger>
            <AnimatedDialogContent open={isNewModalOpen} className="sm:max-w-2xl max-h-[90dvh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Form Permohonan Cuti / Izin / Tugas</DialogTitle>
                </DialogHeader>
                {isLoading ? (
                    <div className="flex justify-center items-center p-8">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : (
                    <NewLeaveRequestForm employees={employees ?? []} setModalOpen={setNewModalOpen} />
                )}
            </AnimatedDialogContent>
        </Dialog>
      </PageHeader>
      
      <MotionCard variants={itemVariants}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={columns.length}>
                         <Skeleton className="h-16 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      Belum ada data pengajuan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </MotionCard>
      
      <div className="flex items-center justify-end space-x-2 py-4">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Sebelumnya
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Selanjutnya
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
