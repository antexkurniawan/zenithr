
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

const Checkbox = ({ checked }: { checked: boolean }) => (
    <div className="w-4 h-4 border border-black flex items-center justify-center bg-white">
        {checked && <span className="font-bold text-xs">X</span>}
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

    // Calculate leave details for the notes section
    const isAnnualLeave = isLeave && request.leaveType === 'Tahunan';
    const hakCuti = 12;
    const cutiAkanDiambil = isAnnualLeave ? (request.duration || 0) : 0;
    const cutiSudahDiambil = (leaveBalance?.used || 0);
    const sisaCuti = isAnnualLeave ? leaveBalance?.remaining : (leaveBalance?.remaining ?? hakCuti) + cutiAkanDiambil;
    const cutiTersisaSebelumnya = sisaCuti + cutiAkanDiambil;

    return (
        <div id="printable-container" className="bg-white text-black font-serif">
             <div data-printable-page="true" className="w-[210mm] min-h-[297mm] p-8 bg-white flex flex-col text-xs">
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
                    <div className="absolute right-0 top-0 border border-black w-60">
                        <div className="flex">
                            <div className="p-1 border-r border-black w-2/5 text-center">Doc No:</div>
                            <div className="p-1 text-center w-3/5">F07/OPR/VI/2015, Rev.0</div>
                        </div>
                    </div>
                    <div className="text-center font-bold text-base mt-12 border-2 border-black p-1">
                        FORM PERMOHONAN CUTI / IJIN / TUGAS KANTOR ( FPCI )
                    </div>
                </header>

                {/* --- EMPLOYEE INFO --- */}
                <table className="w-full mt-4 text-xs">
                    <tbody>
                        <tr>
                            <td className="w-24">NAMA</td>
                            <td className="w-4">:</td>
                            <td className="font-semibold">{request.employeeName}</td>
                            <td className="w-32 text-right pr-2">Wilayah Operation</td>
                            <td className="w-4">:</td>
                            <td className="w-48 font-semibold">{supervisor?.workArea || ''}</td>
                        </tr>
                         <tr>
                            <td>JABATAN</td>
                            <td>:</td>
                            <td className="font-semibold">{request.employeeJobTitle}</td>
                        </tr>
                         <tr>
                            <td>DEPT</td>
                            <td>:</td>
                            <td className="font-semibold">OPERASIONAL</td>
                        </tr>
                    </tbody>
                </table>
                
                <p className="mt-4">Dengan ini mengajukan permohonan :</p>

                {/* --- LEAVE SECTION (I. CUTI) --- */}
                <div className="mt-2">
                    <p className="font-bold">I. CUTI</p>
                    <div className="ml-8 mt-1 space-y-1">
                        <div className="flex items-center gap-2"><Checkbox checked={isLeave && request.leaveType === 'Tahunan'} /> Tahunan</div>
                        <div className="flex items-center gap-2"><Checkbox checked={isLeave && request.leaveType === 'Besar'} /> Besar</div>
                        <div className="flex items-center gap-2"><Checkbox checked={isLeave && request.leaveType === 'Hamil/Keguguran'} /> Hamil / Keguguran</div>
                    </div>
                    <table className="w-full mt-2 text-xs">
                        <tbody>
                            <tr>
                                <td className="w-16">Selama</td>
                                <td className="w-20 text-center font-semibold">{isLeave ? request.duration : ''}</td>
                                <td>hari pada tanggal / bulan / tahun</td>
                                <td className="w-40 text-center font-semibold">{isLeave ? formatDate(startDate) : ''}</td>
                                <td className="px-2">s/d</td>
                                <td className="w-40 text-center font-semibold">{isLeave ? formatDate(endDate) : ''}</td>
                            </tr>
                        </tbody>
                    </table>
                     <table className="w-full mt-2 text-xs">
                        <tbody>
                            <tr>
                                <td className="w-48">Pada saat cuti, saya dapat dihubungi di nomor telepon</td>
                                <td className="w-4">:</td>
                                <td className="font-semibold">{isLeave && request.contactAddress === 'Dalam Kota' ? request.contactPhone : ''}</td>
                                <td className="w-20 text-right pr-2">Luar Kota</td>
                                <td className="w-4">:</td>
                                <td className="w-48 font-semibold">{isLeave && request.contactAddress === 'Luar Kota' ? request.contactPhone : ''}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div className="mt-2 pl-4">
                        <p className="font-semibold">Catatan :</p>
                         <table className="w-[350px] mt-1 text-xs">
                            <tbody>
                                <tr>
                                    <td className="w-48 pl-4">Cuti tersisa Tahun ({currentYear})</td>
                                    <td className="w-4">=</td>
                                    <td className="w-20 text-right pr-1">{isAnnualLeave ? cutiTersisaSebelumnya : '-'}</td>
                                    <td>Hari</td>
                                </tr>
                                <tr>
                                    <td className="pl-4">Hak Cuti Tahun ({currentYear})</td>
                                    <td>=</td>
                                    <td className="text-right pr-1">{hakCuti}</td>
                                    <td>Hari</td>
                                </tr>
                                <tr>
                                    <td className="pl-4">Cuti sudah diambil</td>
                                    <td>=</td>
                                    <td className="w-20 text-right pr-1">{cutiSudahDiambil}</td>
                                    <td>Hari</td>
                                </tr>
                                 <tr className="h-2"><td></td></tr>
                                 <tr>
                                    <td className="pl-4">Cuti akan diambil</td>
                                    <td>=</td>
                                    <td className="w-20 text-right pr-1">{cutiAkanDiambil}</td>
                                    <td>Hari</td>
                                </tr>
                                 <tr>
                                    <td className="pl-4 border-t border-black">Sisa Cuti Tahun ({currentYear})</td>
                                    <td className='border-t border-black'>=</td>
                                    <td className="w-20 text-right pr-1 border-t border-black">{sisaCuti}</td>
                                    <td className='border-t border-black'>Hari</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                 {/* --- PERMIT SECTION (II. IJIN) --- */}
                 <div className="mt-4">
                    <p className="font-bold">II. IJIN</p>
                    <div className="ml-8 mt-1 grid grid-cols-3">
                         <div className="flex items-center gap-2"><Checkbox checked={isPermit && request.permitType === 'Haid'} /> Haid</div>
                         <div className="flex items-center gap-2"><Checkbox checked={isPermit && request.permitType === 'Terlambat Masuk Kantor'} /> Terlambat Masuk Kantor</div>
                         <div className="flex items-center gap-2"><Checkbox checked={isPermit && request.permitType === 'Meninggalkan Kantor'} /> Meninggalkan Kantor</div>
                         <div className="flex items-center gap-2"><Checkbox checked={isPermit && request.permitType === 'Lainnya'} /> Lainnya</div>
                    </div>
                 </div>

                 {/* --- DUTY SECTION (III. TUGAS KANTOR) --- */}
                <div className="mt-2">
                    <p className="font-bold">III. TUGAS KANTOR</p>
                    <div className="ml-8 mt-1 grid grid-cols-3">
                        <div className="flex items-center gap-2"><Checkbox checked={isDuty && request.dutyType === 'Sidak'} /> Sidak</div>
                        <div className="flex items-center gap-2"><Checkbox checked={isDuty && request.dutyType === 'Tugas Lapangan'} /> Tugas Lapangan</div>
                        <div className="flex items-center gap-2"><Checkbox checked={isDuty && request.dutyType === 'Training'} /> Training</div>
                        <div className="flex items-center gap-2"><Checkbox checked={isDuty && request.dutyType === 'Kunjungan Customer'} /> Kunjungan Customer</div>
                    </div>
                </div>

                <table className="w-full mt-2 text-xs">
                    <tbody>
                        <tr>
                            <td className="w-20">Hari, Tanggal</td>
                            <td className="w-4">:</td>
                            <td className="w-48 font-semibold">{!isLeave ? formatDate(startDate) : ''}</td>
                            <td className="px-2">s/d</td>
                            <td className="w-48 font-semibold">{!isLeave ? formatDate(endDate) : ''}</td>
                            <td></td>
                        </tr>
                        <tr>
                            <td>Jam</td>
                            <td>:</td>
                            <td colSpan={4} className="font-semibold">{!isLeave ? `${format(startDate, 'HH:mm')} s/d ${format(endDate, 'HH:mm')}`: ''}</td>
                        </tr>
                        <tr>
                            <td className="align-top">Penjelasan</td>
                            <td className="align-top">:</td>
                            <td colSpan={4} className="h-8 align-top font-semibold">{request.explanation || ''}</td>
                        </tr>
                    </tbody>
                </table>
                
                <table className="w-full mt-4 text-xs">
                    <tbody>
                        <tr>
                            <td className="w-48">Saya dapat dihubungi di nomor telepon</td>
                            <td className="w-4">:</td>
                            <td className="font-semibold">{!isLeave ? request.contactPhone : ''}</td>
                        </tr>
                    </tbody>
                </table>

                <div className="flex items-center gap-8 mt-2">
                    <span>Ijin ini diberikan dengan ketentuan :</span>
                    <div className="flex items-center gap-2"><Checkbox checked={request.deductLeave === false} /> Bebas</div>
                    <div className="flex items-center gap-2"><Checkbox checked={request.deductLeave === true} /> Potong Cuti</div>
                </div>
                
                 {/* --- SIGNATURES --- */}
                <footer className="mt-auto pt-4">
                    <table className="w-full border-collapse border border-black text-center text-xs">
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
                                    {requester?.signatureUrl && <Image src={requester.signatureUrl} alt="TTD Pemohon" width={100} height={50} className="mx-auto object-contain" />}
                                </td>
                                <td className="border border-black p-1 align-middle">
                                     {request.status !== 'Pending' && supervisor?.operationPointCoordinatorSignatureUrl && <Image src={supervisor.operationPointCoordinatorSignatureUrl} alt="TTD Atasan" width={100} height={50} className="mx-auto object-contain" />}
                                </td>
                                <td className="border border-black p-1 align-middle">
                                    {request.status === 'Approved' && supervisor?.signatureUrl && <Image src={supervisor.signatureUrl} alt="TTD Atasan" width={100} height={50} className="mx-auto object-contain" />}
                                </td>
                            </tr>
                            <tr className="bg-gray-100">
                                <td className="border border-black p-1 font-semibold">{request.employeeName}</td>
                                <td className="border border-black p-1 font-semibold">{indirectSupervisorName}</td>
                                <td className="border border-black p-1 font-semibold">{supervisorName}</td>
                            </tr>
                        </tbody>
                    </table>
                </footer>
            </div>
        </div>
    );
}
