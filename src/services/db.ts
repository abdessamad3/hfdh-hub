import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp,
  type DocumentData
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Student, Attendance, Memorization, Evaluation, Revision } from '../types';

export const dbService = {
  // Students
  async addStudent(student: Omit<Student, 'id'>) {
    return await addDoc(collection(db, 'students'), {
      ...student,
      enrollmentDate: serverTimestamp(),
    });
  },

  async updateStudent(id: string, data: Partial<Student>) {
    const studentRef = doc(db, 'students', id);
    return await updateDoc(studentRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  async deleteStudent(id: string, teacherId: string) {
    // Delete student doc
    await deleteDoc(doc(db, 'students', id));
    
    // Cleanup related data
    const collections = ['attendance', 'evaluations', 'memorizations', 'revisions'];
    for (const coll of collections) {
      const q = query(
        collection(db, coll), 
        where('studentId', '==', id),
        where('teacherId', '==', teacherId)
      );
      const snap = await getDocs(q);
      const promises = snap.docs.map(d => deleteDoc(doc(db, coll, d.id)));
      await Promise.all(promises);
    }
    return true;
  },

  async getStudents(teacherId: string) {
    const q = query(collection(db, 'students'), where('teacherId', '==', teacherId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      // Safely handle Firestore Timestamp or string
      const enrollmentDate = data.enrollmentDate?.toDate 
        ? data.enrollmentDate.toDate().toISOString() 
        : (data.enrollmentDate || new Date().toISOString());

      return { 
        id: doc.id, 
        attendanceRate: 0,
        memorizationProgress: 0,
        accuracy: 0,
        totalScore: 0,
        ...data,
        enrollmentDate
      } as Student;
    });
  },

  async getStudent(id: string) {
    const docRef = doc(db, 'students', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Student not found');
    const data = snap.data();
    
    // Safely handle Firestore Timestamp or string
    const enrollmentDate = data.enrollmentDate?.toDate 
      ? data.enrollmentDate.toDate().toISOString() 
      : (data.enrollmentDate || new Date().toISOString());

    return { 
      id: snap.id, 
      attendanceRate: 0,
      memorizationProgress: 0,
      accuracy: 0,
      totalScore: 0,
      ...data,
      enrollmentDate
    } as Student;
  },

  // Attendance
  async saveAttendance(records: Omit<Attendance, 'id'>[]) {
    // For each record, check if it exists and update or create
    const promises = records.map(async (record) => {
      const q = query(
        collection(db, 'attendance'),
        where('studentId', '==', record.studentId),
        where('teacherId', '==', record.teacherId),
        where('date', '==', record.date)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        // Update existing
        const docRef = doc(db, 'attendance', snapshot.docs[0].id);
        return updateDoc(docRef, {
          ...record,
          timestamp: serverTimestamp()
        });
      } else {
        // Create new
        return addDoc(collection(db, 'attendance'), {
          ...record,
          timestamp: serverTimestamp()
        });
      }
    });

    await Promise.all(promises);
    
    // Update stats for all affected students
    const uniqueStudentIds = Array.from(new Set(records.map(r => r.studentId)));
    const teacherId = records[0]?.teacherId;
    if (teacherId) {
      await Promise.all(uniqueStudentIds.map(sid => this.updateStudentStats(sid, teacherId)));
    }
    
    return true;
  },

  async getAttendanceByDate(teacherId: string, date: string) {
    const q = query(
      collection(db, 'attendance'),
      where('teacherId', '==', teacherId),
      where('date', '==', date)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance));
  },

  async getStudentAttendance(studentId: string, teacherId: string) {
    const q = query(
      collection(db, 'attendance'),
      where('studentId', '==', studentId),
      where('teacherId', '==', teacherId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance));
  },

  async getWeeklyAttendanceByTeacher(teacherId: string) {
    // Last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    const year = sevenDaysAgo.getFullYear();
    const month = String(sevenDaysAgo.getMonth() + 1).padStart(2, '0');
    const day = String(sevenDaysAgo.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const q = query(
      collection(db, 'attendance'),
      where('teacherId', '==', teacherId),
      where('date', '>=', dateStr)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance));
  },

  // Memorization
  async addMemorization(record: Omit<Memorization, 'id'>) {
    const docRef = await addDoc(collection(db, 'memorizations'), {
      ...record,
      timestamp: serverTimestamp()
    });
    await this.updateStudentStats(record.studentId, record.teacherId);
    return docRef;
  },

  async getMemorizations(studentId: string, teacherId: string) {
    const q = query(
      collection(db, 'memorizations'),
      where('studentId', '==', studentId),
      where('teacherId', '==', teacherId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Memorization));
  },

  // Evaluations
  async checkEvaluationExists(studentId: string, teacherId: string, hizbNumber: number, quantity: number, excludeId?: string) {
    const q = query(
      collection(db, 'evaluations'),
      where('studentId', '==', studentId),
      where('teacherId', '==', teacherId),
      where('hizbNumber', '==', hizbNumber),
      where('quantity', '==', quantity)
    );
    const snapshot = await getDocs(q);
    if (excludeId) {
      return snapshot.docs.some(doc => doc.id !== excludeId);
    }
    return !snapshot.empty;
  },

  async addEvaluation(record: Omit<Evaluation, 'id'>) {
    const docRef = await addDoc(collection(db, 'evaluations'), {
      ...record,
      timestamp: serverTimestamp()
    });
    await this.updateStudentStats(record.studentId, record.teacherId);
    return docRef;
  },

  async updateEvaluation(id: string, data: Partial<Evaluation>, studentId: string, teacherId: string) {
    const docRef = doc(db, 'evaluations', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    await this.updateStudentStats(studentId, teacherId);
    return true;
  },

  async deleteEvaluation(id: string, studentId: string, teacherId: string) {
    await deleteDoc(doc(db, 'evaluations', id));
    await this.updateStudentStats(studentId, teacherId);
    return true;
  },

  async updateStudentStats(studentId: string, teacherId: string) {
    try {
      const [attendanceSnap, evaluationSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'attendance'), 
          where('studentId', '==', studentId),
          where('teacherId', '==', teacherId)
        )),
        getDocs(query(
          collection(db, 'evaluations'), 
          where('studentId', '==', studentId),
          where('teacherId', '==', teacherId)
        ))
      ]);

      const attendanceRecords = attendanceSnap.docs.map(d => d.data() as Attendance);
      const evaluationRecords = evaluationSnap.docs.map(d => d.data() as Evaluation);

      // Attendance Rate
      let attendanceRate = 0;
      if (attendanceRecords.length > 0) {
        const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
        attendanceRate = Math.round((presentCount / attendanceRecords.length) * 100);
      }

      // Accuracy (Performance)
      let accuracy = 0;
      if (evaluationRecords.length > 0) {
        const totalAccuracy = evaluationRecords.reduce((acc, curr) => acc + curr.accuracyScore, 0);
        accuracy = Math.round(totalAccuracy / evaluationRecords.length);
      }

      // Memorization Progress (Calculated as total thamin units / 480)
      let memorizationProgress = 0;
      if (evaluationRecords.length > 0) {
        // We sum unique portions if possible, but for simplicity we sum total quantity reported
        // as a measure of "covered" material. 480 units = 60 Hizbs * 8 portions each.
        const totalUnits = evaluationRecords.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
        memorizationProgress = Math.min(100, Math.round((totalUnits / 480) * 100));
      }

      // Total Score (Weighted average: 20% Attendance, 20% Memo, 60% Accuracy)
      const totalScore = Math.round(
        (attendanceRate * 0.2) + 
        (memorizationProgress * 0.2) + 
        (accuracy * 0.6)
      );

      const studentRef = doc(db, 'students', studentId);
      await updateDoc(studentRef, {
        attendanceRate,
        accuracy,
        memorizationProgress,
        totalScore,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error updating student stats:', err);
    }
  },

  async getEvaluations(studentId: string, teacherId: string) {
    const q = query(
      collection(db, 'evaluations'),
      where('studentId', '==', studentId),
      where('teacherId', '==', teacherId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation));
  },

  async getWeeklyEvaluationsByTeacher(teacherId: string) {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    const year = sevenDaysAgo.getFullYear();
    const month = String(sevenDaysAgo.getMonth() + 1).padStart(2, '0');
    const day = String(sevenDaysAgo.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const q = query(
      collection(db, 'evaluations'),
      where('teacherId', '==', teacherId),
      where('date', '>=', dateStr)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation));
  },

  // Revisions
  async addRevision(record: Omit<Revision, 'id'>) {
    return await addDoc(collection(db, 'revisions'), {
      ...record,
      timestamp: serverTimestamp()
    });
  }
};
