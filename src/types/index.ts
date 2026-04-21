export interface Student {
  id: string;
  name: string;
  age: number;
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
  status: 'present' | 'absent';
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
  surahName: string;
  fromAyah: number;
  toAyah: number;
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
