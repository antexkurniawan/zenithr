
'use client';

import React from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

import type { Briefing, BriefingParticipant, Employee, UserProfile } from '@/lib/types';
import { blogLogoBase64, setraLogoBase64 } from '@/lib/logo-images';

interface PrintableBriefingProps {
    briefing: Briefing;
    participants: (BriefingParticipant & { employee?: Employee })[];
}

// Helper untuk mendapatkan jam mulai dan selesai. Asumsi format 'HH:mm'
const getBriefingTime = (date: Date) => {
    const startTime = format(date, "HH:mm");
    // Asumsi briefing selalu 15 menit
    const endTime = format(new Date(date.getTime() + 15 * 60000), "HH:mm");
    return `${startTime} - ${endTime}`;
}

export function PrintableBriefing({ briefing, participants }: PrintableBriefingProps) {
    const briefingDate = new Date(briefing.briefingDate);
    const formatDate = (date: Date, fmt: string) => format(date, fmt, { locale: id });

    // --- Pagination Logic ---
    const participantChunks: (BriefingParticipant & { employee?: Employee })[][] = [];
    if (participants.length > 0) {
        // Page 1: max 10 participants
        participantChunks.push(participants.slice(0, 10));
        
        // Page 2 onwards: max 15 participants per page
        let remainingParticipants = participants.slice(10);
        while (remainingParticipants.length > 0) {
            participantChunks.push(remainingParticipants.slice(0, 15));
            remainingParticipants = remainingParticipants.slice(15);
        }
    } else {
        // If there are no participants, create one empty chunk for the first page layout
        participantChunks.push([]);
    }

    const TableHeader = () => (
        <thead className="bg-blue-100 h-[70px]">
            <tr>
                <th className="border border-black p-1 w-[5%] font-semibold text-center">NO.</th>
                <th className="border border-black p-1 w-[15%] font-semibold text-center">NIK</th>
                <th className="border border-black p-1 w-[30%] font-semibold text-center">NAMA LENGKAP</th>
                <th className="border border-black p-1 w-[20%] font-semibold text-center">JABATAN</th>
                <th className="border border-black p-1 w-[25%] font-semibold text-center">TANDA TANGAN</th>
            </tr>
        </thead>
    );
    
    const SignatureFooter = () => {
      return (
        <footer className="mt-auto pt-4">
            <div className="flex justify-between text-center">
                <div>
                    <p>Gorontalo, {formatDate(briefingDate, 'd MMMM yyyy')}</p>
                    <p className="font-semibold">Dibuat Oleh,</p>
                    <div className="h-20 flex justify-center items-center">
                        {briefing.creatorSignatureUrl && <Image src={briefing.creatorSignatureUrl} alt="TTD Creator" width={120} height={60} className="object-contain" />}
                    </div>
                    <p className="font-semibold underline uppercase mb-1">{briefing.creatorName || '____________________'}</p>
                    <p className="text-xs">({briefing.creatorName ? "Field Coordinator" : "____________________"})</p>
                </div>
                <div>
                    <div className="h-9"></div>
                    <p className="font-semibold">Mengetahui,</p>
                    <div className="h-20 flex justify-center items-center">
                         {briefing.acknowledgerSignatureUrl && <Image src={briefing.acknowledgerSignatureUrl} alt="TTD Acknowledger" width={120} height={60} className="object-contain" />}
                    </div>
                    <p className="font-semibold underline uppercase mb-1">{briefing.acknowledgerName || '____________________'}</p>
                    <p className="text-xs">({briefing.acknowledgerName ? "Operation Point Coordinator" : "____________________"})</p>
                </div>
            </div>
        </footer>
      );
    };

    const getParticipantCountForPage = (pageIndex: number) => {
        return pageIndex === 0 ? 10 : 15;
    };

    return (
        <div id="printable-container" className="bg-white text-black font-sans">
            {/* --- Attendance List Pages --- */}
            {participantChunks.map((chunk, pageIndex) => {
                const isLastPage = pageIndex === participantChunks.length - 1;
                const rowsPerPage = getParticipantCountForPage(pageIndex);
                let participantCounter = 0;
                if (pageIndex > 0) {
                    participantCounter = 10 + (pageIndex - 1) * 15;
                }

                return (
                    <div key={`page-${pageIndex}`} data-printable-page="true" className="w-[210mm] h-[297mm] p-10 bg-white flex flex-col font-sans text-sm">
                        {pageIndex === 0 && (
                            <>
                            <header className="flex justify-between items-center mb-6 border-b-2 border-black pb-2">
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
                                <h1 className="text-xl font-bold text-center">DAFTAR HADIR BRIEFING</h1>
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
                            </header>
                                <table className="mb-4 w-full text-left">
                                    <tbody>
                                        <tr>
                                            <td className="w-[15%] pb-1 align-top">Hari/Tanggal</td>
                                            <td className="w-auto pr-2 pb-1 align-top">:</td>
                                            <td className="w-[85%] font-semibold pb-1">{formatDate(briefingDate, 'eeee, d MMMM yyyy')}</td>
                                        </tr>
                                        <tr>
                                            <td className="pb-1 align-top">Jam</td>
                                            <td className="pr-2 pb-1 align-top">:</td>
                                            <td className="font-semibold pb-1">{formatDate(briefingDate, "HH:mm 'WITA'")}</td>
                                        </tr>
                                        <tr>
                                            <td className="pb-1 align-top">Tempat</td>
                                            <td className="pr-2 pb-1 align-top">:</td>
                                            <td className="font-semibold pb-1">{briefing.area}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </>
                        )}
                        
                        <main className={`flex-grow flex flex-col ${pageIndex > 0 ? 'pt-4' : ''}`}>
                            <table className="w-full border-collapse border border-black text-center">
                                <TableHeader />
                                <tbody>
                                   {chunk.map((participant, rowIndex) => (
                                       <tr key={participant.id} className="h-[50px]">
                                           <td className="border border-black p-1 text-center">{participantCounter + rowIndex + 1}</td>
                                           <td className="border border-black p-1 text-center">{participant.employee?.nik}</td>
                                           <td className="border border-black p-1 text-left">{participant.employeeName}</td>
                                           <td className="border border-black p-1 text-center">{participant.employeeJobTitle}</td>
                                           <td className="border border-black p-1 relative h-[50px]">
                                                {participant.employee?.signatureUrl ? (
                                                    <div className="flex justify-center items-center h-full">
                                                        <Image src={participant.employee.signatureUrl} alt={`TTD ${participant.employeeName}`} width={132} height={47} className="object-contain" />
                                                    </div>
                                                ) : (
                                                    <div className="flex items-end h-full">
                                                        <span className="text-left w-full text-gray-400">{participantCounter + rowIndex + 1}.</span>
                                                    </div>
                                                )}
                                           </td>
                                       </tr>
                                   ))}
                                   {/* Fill remaining rows to keep table height consistent */}
                                   {Array.from({ length: rowsPerPage - chunk.length }).map((_, i) => (
                                        <tr key={`empty-${i}`} className="h-[50px]">
                                            <td className="border border-black"></td>
                                            <td className="border border-black"></td>
                                            <td className="border border-black"></td>
                                            <td className="border border-black"></td>
                                            <td className="border border-black"></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                             {!isLastPage && (
                                <div className="text-right italic text-xs mt-1">...lanjut ke halaman berikutnya</div>
                            )}
                        </main>
                        
                        {isLastPage && <SignatureFooter />}
                        
                    </div>
                );
            })}
            
            {/* Page 2: Briefing Material */}
             <div data-printable-page="true" className="w-[210mm] h-[297mm] p-12 bg-white flex flex-col text-sm">
                 <header className="flex justify-between items-center mb-6 border-b-2 border-black pb-2">
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
                    <h1 className="text-xl font-bold text-center">MATERI BRIEFING</h1>
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
                </header>

                <main>
                    <table className='w-full mb-4 text-sm'>
                        <tbody>
                            <tr>
                                <td className='align-top w-1/2 pr-4'>
                                    <div className="flex flex-col">
                                        <div>Materi yang di sampaikan :</div>
                                        <table className="mt-1">
                                            <tbody>
                                                {(briefing.items && briefing.items.length > 0) ? briefing.items.map((item, index) => (
                                                     <tr key={`topic-item-${index}`}>
                                                        <td className="w-5 pr-1 align-top text-right">{index + 1}.</td>
                                                        <td className="align-top">{item.topic}</td>
                                                    </tr>
                                                )) : briefing.topics.map((topic, index) => (
                                                    <tr key={`topic-list-${index}`}>
                                                        <td className="w-5 pr-1 align-top text-right">{index + 1}.</td>
                                                        <td className="align-top">{topic}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </td>
                                <td className='align-top w-1/2 pl-4'>
                                    <table className='w-full'>
                                        <tbody>
                                            <tr>
                                                <td className='w-10'>Area</td>
                                                <td className='w-2'>:</td>
                                                <td>{briefing.area}</td>
                                            </tr>
                                            <tr>
                                                <td>Jam</td>
                                                <td>:</td>
                                                <td>{getBriefingTime(briefingDate)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="border-2 border-black">
                        <div className="p-1 px-2 bg-gray-200 border-b-2 border-black">
                            <p><span className="font-semibold">Pengisi Materi :</span> {briefing.creatorName}</p>
                        </div>
                        <div className="p-2 space-y-2">
                            {(briefing.items && briefing.items.length > 0) ? briefing.items.map((item, index) => (
                                <div key={`content-item-${index}`} className="flex items-start">
                                    <span className="w-5 font-semibold">{index + 1}.</span>
                                    <p className="flex-1 text-justify">{item.content}</p>
                                </div>
                            )) : (
                                <div key="content-list-0" className="flex items-start">
                                    <span className="w-5 font-semibold">1.</span>
                                    <p className="flex-1 text-justify">{briefing.content.join('\n')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <SignatureFooter />
                </main>

            </div>
        </div>
    );
}
