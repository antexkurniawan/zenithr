import PageHeader from "@/components/shared/page-header";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

export default function LaporanPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pusat Laporan HR"
        description="Analisis dan unduh data penting untuk kebutuhan HR."
      />

      <Card>
        <CardContent className="p-10 text-center">
          <p className="text-muted-foreground">
            Fitur laporan sedang dalam tahap diskusi. Mari kita tentukan laporan apa saja yang perlu dibuat.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
