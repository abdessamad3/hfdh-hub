export type UserRole = 'teacher' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  studentId?: string; // Links to Student document if role is 'student'
  displayName?: string;
  photoURL?: string;
}

export interface Kuttab {
  id: string;
  name: string;
  location?: string;
  teacherId: string;
}

export interface Student {
  id: string;
  name: string;
  age: number;
  email?: string; // For linking to student account
  kuttabName?: string;
  enrollmentDate: string;
  teacherId: string;
  attendanceRate: number;
  memorizationProgress: number;
  accuracy: number;
  totalScore: number;
  stats?: {
    attendanceRate: number;
    memorizationProgress: number;
    accuracy: number;
    totalScore: number;
  }
}

export interface Attendance {
  id: string;
  studentId: string;
  teacherId: string;
  date: string;
  status: 'present' | 'absent' | 'excused';
}

export interface Memorization {
  id: string;
  studentId: string;
  teacherId: string;
  surahName: string;
  fromAyah: number;
  toAyah: number;
  hizbNumber?: number;
  quantity?: number; // 1/8 units
  date: string;
}

export interface Evaluation {
  id: string;
  studentId: string;
  teacherId: string;
  date: string;
  surahName?: string;
  fromAyah?: number;
  toAyah?: number;
  hizbNumber: number;
  quantity: number; // as units of 1/8th
  mistakesCount: number;
  accuracyScore: number;
  notes: string;
}

export interface Revision {
  id: string;
  studentId: string;
  teacherId: string;
  surahName: string;
  date: string;
  qualityScore: number;
}
