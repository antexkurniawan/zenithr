
'use client';

import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Warning, UserProfile, WarningType } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { notFound } from 'next/navigation';
import React from 'react';
import Image from 'next/image';

// Helper function to get the full title of the warning letter
const getWarningTitle = (type: WarningType) => {
  switch (type) {
    case 'Teguran':
      return 'SURAT TEGURAN';
    case 'SP1':
      return 'SURAT PERINGATAN PERTAMA';
    case 'SP2':
      return 'SURAT PERINGATAN KEDUA';
    case 'SP3':
      return 'SURAT PERINGATAN KETIGA';
    default:
      return 'SURAT PERINGATAN';
  }
};

const getWarningName = (type: WarningType) => {
    switch (type) {
        case 'Teguran':
            return 'Surat Teguran';
        case 'SP1':
            return 'Surat Peringatan Pertama';
        case 'SP2':
            return 'Surat Peringatan Kedua';
        case 'SP3':
            return 'Surat Peringatan Ketiga';
        default:
            return 'Surat Peringatan';
    }
}

const getWarningDurationText = (type: WarningType) => {
    return type === 'Teguran' ? '3 (tiga)' : '6 (enam)';
}

const getConsequenceText = (type: WarningType) => {
  switch (type) {
    case 'Teguran':
      return 'maka perusahaan akan memberikan Surat Peringatan Pertama (SP1);';
    case 'SP1':
      return 'maka perusahaan akan memberikan Surat Peringatan Kedua (SP2);';
    case 'SP2':
      return 'maka perusahaan akan memberikan Surat Peringatan Ketiga (SP3);';
    case 'SP3':
      return 'maka perusahaan akan mempertimbangkan untuk melakukan Pemutusan Hubungan Kerja (PHK) sesuai dengan peraturan yang berlaku;';
    default:
      return 'maka perusahaan akan memberikan sanksi lebih lanjut sesuai peraturan yang berlaku;';
  }
};


// Export the component so it can be imported elsewhere
export function PrintableWarningLetter({ warning, fieldCoordinator }: { warning: Warning, fieldCoordinator?: UserProfile | null }) {
  const issueDate = new Date(warning.issueDate);
  const expiryDate = new Date(warning.expiryDate);

  const formatDateWithDay = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatDateShort = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }

  const formatDateExpiry = (date: Date) => {
     return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  const coordinatorName = fieldCoordinator?.name || '...';
  const coordinatorJobTitle = fieldCoordinator?.jobTitle || '...';
  const coordinatorSignatureUrl = fieldCoordinator?.signatureUrl;
  const warningTitle = getWarningTitle(warning.type);
  const warningName = getWarningName(warning.type);
  const warningDurationText = getWarningDurationText(warning.type);
  const consequenceText = getConsequenceText(warning.type);

  return (
    <div data-printable-page="true" id="printable-content" className="bg-white text-black min-h-screen p-12 font-sans text-sm">
      <div className="w-full max-w-4xl mx-auto">
        <header className="flex justify-end items-start mb-10">
          <div className="w-40 flex-shrink-0 text-right">
             <Image 
                src="/setra-logo.png" 
                alt="Setra Logo" 
                width={140} 
                height={50} 
                priority 
                style={{ width: '140px', height: 'auto', objectFit: 'contain' }}
             />
          </div>
        </header>

        <main>
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold underline uppercase">{warningTitle}</h1>
            <p className="text-sm">NOMOR : {warning.nomorSurat}</p>
          </div>

          <p className="mb-6">Setelah dilakukan penelitian ternyata bahwa :</p>
          
          <table className="mb-6 w-full text-left ml-4">
            <tbody>
              <tr>
                <td className="w-1/4 pb-1">Nama</td>
                <td className="w-auto pr-2 pb-1">:</td>
                <td className="w-3/4 font-semibold pb-1">{warning.employeeName.toUpperCase()}</td>
              </tr>
              <tr>
                <td className="pb-1">NIK</td>
                <td className="pr-2 pb-1">:</td>
                <td className="pb-1">{warning.employeeNik}</td>
              </tr>
              <tr>
                <td className="pb-1">Jabatan</td>
                <td className="pr-2 pb-1">:</td>
                <td className="pb-1">{warning.employeeJobTitle}</td>
              </tr>
              <tr>
                <td className="pb-1">Area Tugas</td>
                <td className="pr-2 pb-1">:</td>
                <td className="pb-1">{warning.employeeAreaTugas}</td>
              </tr>
            </tbody>
          </table>

          <p className="mb-6">Telah melakukan perbuatan atau serangkaian perbuatan sebagai berikut :</p>

          <table className="mb-6 w-full text-left ml-4">
             <tbody>
              <tr>
                <td className="w-1/4 align-top pb-1">Hari dan Tanggal</td>
                <td className="w-auto pr-2 align-top pb-1">:</td>
                <td className="w-3/4 pb-1">{formatDateWithDay(issueDate)}</td>
              </tr>
              <tr>
                <td className="align-top pb-1">Perbuatan</td>
                <td className="w-auto pr-2 align-top pb-1">:</td>
                <td className="w-3/4 align-top pb-1">{warning.description}</td>
              </tr>
            </tbody>
          </table>

          <p className="mb-4">
            Perbuatan tersebut telah secara jelas melanggar/bertentangan dengan ketentuan-ketentuan yang berlaku dalam perusahaan, seperti yang tersebut dalam Peraturan Perusahaan (PP), Perjanjian Kerja, SOP, maupun Instruksi/Ketentuan lainnya:
          </p>

          <p className="font-bold mb-4 ml-4">{warning.peraturanDilanggar}</p>

          <p className="mb-4">
            Maka dari pertimbangan tersebut Perusahaan memberikan {warningName} dengan Ketentuan Sebagai berikut :
          </p>

          <ul className="list-none mb-6 ml-8 space-y-2">
            <li className="flex"><span className="mr-2">➤</span>{warningName} ini akan berlaku {warningDurationText} bulan kedepan sejak diterbitkan (s/d {formatDateExpiry(expiryDate)});</li>
            <li className="flex"><span className="mr-2">➤</span>Apabila dalam masa berlaku {warningName} ini saudara didapati melakukan pelanggaran, {consequenceText}</li>
          </ul>

          <p className="mb-4">Berdasarkan hal di atas, Kami peringatkan Saudara untuk tidak melakukan lagi perbuatan-perbuatan yang melanggar Peraturan-peraturan / Tata tertib dan disiplin Perusahaan.</p>
          <p className="mb-8">Demikian agar peringatan ini mendapat perhatian Saudara.</p>

          <p className="mb-10">Berjanji akan mematuhi semua Peraturan dan Instruksi yang dikeluarkan oleh Perusahaan.</p>

          <div className="flex justify-between text-center">
            <div>
                <p>Yang Bersangkutan</p>
                <div className="h-16"></div>
                <p className="font-bold underline uppercase mb-1">{warning.employeeName.toUpperCase()}</p>
                <p className="text-sm">{warning.employeeJobTitle}</p>
            </div>
            <div>
                <p>Gorontalo, {formatDateShort(issueDate)}</p>
                 <div className="h-16 flex justify-center items-center">
                    {coordinatorSignatureUrl && <Image src={coordinatorSignatureUrl} alt="TTD Koordinator" width={120} height={60} className="object-contain" />}
                </div>
                <p className="font-bold underline uppercase mb-1">{coordinatorName}</p>
                <p className="text-sm">{coordinatorJobTitle}</p>
            </div>
        </div>

        </main>
      </div>
      <style jsx global>{`
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .no-print {
                display: none;
            }
        }
      `}</style>
    </div>
  );
}


export default function WarningPrintPage({ params }: { params: { id: string } }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const warningDocRef = useMemoFirebase(() => doc(firestore, 'warnings', params.id), [firestore, params.id]);
  const { data: warning, isLoading: isLoadingWarning } = useDoc<Warning>(warningDocRef);

  // This hook now fetches the profile of the LOGGED-IN user, who is the coordinator.
  const fieldCoordinatorProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: fieldCoordinator, isLoading: isLoadingCoordinator } = useDoc<UserProfile>(fieldCoordinatorProfileRef);

  const isLoading = isLoadingWarning || isLoadingCoordinator;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Mempersiapkan halaman cetak...</p>
      </div>
    );
  }

  if (!warning) {
    return notFound();
  }

  // This default export now renders the printable component, 
  // which is used both for display and for PDF generation.
  return <PrintableWarningLetter warning={warning} fieldCoordinator={fieldCoordinator} />;
}
