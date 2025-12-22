
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
        <span className="font-sans">[{checked ? 'X' : '  '}]</span>
        <span>{label}</span>
    </div>
);


export function PrintableLeaveRequest({ request, requester, supervisor, leaveBalance }: PrintableLeaveRequestProps) {
    const formatDate = (date: Date) => format(date, "d MMMM yyyy", { locale: id });
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
        <div id="printable-container" className="bg-white text-black font-sans">
             <div data-printable-page="true" className="w-[210mm] min-h-[297mm] p-8 bg-white flex flex-col text-xs font-sans">
                {/* --- HEADER --- */}
                <header className="relative mt-4 mb-2">
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
                        <p className="font-bold text-base underline">FORM PERMOHONAN CUTI / IZIN / TUGAS KANTOR (FPCI)</p>
                    </div>
                </header>

                {/* --- EMPLOYEE INFO --- */}
                <table className="w-full mt-4 text-sm">
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
                        <span className="inline-block text-center font-semibold w-12 mx-2">{isLeave ? request.duration : ''}</span>
                        <span>Hari pada tanggal</span>
                        <span className="inline-block text-center font-semibold w-40 mx-2">{isLeave ? formatDate(startDate) : ''}</span>
                        <span>s.d</span>
                        <span className="inline-block text-center font-semibold w-40 ml-2">{isLeave ? formatDate(endDate) : ''}</span>
                    </div>
                     <div className="mt-1 ml-4 flex items-center">
                        <span>Pada saat saya cuti, saya dapat dihubungi di nomor telepon berikut :</span>
                        <span className="flex-grow text-center font-semibold ml-2">{isLeave ? request.contactPhone : ''}</span>
                    </div>
                    <div className="mt-2 ml-4">
                        <p>Catatan :</p>
                        <table className="mt-1 text-xs" style={{ borderSpacing: '0 2px', width: '320px' }}>
                            <tbody>
                                <tr>
                                    <td className="w-48">- Hak cuti Tahun {currentYear}</td>
                                    <td className="w-4 text-center">=</td>
                                    <td className="w-16 text-center">{isAnnualLeave ? annualLeaveQuota : ''}</td>
                                    <td className="pl-2">Hari</td>
                                </tr>
                                 <tr>
                                    <td className="w-48">- Cuti sudah diambil</td>
                                    <td className="w-4 text-center">=</td>
                                    <td className="w-16 text-center">{isAnnualLeave ? leaveAlreadyTaken : ''}</td>
                                    <td className="pl-2">Hari</td>
                                </tr>
                                <tr>
                                    <td className="w-48">- Sisa Cuti Tersedia</td>
                                    <td className="w-4 text-center pb-1">=</td>
                                    <td className="w-16 text-center pb-1">{isAnnualLeave ? remainingLeaveBeforeThis : ''}</td>
                                    <td className="pl-2">Hari</td>
                                </tr>
                                <tr>
                                    <td className="w-48">- Cuti Akan Diambil</td>
                                    <td className="w-4 text-center pt-1">=</td>
                                    <td className="w-16 text-center pt-1">{isAnnualLeave ? leaveToBeTaken : ''}</td>
                                    <td className="pl-2">Hari</td>
                                </tr>
                                 <tr>
                                    <td className="w-48">- Sisa Cuti Tahun {currentYear}</td>
                                    <td className="w-4 text-center pt-1 pb-1">=</td>
                                    <td className="w-16 text-center pt-1 pb-1">{isAnnualLeave ? finalRemainingLeave : ''}</td>
                                    <td className="pl-2">Hari</td>
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
                 </div>

                 {/* --- DUTY SECTION (III. TUGAS KANTOR) --- */}
                <div className="mt-2">
                    <p className="font-bold">III. TUGAS KANTOR (*)</p>
                    <div className="flex items-center gap-4 ml-4 mt-1">
                        <Checkbox checked={isDuty && request.dutyType === 'Sidak'} label="Sidak" />
                        <Checkbox checked={isDuty && request.dutyType === 'Training'} label="Training" />
                        <Checkbox checked={isDuty && request.dutyType === 'Tugas Lapangan'} label="Tugas Lapangan" />
                        <Checkbox checked={isDuty && request.dutyType === 'Kunjungan Customer'} label="Kunjungan Customer" />
                    </div>
                </div>

                <table className="w-full mt-2 text-xs">
                    <tbody>
                        <tr>
                            <td className="w-16">Hari, tgl</td>
                            <td className="w-2">:</td>
                            <td className="flex-grow">{!isLeave ? `${formatDate(startDate)} s.d ${formatDate(endDate)}` : '......................................................'}</td>
                        </tr>
                        <tr>
                            <td>Jam</td>
                            <td>:</td>
                            <td className="h-4">{!isLeave ? `${format(startDate, 'HH:mm')} s/d ${format(endDate, 'HH:mm')}`: '......................................................'}</td>
                        </tr>
                        <tr>
                            <td className="align-top">Ket.</td>
                            <td className="align-top">:</td>
                            <td className="h-4 align-top">{request.explanation || '......................................................'}</td>
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
                <div className="pt-4 text-xs">
                    <div>
                        <p className="font-bold underline">Note :</p>
                        <p>Untuk Permohonan Cuti di terima dan disetujui oleh HRD minimal 2 minggu sebelum hari H.</p>
                        <p>(*) Hanya untuk jabatan Leader/Supervisor atau setingkat</p>
                    </div>

                    <p className="mt-4">Gorontalo, {format(new Date(), 'd MMMM yyyy', { locale: id })}</p>
                    
                    <table className="w-full text-center text-xs mt-2">
                        <thead>
                            <tr>
                                <td className="p-1 w-1/3 font-semibold">Pemohon,</td>
                                <td className="p-1 w-1/3 font-semibold">Menyetujui,</td>
                                <td className="p-1 w-1/3 font-semibold">Mengetahui,</td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="h-16">
                                <td className="p-1 align-middle">
                                    {/* Signature area for applicant */}
                                </td>
                                <td className="p-1 align-middle">
                                     {/* Signature area for indirect supervisor */}
                                </td>
                                <td className="p-1 align-middle">
                                    {/* Signature area for direct supervisor */}
                                </td>
                            </tr>
                            <tr>
                                <td className="p-1 uppercase font-semibold">{request.employeeName}</td>
                                <td className="p-1 uppercase font-semibold">{supervisorName}</td>
                                <td className="p-1 uppercase font-semibold">{indirectSupervisorName}</td>
                            </tr>
                            <tr>
                                <td className="p-1 uppercase">{request.employeeJobTitle}</td>
                                <td className="p-1 uppercase">{supervisor?.jobTitle || ''}</td>
                                <td className="p-1 uppercase">Operation Point Coordinator</td>
                            </tr>

                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
