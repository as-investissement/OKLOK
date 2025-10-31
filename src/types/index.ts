export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  department: string;
  companyId?: string;
  archived?: boolean;
  status?: 'pending' | 'active' | 'inactive' | 'suspended';
  birthDate?: string;
  hireDate?: string;
 archivedAt?: string;
 archivedBy?: string;
 createdAt?: string;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  adminEmail: string;
  logo?: string;
  logoUrl?: string;
  conventionCollective?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  reference?: string;
  active: boolean;
  archived: boolean;
  companyId?: string;
  secondaryCompanies?: string[];
  address?: string | {
    number?: string;
    street?: string;
    streetName?: string;
    postalCode?: string;
    city?: string;
  };
}

export interface TimeEntry {
  id: string;
  userId: string;
  date: string;
  projectId: string | null; // Peut être null pour congés/absences
  project?: string; // Nom du projet (chargé depuis la base)
  normalHours: number;
  overtimeHours: number;
  absenceHours?: number; // Heures d'absence (séparées des heures normales)
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  approvalComment?: string;
  decisionBy?: string;
  decisionAt?: string;
  // Nouvelles propriétés pour congés et absences
  isPaidLeave?: boolean;
  isAbsence?: boolean;
  leaveType?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimesheetDay {
  id: string;
  timesheetId: string;
  date: string;
  totalHours: number;
  normalHours: number;
  overtimeHours: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  entries: TimeEntry[];
  decisionBy?: string;
  decisionAt?: string;
  decisionComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimesheetDay {
  id: string;
  timesheetId: string;
  date: string;
  totalHours: number;
  normalHours: number;
  overtimeHours: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  entries: TimeEntry[];
  decisionBy?: string;
  decisionAt?: string;
  decisionComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSheet {
  id: string;
  userId: string;
  userName: string;
  weekStarting: string;
  weekEnding: string;
  totalHours: number;
  total_hours?: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  entries: TimeEntry[];
  createdAt: string;
  updatedAt: string;
  companyId: string;
  auth_id?: string;
}

// Types pour les statuts de soumission par jour
export type DayStatus = 'not_registered' | 'draft' | 'submitted' | 'approved' | 'rejected' | 'partially_approved';

export interface DaySubmission {
  date: string;
  status: DayStatus;
  canSubmit: boolean;
  entries: TimeEntry[];
}

export interface UserInvitation {
  id: string;
  email: string;
  token: string;
  invitedBy: string;
  companyId: string;
  employeeData: {
    name: string;
    department: string;
    birthDate?: string;
  };
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserAgreement {
  id: string;
  userId: string;
  agreementType: 'terms_of_service' | 'privacy_policy' | 'data_processing';
  acceptedAt: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}