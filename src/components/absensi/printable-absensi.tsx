
'use client';

import React from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

import { blogLogoBase64, setraLogoBase64 } from '@/lib/logo-images';

type AttendanceSummary = {
  employeeId: string;
  employeeName: string;
  employeeNik: string;
  employeeJobTitle: string;
  hadir: number;
  sakit: number;
  izin: number;
  alpha: number;
  cuti: number;
};

interface PrintableAbsensiProps {
    data: AttendanceSummary[];
    period?: DateRange;
}

export function PrintableAbsensi({ data, period }: PrintableAbsensiProps) {
    const formatDate = (date: Date) => format(date, "d MMMM yyyy", { locale: id });
    const periodString = period?.from 
        ? `${formatDate(period.from)}${period.to ? ` - ${formatDate(period.to)}` : ''}`
        : 'Semua Waktu';
    
    return (
        <div id="printable-container" className="bg-white text-black font-sans">
             <div data-printable-page="true" className="w-[210mm] min-h-[297mm] p-8 bg-white flex flex-col font-sans text-sm">
                <header className="mb-4">
                    <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-2">
                            <div className="w-40 flex-shrink-0">
                            <Image 
                                src={setraLogoBase64} 
                                alt="Setra Logo" 
                                width={140} 
                                height={50} 
                                priority 
                                style={{ width: '140px', height: 'auto', objectFit: 'contain' }}
                            />
                        </div>
                        <h1 className="text-lg font-bold text-center uppercase">Rekapitulasi Absensi</h1>
                            <div className="w-40 flex-shrink-0 flex justify-end">
                            <Image 
                                src={blogLogoBase64} 
                                alt="B-LOG Logo" 
                                width={100} 
                                height={34} 
                                priority 
                                style={{ width: '100px', height: 'auto', objectFit: 'contain' }}
                            />
                        </div>
                    </div>
                    <div className="text-center font-semibold">
                        PERIODE: {periodString}
                    </div>
                </header>
                
                <main className="flex-grow flex flex-col">
                    <table className="w-full border-collapse border border-black text-center text-[9px]">
                         <thead className="bg-gray-100">
                            <tr>
                                <th className="border border-black p-1 text-xs w-[4%]">NO</th>
                                <th className="border border-black p-1 text-xs w-[12%]">NIK</th>
                                <th className="border border-black p-1 text-xs w-[30%]">NAMA LENGKAP</th>
                                <th className="border border-black p-1 text-xs w-[20%]">JABATAN</th>
                                <th className="border border-black p-1 text-xs w-[6.8%]">HADIR</th>
                                <th className="border border-black p-1 text-xs w-[6.8%]">SAKIT</th>
                                <th className="border border-black p-1 text-xs w-[6.8%]">IZIN</th>
                                <th className="border border-black p-1 text-xs w-[6.8%]">ALPHA</th>
                                <th className="border border-black p-1 text-xs w-[6.8%]">CUTI</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, index) => (
                                <tr key={item.employeeId}>
                                    <td className="border border-black p-1">{index + 1}</td>
                                    <td className="border border-black p-1">{item.employeeNik}</td>
                                    <td className="border border-black p-1 text-left">{item.employeeName}</td>
                                    <td className="border border-black p-1 text-left">{item.employeeJobTitle}</td>
                                    <td className="border border-black p-1">{item.hadir}</td>
                                    <td className="border border-black p-1">{item.sakit}</td>
                                    <td className="border border-black p-1">{item.izin}</td>
                                    <td className="border border-black p-1">{item.alpha}</td>
                                    <td className="border border-black p-1">{item.cuti}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </main>

                <footer className="mt-auto pt-8">
                    <div className="flex justify-end text-center text-xs">
                        <div className="w-1/3">
                            <p>Gorontalo, {format(new Date(), 'd MMMM yyyy', { locale: id })}</p>
                            <p className="font-semibold">Dibuat Oleh,</p>
                            <div className="h-20"></div>
                            <p className="font-semibold underline uppercase">____________________</p>
                            <p>(HRD)</p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}

