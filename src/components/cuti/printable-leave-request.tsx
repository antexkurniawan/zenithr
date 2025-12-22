'use client';

import React from 'react';
import Image from 'next/image';
import { format, getYear } from 'date-fns';
import { id } from 'date-fns/locale';

import { LeaveRequest, UserProfile } from '@/lib/types';
import { setraLogoBase64 } from '@/lib/logo-images';
import { cn } from '@/lib/utils';

interface PrintableLeaveRequestProps {
    request: LeaveRequest;
    requester: UserProfile | null;
    supervisor: UserProfile | null; // Atasan Langsung
    leaveBalance: { used: number, remaining: number } | null;
}

const Checkbox = ({ checked, label }: { checked: boolean, label: string }) => (
    <div className="flex items-baseline gap-1">
        <span className="font-mono">[{checked ? 'X' : ' '}]</span>
        <span>{label}</span>
    </div>
);


export function PrintableLeaveRequest({ request, requester, supervisor, leaveBalance }: PrintableLeaveRequestProps) {
    const formatDate = (date: Date) => format(date, "d MMM yyyy", { locale: id });
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    const currentYear = getYear(new Date());

    const isLeave = request.requestType === 'Cuti';
    const isPermit = request.requestType === 'Izin';
    const isDuty = request.requestType === 'Tugas Kantor';

    const supervisorName = supervisor?.name || '';
    const indirectSupervisorName = supervisor?.operationPointCoordinatorName || '';
    
    const isAnnualLeave = isLeave && request.leaveType === 'Tahunan';
    const annualLeaveQuota = 12;

    const leaveAlreadyTaken = leaveBalance?.used || 0;
    const remainingLeaveBeforeThis = annualLeaveQuota - leaveAlreadyTaken;
    const leaveToBeTaken = isAnnualLeave ? (request.duration || 0) : 0;
    const finalRemainingLeave = remainingLeaveBeforeThis - leaveToBeTaken;

    return (
        <div id="printable-container" className="bg-white text-black font-serif">
             <div data-printable-page="true" className="w-[210mm] min-h-[297mm] p-10 bg-white flex flex-col text-xs">
                {/* --- HEADER --- */}
                <header className="relative mb-2">
                    <div className="absolute left-0 top-0 w-32">
                         <Image 
                            src={setraLogoBase64} 
                            alt="Setra Logo" 
                            width={110} 
                            height={40} 
                            priority 
                         />
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-sm underline">FORM PERMOHONAN CUTI / IZIN / TUGAS KANTOR (FPCI)</p>
                    </div>
                </header>

                {/* --- EMPLOYEE INFO --- */}
                <table className="w-full mt-4 text-xs">
                    <tbody>
                        <tr>
                            <td className="w-24">NAMA</td>
                            <td className="w-4">:</td>
                            <td className="font-semibold">{request.employeeName}</td>
                            <td className="w-32 text-left">WILAYAH OPERASI</td>
                            <td className="w-4">:</td>
                            <td className="w-48 font-semibold">{supervisor?.workArea || ''}</td>
                        </tr>
                         <tr>
                            <td>JABATAN</td>
                            <td>:</td>
                            <td className="font-semibold">{request.employeeJobTitle}</td>
                        </tr>
                    </tbody>
                </table>
                
                <p className="mt-4">Dengan ini mengajukan permohonan :</p>

                {/* --- LEAVE SECTION (I. CUTI) --- */}
                <div className="mt-2">
                    <p className="font-bold">I. CUTI</p>
                    <div className="flex items-center gap-4 ml-4 mt-1">
                        <Checkbox checked={isLeave && request.leaveType === 'Tahunan'} label="Tahunan" />
                        <Checkbox checked={isLeave && request.leaveType === 'Besar'} label="Besar" />
                        <Checkbox checked={isLeave && request.leaveType === 'Hamil/Keguguran'} label="Hamil/Keguguran" />
                    </div>
                    <div className="mt-1 ml-4 flex items-center">
                        <span>Selama</span>
                        <span className="inline-block text-center font-semibold border-b border-dotted border-black w-12 mx-2">{isLeave ? request.duration : ''}</span>
                        <span>Hari pada tanggal</span>
                        <span className="inline-block text-center font-semibold border-b border-dotted border-black w-24 mx-2">{isLeave ? formatDate(startDate) : ''}</span>
                        <span>s.d</span>
                        <span className="inline-block text-center font-semibold border-b border-dotted border-black w-24 ml-2">{isLeave ? formatDate(endDate) : ''}</span>
                    </div>
                     <div className="mt-1 ml-4 flex items-center">
                        <span>Pada saat saya cuti, saya dapat dihubungi di nomor telepon berikut :</span>
                        <span className="flex-grow text-center font-semibold border-b border-dotted border-black ml-2">{isLeave ? request.contactPhone : ''}</span>
                    </div>
                    <div className="mt-2 ml-4">
                        <p>Catatan :</p>
                         <table className="mt-1 text-xs ml-4">
                            <tbody>
                                <tr>
                                    <td className="w-48">- Cuti tersisa Tahun sebelumnya</td>
                                    <td>=</td>
                                    <td className="w-16 text-center border-b border-dotted border-black">...</td>
                                    <td>Hari</td>
                                </tr>
                                <tr>
                                    <td className="w-48">- Hak cuti Tahun {currentYear}</td>
                                    <td>=</td>
                                    <td className="w-16 text-center border-b border-dotted border-black">{annualLeaveQuota}</td>
                                    <td>Hari</td>
                                </tr>
                                <tr>
                                    <td className="pl-4">Cuti sudah diambil</td>
                                    <td>=</td>
                                    <td className="w-16 text-center border-b border-dotted border-black">{isAnnualLeave ? leaveAlreadyTaken : ''}</td>
                                    <td>Hari</td>
                                </tr>
                                 <tr>
                                    <td className="pl-4">Cuti Akan Diambil</td>
                                    <td>=</td>
                                    <td className="w-16 text-center border-b border-dotted border-black">{leaveToBeTaken}</td>
                                    <td>Hari</td>
                                </tr>
                                 <tr>
                                    <td className="pl-4 border-t-2 border-black">- Sisa Cuti Tahun {currentYear}</td>
                                    <td className='border-t-2 border-black'>=</td>
                                    <td className="w-16 text-center border-b border-dotted border-t-2 border-black">{isAnnualLeave ? finalRemainingLeave : ''}</td>
                                    <td className='border-t-2 border-black'>Hari</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                 {/* --- PERMIT SECTION (II. IJIN) --- */}
                 <div className="mt-4">
                    <p className="font-bold">II. IZIN</p>
                    <div className="flex items-center gap-4 ml-4 mt-1">
                         <Checkbox checked={isPermit && request.permitType === 'Haid'} label="Haid" />
                         <Checkbox checked={isPermit && request.permitType === 'Terlambat Masuk Kantor'} label="Terlambat Masuk Kantor" />
                         <Checkbox checked={isPermit && request.permitType === 'Meninggalkan Kantor'} label="Meninggalkan Kantor" />
                         <Checkbox checked={isPermit && request.permitType === 'Lainnya'} label="Lainnya :" />
                    </div>
                    <div className="mt-1 ml-4 flex items-center">
                        <span>Izin ini diberikan dengan ketentuan :</span>
                        <div className="flex items-center gap-2 ml-4">
                            <Checkbox checked={isPermit && request.deductLeave === false} label="Bebas" />
                            <Checkbox checked={isPermit && request.deductLeave === true} label="Potong Cuti Tahunan" />
                        </div>
                    </div>
                 </div>

                 {/* --- DUTY SECTION (III. TUGAS KANTOR) --- */}
                <div className="mt-4">
                    <p className="font-bold">III. TUGAS KANTOR (*)</p>
                    <div className="flex items-center gap-4 ml-4 mt-1">
                        <Checkbox checked={isDuty && request.dutyType === 'Sidak'} label="Sidak" />
                        <Checkbox checked={isDuty && request.dutyType === 'Training'} label="Training" />
                        <Checkbox checked={isDuty && request.dutyType === 'Tugas Lapangan'} label="Tugas Lapangan" />
                        <Checkbox checked={isDuty && request.dutyType === 'Kunjungan Customer'} label="Kunjungan Customer" />
                    </div>
                </div>

                <table className="w-full mt-2 text-xs ml-4">
                    <tbody>
                        <tr>
                            <td className="w-16">Hari, tgl</td>
                            <td className="w-2">:</td>
                            <td className="flex-grow border-b border-dotted border-black">{!isLeave ? `${formatDate(startDate)} s.d ${formatDate(endDate)}` : ''}</td>
                        </tr>
                        <tr>
                            <td>Jam</td>
                            <td>:</td>
                            <td className="border-b border-dotted border-black h-4">{!isLeave ? `${format(startDate, 'HH:mm')} s/d ${format(endDate, 'HH:mm')}`: ''}</td>
                        </tr>
                        <tr>
                            <td className="align-top">Ket.</td>
                            <td className="align-top">:</td>
                            <td className="border-b border-dotted border-black h-4 align-top">{request.explanation || ''}</td>
                        </tr>
                    </tbody>
                </table>
                 <div className="mt-1 ml-4 flex items-center">
                    <span>Izin ini diberikan dengan ketentuan :</span>
                    <div className="flex items-center gap-2 ml-4">
                        <Checkbox checked={isPermit && request.deductLeave === false} label="Bebas" />
                        <Checkbox checked={isPermit && request.deductLeave === true} label="Potong Cuti Tahunan" />
                    </div>
                </div>
                
                 {/* --- NOTES & SIGNATURES --- */}
                <footer className="mt-auto pt-4 text-xs">
                    <div>
                        <p className="font-bold underline">Note :</p>
                        <p>Untuk Permohonan Cuti di terima dan disetujui oleh HRD minimal 2 minggu sebelum hari H.</p>
                        <p>(*) Hanya untuk jabatan Leader/Supervisor atau setingkat</p>
                    </div>

                    <p className="mt-4">Gorontalo, .................................... 20....</p>
                    
                    <table className="w-full border-collapse border border-black text-center text-xs mt-2">
                        <thead>
                            <tr>
                                <td className="border border-black p-1 w-1/3">Pemohon,</td>
                                <td className="border border-black p-1 w-1/3">Mengetahui,</td>
                                <td className="border border-black p-1 w-1/3">Menyetujui,</td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="h-16">
                                <td className="border border-black p-1 align-middle">
                                    {/* Signature area for applicant */}
                                </td>
                                <td className="border border-black p-1 align-middle">
                                     {/* Signature area for indirect supervisor */}
                                </td>
                                <td className="border border-black p-1 align-middle">
                                    {/* Signature area for direct supervisor */}
                                </td>
                            </tr>
                            <tr>
                                <td className="border-x border-black p-1 font-semibold uppercase">Nama</td>
                                <td className="border-x border-black p-1 font-semibold uppercase">Nama</td>
                                <td className="border-x border-black p-1 font-semibold uppercase">Nama</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 font-semibold uppercase">Jabatan</td>
                                <td className="border border-black p-1 font-semibold uppercase">Jabatan</td>
                                <td className="border border-black p-1 font-semibold uppercase">Jabatan</td>
                            </tr>
                        </tbody>
                    </table>
                </footer>
            </div>
        </div>
    );
}
