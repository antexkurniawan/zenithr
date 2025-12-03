import PageHeader from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { TurnoverChart } from "@/components/laporan/turnover-chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export default function LaporanPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pusat Laporan HR"
        description="Analisis dan unduh data penting untuk kebutuhan HR."
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Laporan Data Pegawai Lengkap</CardTitle>
            <CardDescription>
              Unduh data master seluruh pegawai dalam format Excel/CSV.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4 items-center">
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="Aktif">Aktif</SelectItem>
                <SelectItem value="Resign">Resign</SelectItem>
              </SelectContent>
            </Select>
            <Select disabled>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter Departemen" />
              </SelectTrigger>
            </Select>
            <Button className="w-full sm:w-auto sm:ml-auto">
              <Download className="mr-2 h-4 w-4" /> Download Excel
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Laporan Rekapitulasi Surat Peringatan</CardTitle>
            <CardDescription>
              Lihat rekapitulasi SP dalam rentang waktu tertentu.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4 items-center">
            <Select defaultValue="all-types">
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Jenis SP" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-types">Semua Jenis</SelectItem>
                <SelectItem value="SP1">SP1</SelectItem>
                <SelectItem value="SP2">SP2</SelectItem>
                <SelectItem value="SP3">SP3</SelectItem>
                <SelectItem value="Teguran">Teguran</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:ml-auto">
              <Button className="w-full" variant="secondary">
                <Printer className="mr-2 h-4 w-4" /> Print
              </Button>
              <Button className="w-full">
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Laporan Tingkat Turn-over</CardTitle>
            <CardDescription>
              Grafik perbandingan jumlah pegawai masuk dan keluar per bulan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <Select defaultValue="2023">
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Pilih Tahun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
              </SelectContent>
            </Select>
            <Separator />
            <div className="h-[350px] w-full">
              <TurnoverChart />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
