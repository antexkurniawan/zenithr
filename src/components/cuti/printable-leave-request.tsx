
'use client';

import React from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
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
    <div className="w-4 h-4 border border-black flex items-center justify-center">
        {checked && <span className="font-bold text-xs">X</span>}
    </div>
);


export function PrintableLeaveRequest({ request, requester, supervisor, leaveBalance }: PrintableLeaveRequestProps) {
    const formatDate = (date: Date) => format(date, "d MMMM yyyy", { locale: id });
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);

    const isLeave = request.requestType === 'Cuti';
    const isPermit = request.requestType === 'Izin';
    const isDuty = request.requestType === 'Tugas Kantor';

    const supervisorName = supervisor?.name || '........................';
    const indirectSupervisorName = supervisor?.operationPointCoordinatorName || '........................';

    return (
        <div id="printable-container" className="bg-white text-black font-sans">
             <div data-printable-page="true" className="w-[210mm] min-h-[297mm] p-8 bg-white flex flex-col font-serif text-xs">
                {/* --- HEADER --- */}
                <header className="relative">
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
                            <td className="border-b border-dotted border-black">{request.employeeName}</td>
                            <td className="w-32 text-right pr-2">Wilayah Operation</td>
                            <td className="w-4">:</td>
                            <td className="w-48 border-b border-dotted border-black">{supervisor?.workArea || ''}</td>
                        </tr>
                         <tr>
                            <td>JABATAN</td>
                            <td>:</td>
                            <td className="border-b border-dotted border-black">{request.employeeJobTitle}</td>
                        </tr>
                         <tr>
                            <td>DEPT</td>
                            <td>:</td>
                            <td className="border-b border-dotted border-black">OPERASIONAL</td>
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
                                <td className="w-20 border-b border-dotted border-black text-center">{isLeave ? request.duration : '.....'}</td>
                                <td>hari pada tanggal / bulan / tahun</td>
                                <td className="w-40 border-b border-dotted border-black text-center">{isLeave ? formatDate(startDate) : '..............................'}</td>
                                <td className="px-2">s/d</td>
                                <td className="w-40 border-b border-dotted border-black text-center">{isLeave ? formatDate(endDate) : '..............................'}</td>
                            </tr>
                        </tbody>
                    </table>
                     <table className="w-full mt-2 text-xs">
                        <tbody>
                            <tr>
                                <td className="w-48">Pada saat cuti, saya dapat dihubungi di nomor telepon</td>
                                <td className="w-4">:</td>
                                <td className="border-b border-dotted border-black"></td>
                            </tr>
                            <tr>
                                <td>Dalam Kota</td>
                                <td className="w-4">:</td>
                                <td className="border-b border-dotted border-black">{request.contactAddress === 'Dalam Kota' ? request.contactPhone : '..............................'}</td>
                                <td className="w-20 text-right pr-2">Luar Kota</td>
                                <td className="w-4">:</td>
                                <td className="w-48 border-b border-dotted border-black">{request.contactAddress === 'Luar Kota' ? request.contactPhone : '..............................'}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div className="mt-2 pl-4">
                        <p>Catatan :</p>
                         <table className="w-full mt-1 text-xs">
                            <tbody>
                                <tr>
                                    <td className="w-24 pl-4">Cuti tersisa tahun</td>
                                    <td className="w-32 border-b border-dotted border-black"></td>
                                    <td className="w-4">=</td>
                                    <td className="w-20 border-b border-dotted border-black text-right pr-1">{(leaveBalance?.remaining ?? 0) + (request.duration ?? 0)}</td>
                                    <td>Hari</td>
                                </tr>
                                <tr>
                                    <td className="pl-4">Hak Cuti tahun</td>
                                    <td className="border-b border-dotted border-black"></td>
                                    <td>=</td>
                                    <td className="border-b border-dotted border-black text-right pr-1">12</td>
                                    <td>Hari</td>
                                </tr>
                                <tr>
                                    <td className="pl-4">Cuti sudah diambil</td>
                                    <td className="border-b border-dotted border-black"></td>
                                    <td>=</td>
                                    <td className="w-20 border-b border-dotted border-black text-right pr-1">{leaveBalance?.used ?? 0}</td>
                                    <td>Hari</td>
                                </tr>
                                 <tr className="h-4"><td></td></tr>
                                 <tr>
                                    <td className="pl-4">Cuti akan diambil</td>
                                    <td className="border-b border-dotted border-black"></td>
                                    <td>=</td>
                                    <td className="w-20 border-b border-dotted border-black text-right pr-1">{isLeave && request.leaveType === 'Tahunan' ? request.duration : 0}</td>
                                    <td>Hari</td>
                                </tr>
                                <tr>
                                    <td className="pl-4">Sisa Cuti tahun</td>
                                    <td className="border-b border-dotted border-black"></td>
                                    <td>=</td>
                                    <td className="w-20 border-b border-dotted border-black text-right pr-1">{isLeave && request.leaveType === 'Tahunan' ? leaveBalance?.remaining : (leaveBalance?.remaining ?? 0) + (request.duration ?? 0)}</td>
                                    <td>Hari</td>
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
                         <div className="flex items-center gap-2"><Checkbox checked={isPermit && request.permitType === 'Lainnya'} /> Lainnya : .....................</div>
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
                            <td className="w-48 border-b border-dotted border-black">{!isLeave ? formatDate(startDate) : ''}</td>
                            <td className="px-2">s/d</td>
                            <td className="w-48 border-b border-dotted border-black">{!isLeave ? formatDate(endDate) : ''}</td>
                            <td></td>
                        </tr>
                        <tr>
                            <td>Jam</td>
                            <td>:</td>
                            <td colSpan={4} className="border-b border-dotted border-black">{!isLeave ? `${format(startDate, 'HH:mm')} s/d ${format(endDate, 'HH:mm')}`: ''}</td>
                        </tr>
                        <tr>
                            <td className="align-top">Penjelasan</td>
                            <td className="align-top">:</td>
                            <td colSpan={4} className="border-b border-dotted border-black h-8 align-top">{request.explanation || ''}</td>
                        </tr>
                    </tbody>
                </table>
                
                <table className="w-full mt-4 text-xs">
                    <tbody>
                        <tr>
                            <td className="w-48">Saya dapat dihubungi di nomor telepon</td>
                            <td className="w-4">:</td>
                            <td className="border-b border-dotted border-black text-center">{!isLeave ? request.contactPhone : ''}</td>
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
                                    {request.status !== 'Pending' && supervisor?.signatureUrl && <Image src={supervisor.signatureUrl} alt="TTD Atasan" width={100} height={50} className="mx-auto object-contain" />}
                                </td>
                                <td className="border border-black p-1 align-middle">
                                     {request.status === 'Approved' && supervisor?.operationPointCoordinatorSignatureUrl && <Image src={supervisor.operationPointCoordinatorSignatureUrl} alt="TTD Atasan" width={100} height={50} className="mx-auto object-contain" />}
                                </td>
                            </tr>
                            <tr className="bg-gray-100">
                                <td className="border border-black p-1">{request.employeeName}</td>
                                <td className="border border-black p-1">Atasan Langsung <br/> ({supervisorName})</td>
                                <td className="border border-black p-1">Atasan Tidak Langsung <br/> ({indirectSupervisorName})</td>
                            </tr>
                        </tbody>
                    </table>
                </footer>
            </div>
        </div>
    );
}
