"use client";

import { useState } from 'react';
import { collection, writeBatch, serverTimestamp, doc } from 'firebase/firestore';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import Link from 'next/link';
import { MoreHorizontal, PlusCircle, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';


import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import type { Employee, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import PageHeader from '@/components/shared/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NewEmployeeForm } from '@/components/pegawai/new-employee-form';
import { ImportDialog } from '@/components/pegawai/import-dialog';
import { EditEmployeeForm } from '@/components/pegawai/edit-employee-form';
import { getAvatarColor, cn } from '@/lib/utils';

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export default function PegawaiPage() {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const firestore = useFirestore();
  const { user } = useUser();

  const employeesCollection = useMemoFirebase(() => collection(firestore, 'employees'), [firestore]);
  const { data: employees, isLoading } = useCollection<Employee>(employeesCollection);

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEditModalOpen(true);
  };
  
  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: "name",
      header: "Nama Pegawai",
      cell: ({ row }) => {
        const employee = row.original;
        const avatarColor = getAvatarColor(employee.name);
        return (
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className={cn(avatarColor, "text-primary-foreground font-bold")}>
                {employee.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <Link href={`/pegawai/${employee.id}`} className="font-medium hover:underline">{employee.name}</Link>
              <div className="text-sm text-muted-foreground">NIK: {employee.nik}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "jobTitle",
      header: "Jabatan",
    },
    {
      accessorKey: "areaTugas",
      header: "Area Tugas",
    },
    {
      accessorKey: "contractStartDate",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Awal Kontrak
          </Button>
        )
      },
      cell: ({ row }) => formatDate(row.getValue("contractStartDate")),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const employee = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Buka menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild><Link href={`/pegawai/${employee.id}`}>Lihat Profil</Link></DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditModal(employee)}>Edit</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">Non-aktifkan</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: employees ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 
        nik: '', 
        name: '', 
        jobTitle: 'Driver/Dispatcher/Checker/Field Coordinator', 
        areaTugas: userProfile?.workArea || '',
        contractStartDate: 'YYYY-MM-DD', 
        contractEndDate: 'YYYY-MM-DD' 
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'template_pegawai.xlsx');
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Database Pegawai">
        <div className="flex flex-col sm:flex-row gap-2 items-center w-full">
            <Input
              placeholder="Cari nama pegawai..."
              value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn("name")?.setFilterValue(event.target.value)
              }
              className="w-full sm:max-w-sm"
            />
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={handleDownloadTemplate} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Template
              </Button>
              <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </Button>
                </DialogTrigger>
                <ImportDialog setModalOpen={setIsImportModalOpen} />
              </Dialog>
              <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tambah
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Tambah Pegawai Baru</DialogTitle>
                  </DialogHeader>
                  <NewEmployeeForm setModalOpen={setIsNewModalOpen} />
                </DialogContent>
              </Dialog>
            </div>
        </div>
      </PageHeader>
      
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
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
                      Tidak ada data.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {selectedEmployee && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Edit Data Pegawai</DialogTitle>
                </DialogHeader>
                <EditEmployeeForm employee={selectedEmployee} setModalOpen={setIsEditModalOpen} />
            </DialogContent>
        </Dialog>
      )}

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Sebelumnya
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Selanjutnya
        </Button>
      </div>
    </div>
  );
}