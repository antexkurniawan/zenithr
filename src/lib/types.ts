
import { Timestamp } from 'firebase/firestore';

export type EmployeeStatus = 'Aktif' | 'Resign' | 'Kontrak';

export type Employee = {
  id: string;
  name: string;
  nik: string;
  jobTitle: 'Driver' | 'Dispatcher' | 'Checker' | 'Field Coordinator';
  birthDate: string; // ISO string date
  contractStartDate: string;
  contractEndDate: string;
  status: EmployeeStatus;
  email?: string;
  phone?: string;
  areaTugas?: string;
  signatureUrl?: string; // Field baru untuk menyimpan TTD
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type WarningStatus = 'Aktif' | 'Arsip';
export type WarningType = 'SP1' | 'SP2' | 'SP3' | 'Teguran';

export type Warning = {
  id: string;
  employeeId: string;
  employeeName: string; // Denormalized for easy display
  employeeNik: string; // Denormalized
  employeeJobTitle: string; // Denormalized
  employeeAreaTugas: string; // Denormalized
  nomorSurat: string;
  type: WarningType;
  issueDate: string; // ISO string date
  expiryDate: string; // ISO string date
  description: string;
  peraturanDilanggar: string;
  createdAt?: Timestamp;
};

export type UserProfile = {
  id: string;
  name: string;
  jobTitle: string;
  workArea: string;
  email: string;
  signatureUrl?: string;
  operationPointCoordinatorName?: string; // Menyimpan nama OPC secara langsung
  operationPointCoordinatorSignatureUrl?: string; // Tanda tangan OPC
};

export type BriefingTopic = string; // Now a string, not a fixed set

export type BriefingItem = {
    topic: string;
    content: string;
}

export type Briefing = {
    id: string;
    area: string;
    briefingDate: string; // ISO string date
    topics: BriefingTopic[]; // Maintained for list view display
    content: string[]; // Maintained for list view display
    items: BriefingItem[]; // New detailed structure
    createdBy: string; // User ID
    creatorName: string; // Denormalized name
    creatorSignatureUrl?: string; // Denormalized creator signature URL
    acknowledgedBy?: string; // User ID
    acknowledgerName?: string; // Denormalized name
    acknowledgerSignatureUrl?: string; // Denormalized signature URL
    createdAt: Timestamp;
    acknowledgedAt?: Timestamp; // Timestamp for when it was acknowledged
};

export type BriefingParticipant = {
    id: string; // document id
    employeeId: string;
    employeeName: string;
    employeeJobTitle: string;
    hasSigned: boolean;
};

export type AttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpha' | 'Cuti';

export type Attendance = {
  id: string;
  employeeId: string;
  employeeName: string; // Denormalized
  employeeNik: string; // Denormalized
  date: string; // ISO Date string (YYYY-MM-DD)
  status: AttendanceStatus;
  checkIn?: string; // ISO DateTime string
  checkOut?: string; // ISO DateTime string
  notes?: string;
  importedAt: Timestamp;
};

export type CompanyRule = {
    id: string;
    type: WarningType;
    description: string;
    text: string;
};

    