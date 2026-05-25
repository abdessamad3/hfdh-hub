export type UserRole = 'admin' | 'manager' | 'teacher' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  studentId?: string; // Links to Student document if role is 'student'
  kuttabName?: string; // For teachers who are responsible of a Kuttab
  displayName?: string;
  photoURL?: string;
}

export interface Kuttab {
  id: string;
  name: string;
  location?: string;
  teacherId: string;
  schedule?: KuttabSchedule;
}

export interface KuttabSchedule {
  lessons: {
    [key: string]: { // Day of week (0-6) for recurring, or 'YYYY-MM-DD' for specific days
      type: 'recurring' | 'specific';
      lessons: string[]; // e.g., ["08:00", "14:00"] or just ["Lesson 1", "Lesson 2"]
    };
  };
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
  absentRate?: number;
  memorizationProgress: number;
  totalHizbs: number;
  accuracy: number;
  totalScore: number;
  gender: 'male' | 'female';
  kuttabResponsibleId?: string; // ID of the teacher responsible for the kuttab
  stats?: {
    attendanceRate: number;
    absentRate?: number;
    memorizationProgress: number;
    totalHizbs: number;
    accuracy: number;
    totalScore: number;
  }
}

export interface Attendance {
  id: string;
  studentId: string;
  studentEmail?: string;
  teacherId: string;
  kuttabResponsibleId?: string;
  kuttabName?: string;
  date: string;
  sessionIndex?: number; // 0 for morning, 1 for afternoon, etc.
  status: 'present' | 'absent' | 'excused';
  excuse?: string;
}

export interface TeacherAttendance {
  id: string;
  teacherId: string;
  teacherEmail: string;
  markedById: string;
  kuttabName?: string;
  date: string;
  sessionIndex?: number;
  status: 'present' | 'absent' | 'excused';
  excuse?: string;
}

export interface Memorization {
  id: string;
  studentId: string;
  studentEmail?: string;
  teacherId: string;
  kuttabResponsibleId?: string;
  kuttabName?: string;
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
  studentEmail?: string;
  teacherId: string;
  kuttabResponsibleId?: string;
  kuttabName?: string;
  date: string;
  surahName?: string;
  fromAyah?: number;
  toAyah?: number;
  hizbNumber: number;
  quantity: number; // as units of 1/8th
  quantityIdentifier?: string; // e.g. 't1', 'r2', etc.
  mistakesCount: number;
  accuracyScore: number;
  notes: string;
}

export interface Revision {
  id: string;
  studentId: string;
  studentEmail?: string;
  teacherId: string;
  kuttabResponsibleId?: string;
  kuttabName?: string;
  surahName?: string;
  hizbNumber: number;
  quantity: number;
  quantityIdentifier?: string; // e.g. 't1', 'r2', etc.
  date: string;
  qualityScore: number;
  mistakesCount?: number;
  notes: string;
}

export interface NextRevision {
  id: string;
  studentId: string;
  studentEmail?: string;
  teacherId: string;
  kuttabResponsibleId?: string;
  kuttabName?: string;
  surahName?: string;
  hizbNumber: number;
  quantity: number;
  quantityIdentifier?: string;
  notes: string;
  dueDate: string;
  createdAt: any;
  updatedAt: any;
}

export interface NextEvaluation {
  id: string;
  studentId: string;
  studentEmail?: string;
  teacherId: string;
  kuttabResponsibleId?: string;
  kuttabName?: string;
  surahName?: string;
  hizbNumber: number;
  quantity: number;
  quantityIdentifier?: string;
  notes: string;
  dueDate: string;
  createdAt: any;
  updatedAt: any;
}
