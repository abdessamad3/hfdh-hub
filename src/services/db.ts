import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  setDoc,
  doc, 
  getDocs, 
  getDoc, 
  onSnapshot,
  query, 
  where, 
  orderBy,
  limit,
  or,
  and,
  serverTimestamp,
  Timestamp,
  increment,
  writeBatch,
  type DocumentData,
  type QueryFilterConstraint
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import type { Student, Attendance, Memorization, Evaluation, Revision, UserProfile, UserRole, Kuttab, KuttabSchedule, NextRevision, NextEvaluation, TeacherAttendance } from '../types';
import { getCoveredThumns, getHizbNumberForSurah } from '../lib/quranUtils';
import { getDayIndex } from '../lib/dateUtils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const dbService = {
  // Kuttabs
  async addKuttab(kuttab: Omit<Kuttab, 'id'>) {
    return await addDoc(collection(db, 'kuttabs'), {
      ...kuttab,
      createdAt: serverTimestamp()
    });
  },

  async getKuttabs(teacherId: string) {
    const q = query(collection(db, 'kuttabs'), where('teacherId', '==', teacherId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Kuttab));
  },

  async getAllKuttabs() {
    const q = query(collection(db, 'kuttabs'), limit(100));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Kuttab));
  },

  async deleteKuttab(id: string) {
    await deleteDoc(doc(db, 'kuttabs', id));
    return true;
  },

  async getKuttab(id: string) {
    const docRef = doc(db, 'kuttabs', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as object) } as Kuttab;
  },

  subscribeKuttab(id: string, callback: (kuttab: Kuttab | null) => void) {
    const docRef = doc(db, 'kuttabs', id);
    return onSnapshot(docRef, (snap) => {
      if (!snap.exists()) {
        callback(null);
      } else {
        callback({ id: snap.id, ...(snap.data() as object) } as Kuttab);
      }
    }, (error) => {
      console.error("Error subscribing to kuttab:", error);
    });
  },

  async updateKuttab(id: string, kuttab: Partial<Kuttab>) {
    try {
      await updateDoc(doc(db, 'kuttabs', id), {
        ...kuttab,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `kuttabs/${id}`);
    }
  },

  async updateKuttabSchedule(id: string, schedule: KuttabSchedule) {
    const docRef = doc(db, 'kuttabs', id);
    return await updateDoc(docRef, {
      schedule,
      updatedAt: serverTimestamp()
    });
  },

  async getKuttabByName(name: string) {
    const q = query(collection(db, 'kuttabs'), where('name', '==', name));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Kuttab;
  },

  // Unified email uniqueness check
  async checkEmailUniqueness(email: string, excludeId?: string, collectionName: 'students' | 'users' = 'users') {
    const emailLower = email.toLowerCase();
    
    // Check ONLY the target collection for the same ID exception
    if (collectionName === 'students') {
      const q = query(collection(db, 'students'), where('email', '==', emailLower));
      const snap = await getDocs(q);
      if (snap.docs.some(doc => doc.id !== excludeId)) {
        throw new Error('email_already_exists');
      }
    } else {
      const q = query(collection(db, 'users'), where('email', '==', emailLower));
      const snap = await getDocs(q);
      if (snap.docs.some(doc => doc.id !== excludeId)) {
        throw new Error('email_already_exists');
      }
    }
  },

  // Students
  async addStudent(student: Omit<Student, 'id'>) {
    if (student.email) {
      await this.checkEmailUniqueness(student.email, undefined, 'students');
    }

    let kuttabResponsibleId = student.teacherId;
    
    if (student.kuttabName) {
      const q = query(collection(db, 'kuttabs'), where('name', '==', student.kuttabName));
      const snap = await getDocs(q);
      if (!snap.empty) {
        kuttabResponsibleId = snap.docs[0].data().teacherId;
      }
    }

    const data = {
      ...student,
      kuttabResponsibleId,
      enrollmentDate: serverTimestamp(),
    };

    // Filter undefined
    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));

    return await addDoc(collection(db, 'students'), cleanData);
  },

  async updateStudent(id: string, data: Partial<Student>) {
    if (data.email) {
      await this.checkEmailUniqueness(data.email, id, 'students');
    }

    const studentRef = doc(db, 'students', id);
    let finalData = { ...data };

    if (data.kuttabName) {
      const q = query(collection(db, 'kuttabs'), where('name', '==', data.kuttabName));
      const snap = await getDocs(q);
      if (!snap.empty) {
        finalData.kuttabResponsibleId = snap.docs[0].data().teacherId;
      }
    }

    const updateData = {
      ...finalData,
      updatedAt: serverTimestamp()
    };

    const sanitize = (obj: any): any => {
      const clean: any = {};
      Object.keys(obj).forEach(key => {
        if (obj[key] === undefined) return;
        if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date) && key !== 'updatedAt') {
          const nested = sanitize(obj[key]);
          if (Object.keys(nested).length > 0) {
            clean[key] = nested;
          }
        } else {
          clean[key] = obj[key];
        }
      });
      return clean;
    };

    const cleanUpdateData = sanitize(updateData);

    return await setDoc(studentRef, cleanUpdateData, { merge: true });
  },

  async deleteStudent(id: string) {
    // Delete student doc
    await deleteDoc(doc(db, 'students', id));
    
    // Cleanup related data - delete all records for this student
    const collections = ['attendance', 'evaluations', 'memorizations', 'revisions'];
    for (const coll of collections) {
      const q = query(
        collection(db, coll), 
        where('studentId', '==', id)
      );
      const snap = await getDocs(q);
      const promises = snap.docs.map(d => deleteDoc(doc(db, coll, d.id)));
      await Promise.all(promises);
    }
    return true;
  },

  async getStudents(teacherId: string, kuttabName?: string, isAdmin: boolean = false) {
    if (isAdmin) {
      return this.getAllStudents();
    }
    
    let q;
    if (kuttabName) {
      // If teacher belongs to a kuttab, show JUST students from that same kuttab
      q = query(
        collection(db, 'students'), 
        where('kuttabName', '==', kuttabName),
        limit(100)
      );
    } else {
      // Otherwise show students where this teacher is either the teacher or responsible
      q = query(
        collection(db, 'students'), 
        or(
          where('teacherId', '==', teacherId),
          where('kuttabResponsibleId', '==', teacherId)
        ),
        limit(100)
      );
    }

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data() as any;
      // Safely handle Firestore Timestamp or string
      const enrollmentDate = data.enrollmentDate?.toDate 
        ? data.enrollmentDate.toDate().toISOString() 
        : (data.enrollmentDate || new Date().toISOString());

      return { 
        id: doc.id, 
        attendanceRate: 0,
        memorizationProgress: 0,
        totalHizbs: 0,
        accuracy: 0,
        totalScore: 0,
        ...data,
        enrollmentDate
      } as Student;
    });
  },

  async getTopRankingStudents(limitCount: number = 10) {
    try {
      const q = query(
        collection(db, 'students'), 
        orderBy('totalScore', 'desc'), 
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          ...data,
          enrollmentDate: data.enrollmentDate?.toDate 
            ? data.enrollmentDate.toDate().toISOString() 
            : (data.enrollmentDate || new Date().toISOString())
        } as Student;
      });
    } catch (error) {
      console.error("Error fetching top ranking students:", error);
      return [];
    }
  },

  async getStudentsByKuttab(kuttabName: string) {
    try {
      const q = query(
        collection(db, 'students'), 
        where('kuttabName', '==', kuttabName),
        limit(100)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          ...data,
          enrollmentDate: data.enrollmentDate?.toDate 
            ? data.enrollmentDate.toDate().toISOString() 
            : (data.enrollmentDate || new Date().toISOString())
        } as Student;
      });
    } catch (error) {
      console.error("Error fetching students by kuttab:", error);
      return [];
    }
  },

  async getAllStudents(kuttabName?: string, isAdmin: boolean = false) {
    let q;
    if (isAdmin) {
      q = query(collection(db, 'students'), limit(100));
    } else if (kuttabName) {
      q = query(
        collection(db, 'students'), 
        where('kuttabName', '==', kuttabName),
        limit(100)
      );
    } else {
      // Fallback for non-admin without kuttab: only their own students
      q = query(
        collection(db, 'students'),
        or(
          where('teacherId', '==', auth.currentUser?.uid),
          where('kuttabResponsibleId', '==', auth.currentUser?.uid)
        ),
        limit(100)
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data() as any;
      const enrollmentDate = data.enrollmentDate?.toDate 
        ? data.enrollmentDate.toDate().toISOString() 
        : (data.enrollmentDate || new Date().toISOString());

      return { 
        id: doc.id, 
        ...data,
        enrollmentDate
      } as Student;
    });
  },

  subscribeStudents(teacherId: string, kuttabName: string | undefined, isAdmin: boolean, callback: (students: Student[]) => void) {
    if (isAdmin) {
      return onSnapshot(query(collection(db, 'students'), limit(100)), (snapshot) => {
        const students = snapshot.docs.map(doc => {
          const data = doc.data();
          const enrollmentDate = data.enrollmentDate?.toDate 
            ? data.enrollmentDate.toDate().toISOString() 
            : (data.enrollmentDate || new Date().toISOString());

          return { 
            id: doc.id, 
            attendanceRate: 0,
            memorizationProgress: 0,
            totalHizbs: 0,
            accuracy: 0,
            totalScore: 0,
            ...data,
            enrollmentDate
          } as Student;
        });
        callback(students);
      }, (error) => {
        console.error("Error subscribing to students (admin):", error);
      });
    }

    // For non-admin, subscribe to students where teacher is teacherId OR kuttabResponsibleId OR same kuttabName
    let q;
    if (kuttabName) {
      // Show JUST students with same kuttab
      q = query(
        collection(db, 'students'), 
        where('kuttabName', '==', kuttabName),
        limit(100)
      );
    } else {
      q = query(
        collection(db, 'students'),
        or(
          where('teacherId', '==', teacherId),
          where('kuttabResponsibleId', '==', teacherId)
        ),
        limit(100)
      );
    }
    
    return onSnapshot(q, (snapshot) => {
      const students = snapshot.docs.map(doc => {
        const data = doc.data();
        const enrollmentDate = data.enrollmentDate?.toDate 
          ? data.enrollmentDate.toDate().toISOString() 
          : (data.enrollmentDate || new Date().toISOString());

        return { 
          id: doc.id, 
          attendanceRate: 0,
          memorizationProgress: 0,
          totalHizbs: 0,
          accuracy: 0,
          totalScore: 0,
          ...data,
          enrollmentDate
        } as Student;
      });
      callback(students);
    }, (error) => {
      console.error("Error subscribing to students:", error);
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
      totalHizbs: 0,
      accuracy: 0,
      totalScore: 0,
      ...data,
      enrollmentDate
    } as Student;
  },

  // Attendance helper
  async ensurePresence(studentId: string, date: string, teacherId: string) {
    try {
      const isSession = await this.isSessionDay(studentId, date);
      if (!isSession) return; // Silent return as this is a background helper

      const id = `${studentId}_${date}`;
      const docRef = doc(db, 'attendance', id);
      const snap = await getDoc(docRef);
      
      if (snap.exists()) {
        const currentData = snap.data() as Attendance;
        if (currentData.status !== 'present') {
          await updateDoc(docRef, { 
            status: 'present', 
            updatedAt: serverTimestamp(), 
            excuse: null 
          });
        }
      } else {
        const student = await this.getStudent(studentId);
        await setDoc(docRef, {
          studentId,
          teacherId,
          date,
          status: 'present',
          studentEmail: student.email ? student.email.toLowerCase() : null,
          kuttabResponsibleId: student.kuttabResponsibleId || null,
          kuttabName: student.kuttabName || null,
          timestamp: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error('Error ensuring presence:', err);
    }
  },

  async isSessionDay(studentId: string, date: string) {
    try {
      const student = await this.getStudent(studentId);
      const kName = student.kuttabName?.trim().toLowerCase();
      if (!kName) return false; // Strict: No kuttab = no session

      const kuttabs = await this.getAllKuttabs();
      const kuttab = kuttabs.find(k => k.name.trim().toLowerCase() === kName);
      const schedule = kuttab?.schedule?.lessons;
      if (!schedule) return false; // Strict: No schedule = no session

      // Handle specific date overrides (e.g. '2026-05-08')
      const specific = schedule[date];
      if (specific) {
        return specific.lessons.length > 0;
      }

      // Fallback to recurring schedule
      const dayIdx = getDayIndex(date);
      const recurring = schedule[dayIdx.toString()];
      return recurring && recurring.type === 'recurring' && recurring.lessons.length > 0;
    } catch (err) {
      console.error('Error checking session day:', err);
      return false; // Strict failure
    }
  },

  // Attendance
  async saveAttendance(records: Omit<Attendance, 'id'>[]) {
    const promises = records.map(async (record) => {
      try {
        const isSession = await this.isSessionDay(record.studentId, record.date);
        if (!isSession) {
          throw new Error('Attendance can only be marked on scheduled session days.');
        }

        const id = `${record.studentId}_${record.date}_${record.sessionIndex || 0}`;
        const docRef = doc(db, 'attendance', id);

        if (!record.status) {
          await deleteDoc(docRef);
          return;
        }

        const student = await this.getStudent(record.studentId);
        
        let finalStatus = record.status;
        let finalExcuse = record.excuse;

        if (finalStatus !== 'present') {
           const [evals, revs] = await Promise.all([
             getDocs(query(collection(db, 'evaluations'), where('studentId', '==', record.studentId), where('date', '==', record.date), limit(1))),
             getDocs(query(collection(db, 'revisions'), where('studentId', '==', record.studentId), where('date', '==', record.date), limit(1)))
           ]);
           if (!evals.empty || !revs.empty) {
             finalStatus = 'present';
             finalExcuse = undefined;
           }
        }

        const cleanData = Object.fromEntries(
          Object.entries({
            ...record,
            status: finalStatus,
            excuse: finalExcuse,
            studentEmail: student.email ? student.email.toLowerCase() : null,
            kuttabResponsibleId: student.kuttabResponsibleId || null,
            kuttabName: student.kuttabName || null,
            updatedAt: serverTimestamp()
          }).filter(([_, v]) => v !== undefined)
        );

        // Use set with merge to ensure we don't lose the created timestamp if it exists,
        // but since we are using deterministic IDs, set is better.
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          (cleanData as any).timestamp = serverTimestamp();
        }

        return setDoc(docRef, cleanData, { merge: true });
      } catch (err) {
        return handleFirestoreError(err, OperationType.WRITE, 'attendance');
      }
    });

    await Promise.all(promises);
    
    const uniqueStudentIds = Array.from(new Set(records.map(r => r.studentId)));
    await Promise.all(uniqueStudentIds.map(sid => this.updateStudentStats(sid)));
    
    return true;
  },

  async getAttendanceByDate(teacherId: string, kuttabName: string | undefined, date: string, isAdmin: boolean = false) {
    if (isAdmin) {
      const snap = await getDocs(query(collection(db, 'attendance'), where('date', '==', date), limit(100)));
      return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Attendance));
    }
    const queries = [
      getDocs(query(collection(db, 'attendance'), where('teacherId', '==', teacherId), where('date', '==', date), limit(100))),
      getDocs(query(collection(db, 'attendance'), where('kuttabResponsibleId', '==', teacherId), where('date', '==', date), limit(100)))
    ];

    if (kuttabName) {
      queries.push(getDocs(query(collection(db, 'attendance'), where('kuttabName', '==', kuttabName), where('date', '==', date), limit(100))));
    }

    const snapshots = await Promise.all(queries);

    const combinedDocs = [] as any[];
    snapshots.forEach(snap => {
      snap.docs.forEach(doc => {
        if (!combinedDocs.some(d => d.id === doc.id)) {
          combinedDocs.push(doc);
        }
      });
    });

    return combinedDocs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Attendance));
  },

  // Teacher Attendance
  async saveTeacherAttendance(records: Omit<TeacherAttendance, 'id'>[]) {
    const promises = records.map(async (record) => {
      try {
        const q = query(
          collection(db, 'teacher_attendance'),
          where('teacherId', '==', record.teacherId),
          where('date', '==', record.date),
          where('sessionIndex', '==', record.sessionIndex || 0)
        );
        const snapshot = await getDocs(q);
        
        const cleanData = Object.fromEntries(
          Object.entries({
            ...record,
            timestamp: serverTimestamp(),
            updatedAt: serverTimestamp()
          }).filter(([_, v]) => v !== undefined)
        );

        if (!snapshot.empty) {
          const docRef = doc(db, 'teacher_attendance', snapshot.docs[0].id);
          return updateDoc(docRef, cleanData);
        } else {
          return addDoc(collection(db, 'teacher_attendance'), cleanData);
        }
      } catch (err) {
        return handleFirestoreError(err, OperationType.WRITE, 'teacher_attendance');
      }
    });

    await Promise.all(promises);
    return true;
  },

  async getTeacherAttendanceByDate(date: string) {
    try {
      const q = query(collection(db, 'teacher_attendance'), where('date', '==', date));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as TeacherAttendance));
    } catch (err) {
      return handleFirestoreError(err, OperationType.LIST, 'teacher_attendance');
    }
  },

  async getStudentAttendance(studentId: string) {
    const q = query(
      collection(db, 'attendance'),
      where('studentId', '==', studentId),
      orderBy('date', 'desc'),
      limit(100)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Attendance));
  },

  async getMonthlyAttendanceByTeacher(teacherId: string, kuttabName: string | undefined, year: number, month: number, isAdmin: boolean = false) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    let baseQuery;
    if (isAdmin) {
      baseQuery = query(
        collection(db, 'attendance'),
        where('date', '>=', startDate),
        where('date', '<', endDate)
      );
    } else if (kuttabName) {
      baseQuery = query(
        collection(db, 'attendance'),
        where('kuttabName', '==', kuttabName),
        where('date', '>=', startDate),
        where('date', '<', endDate)
      );
    } else {
      baseQuery = query(
        collection(db, 'attendance'),
        and(
          or(
            where('teacherId', '==', teacherId),
            where('kuttabResponsibleId', '==', teacherId)
          ),
          where('date', '>=', startDate),
          where('date', '<', endDate)
        )
      );
    }

    const snap = await getDocs(baseQuery);
    return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Attendance));
  },

  async getMonthlyEvaluationsByTeacher(teacherId: string, kuttabName: string | undefined, year: number, month: number, isAdmin: boolean = false) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    let baseQuery;
    if (isAdmin) {
      baseQuery = query(
        collection(db, 'evaluations'),
        where('date', '>=', startDate),
        where('date', '<', endDate)
      );
    } else if (kuttabName) {
      baseQuery = query(
        collection(db, 'evaluations'),
        where('kuttabName', '==', kuttabName),
        where('date', '>=', startDate),
        where('date', '<', endDate)
      );
    } else {
      baseQuery = query(
        collection(db, 'evaluations'),
        and(
          or(
            where('teacherId', '==', teacherId),
            where('kuttabResponsibleId', '==', teacherId)
          ),
          where('date', '>=', startDate),
          where('date', '<', endDate)
        )
      );
    }

    const snap = await getDocs(baseQuery);
    return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Evaluation));
  },

  async getMonthlyRevisionsByTeacher(teacherId: string, kuttabName: string | undefined, year: number, month: number, isAdmin: boolean = false) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    let baseQuery;
    if (isAdmin) {
      baseQuery = query(
        collection(db, 'revisions'),
        where('date', '>=', startDate),
        where('date', '<', endDate)
      );
    } else if (kuttabName) {
      baseQuery = query(
        collection(db, 'revisions'),
        where('kuttabName', '==', kuttabName),
        where('date', '>=', startDate),
        where('date', '<', endDate)
      );
    } else {
      baseQuery = query(
        collection(db, 'revisions'),
        and(
          or(
            where('teacherId', '==', teacherId),
            where('kuttabResponsibleId', '==', teacherId)
          ),
          where('date', '>=', startDate),
          where('date', '<', endDate)
        )
      );
    }

    const snap = await getDocs(baseQuery);
    return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Revision));
  },

  async getWeeklyAttendanceByTeacher(teacherId: string, kuttabName: string | undefined, isAdmin: boolean = false) {
    // Last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    const year = sevenDaysAgo.getFullYear();
    const month = String(sevenDaysAgo.getMonth() + 1).padStart(2, '0');
    const day = String(sevenDaysAgo.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    if (isAdmin) {
      const snap = await getDocs(query(
        collection(db, 'attendance'), 
        where('date', '>=', dateStr),
        orderBy('date', 'desc'),
        limit(1000)
      ));
      const records = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Attendance));
      return records;
    }

    let q;
    if (kuttabName) {
      q = query(
        collection(db, 'attendance'), 
        where('kuttabName', '==', kuttabName), 
        where('date', '>=', dateStr),
        orderBy('date', 'desc'),
        limit(1000)
      );
    } else {
      q = query(
        collection(db, 'attendance'), 
        and(
          or(
            where('teacherId', '==', teacherId),
            where('kuttabResponsibleId', '==', teacherId)
          ),
          where('date', '>=', dateStr)
        ),
        orderBy('date', 'desc'),
        limit(1000)
      );
    }

    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Attendance));
  },

  // Memorization
  async addMemorization(record: Omit<Memorization, 'id'>) {
    const isSession = await this.isSessionDay(record.studentId, record.date);
    if (!isSession) {
      throw new Error('Memorizations can only be added on scheduled session days.');
    }

    const student = await this.getStudent(record.studentId);
    const docRef = await addDoc(collection(db, 'evaluations'), {
      ...record,
      studentEmail: student.email ? student.email.toLowerCase() : null,
      kuttabResponsibleId: student.kuttabResponsibleId || null,
      kuttabName: student.kuttabName || null,
      mistakesCount: 0,
      accuracyScore: 100,
      notes: 'Logged directly as passed memorization',
      timestamp: serverTimestamp()
    });

    // Ensure student is marked present
    await this.ensurePresence(record.studentId, record.date, record.teacherId);

    await this.updateStudentStats(record.studentId);
    return docRef;
  },

  async getMemorizationsByDate(teacherId: string, kuttabName: string | undefined, date: string, isAdmin: boolean = false) {
    try {
      const q = isAdmin ? 
        query(collection(db, 'evaluations'), where('date', '==', date), limit(100)) :
        query(
          collection(db, 'evaluations'),
          and(
            or(
              where('teacherId', '==', teacherId),
              where('kuttabResponsibleId', '==', teacherId),
              ...(kuttabName ? [where('kuttabName', '==', kuttabName)] : [])
            ),
            where('date', '==', date)
          ),
          limit(100)
        );

      const snap = await getDocs(q);
      return snap.docs.map(doc => {
        const ev = doc.data() as Evaluation;
        return {
          id: doc.id,
          studentId: ev.studentId,
          studentEmail: ev.studentEmail,
          teacherId: ev.teacherId,
          kuttabResponsibleId: ev.kuttabResponsibleId,
          kuttabName: ev.kuttabName,
          surahName: ev.surahName || '',
          fromAyah: ev.fromAyah || 0,
          toAyah: ev.toAyah || 0,
          hizbNumber: ev.hizbNumber,
          quantity: ev.quantity,
          quantityIdentifier: ev.quantityIdentifier,
          date: ev.date
        } as Memorization;
      });
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, 'evaluations');
    }
  },

  async getMemorizations(studentId: string) {
    try {
      const q = query(
        collection(db, 'evaluations'),
        where('studentId', '==', studentId),
        orderBy('date', 'desc'),
        limit(100)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const ev = doc.data() as Evaluation;
        return {
          id: doc.id,
          studentId: ev.studentId,
          studentEmail: ev.studentEmail,
          teacherId: ev.teacherId,
          kuttabResponsibleId: ev.kuttabResponsibleId,
          kuttabName: ev.kuttabName,
          surahName: ev.surahName || '',
          fromAyah: ev.fromAyah || 0,
          toAyah: ev.toAyah || 0,
          hizbNumber: ev.hizbNumber,
          quantity: ev.quantity,
          quantityIdentifier: ev.quantityIdentifier,
          date: ev.date
        } as Memorization;
      });
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, 'evaluations');
    }
  },

  // Evaluations
  async checkEvaluationExists(studentId: string, teacherId: string, hizbNumber: number, quantity: number, date: string, excludeId?: string) {
    try {
      const q = query(
        collection(db, 'evaluations'),
        where('studentId', '==', studentId),
        where('teacherId', '==', teacherId),
        where('hizbNumber', '==', hizbNumber),
        where('quantity', '==', quantity),
        where('date', '==', date)
      );
      const snapshot = await getDocs(q);
      if (excludeId) {
        return snapshot.docs.some(doc => doc.id !== excludeId);
      }
      return !snapshot.empty;
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, 'evaluations');
    }
  },

  async checkOverlappingEvaluation(studentId: string, hizbNumber: number, quantityIdentifier: string, excludeId?: string) {
    try {
      const q = query(
        collection(db, 'evaluations'),
        where('studentId', '==', studentId),
        where('hizbNumber', '==', hizbNumber)
      );
      const snapshot = await getDocs(q);
      const currentCovered = getCoveredThumns(hizbNumber, quantityIdentifier);
      
      return snapshot.docs.some(doc => {
        if (excludeId && doc.id === excludeId) return false;
        const data = doc.data();
        const existingCovered = getCoveredThumns(hizbNumber, data.quantityIdentifier || '');
        return currentCovered.some(unit => existingCovered.includes(unit));
      });
    } catch (error) {
      console.error('Error checking overlapping evaluation:', error);
      return false;
    }
  },

  async addEvaluation(record: Omit<Evaluation, 'id'>) {
    try {
      const isSession = await this.isSessionDay(record.studentId, record.date);
      if (!isSession) {
        throw new Error('Evaluations can only be added on scheduled session days.');
      }

      const student = await this.getStudent(record.studentId);
      
      const data = {
        ...record,
        studentEmail: student.email ? student.email.toLowerCase() : null,
        kuttabResponsibleId: student.kuttabResponsibleId || null,
        kuttabName: student.kuttabName || null,
        timestamp: serverTimestamp()
      };

      const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));

      const docRef = await addDoc(collection(db, 'evaluations'), cleanData);
      
      // Ensure the student is marked as present for this day
      await this.ensurePresence(record.studentId, record.date, record.teacherId);
      
      await this.updateStudentStats(record.studentId);
      return docRef;
    } catch (error) {
      return handleFirestoreError(error, OperationType.CREATE, 'evaluations');
    }
  },

  async updateEvaluation(id: string, data: Partial<Evaluation>, studentId: string, teacherId: string) {
    try {
      const docRef = doc(db, 'evaluations', id);
      
      const updateData = {
        ...data,
        updatedAt: serverTimestamp()
      };

      const cleanUpdateData = Object.fromEntries(Object.entries(updateData).filter(([_, v]) => v !== undefined));

      await setDoc(docRef, cleanUpdateData, { merge: true });

      // Ensure the student is marked as present for this day
      if (data.date || studentId) {
        const finalSnap = await getDoc(docRef);
        const finalData = finalSnap.data();
        if (finalData?.date && finalData?.teacherId) {
          await this.ensurePresence(studentId, finalData.date, finalData.teacherId);
        }
      }

      await this.updateStudentStats(studentId);
      return true;
    } catch (error) {
      return handleFirestoreError(error, OperationType.UPDATE, `evaluations/${id}`);
    }
  },

  async deleteEvaluation(id: string, studentId: string, teacherId: string) {
    try {
      await deleteDoc(doc(db, 'evaluations', id));
      await this.updateStudentStats(studentId);
      return true;
    } catch (error) {
      return handleFirestoreError(error, OperationType.DELETE, `evaluations/${id}`);
    }
  },

  async updateStudentStats(studentId: string) {
    try {
      // Fetches all records for this student regardless of teacher to get true global stats
      const [attendanceSnap, evaluationSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'attendance'), 
          where('studentId', '==', studentId),
          limit(500)
        )),
        getDocs(query(
          collection(db, 'evaluations'), 
          where('studentId', '==', studentId),
          limit(500)
        ))
      ]);

      const attendanceRecords = attendanceSnap.docs.map(d => d.data() as Attendance);
      const evaluationRecords = evaluationSnap.docs.map(d => d.data() as Evaluation);

      // Sort records in-memory by date (descending)
      attendanceRecords.sort((a, b) => b.date.localeCompare(a.date));
      evaluationRecords.sort((a, b) => b.date.localeCompare(a.date));

      // Attendance Rate
      let attendanceRate = 0;
      let absentRate = 0;
      if (attendanceRecords.length > 0) {
        const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
        const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
        const base = presentCount + absentCount;
        
        if (base > 0) {
          attendanceRate = Math.round((presentCount / base) * 100);
          absentRate = 100 - attendanceRate;
        }
      }

      // Accuracy (Performance)
      let accuracy = 0;
      if (evaluationRecords.length > 0) {
        const totalAccuracy = evaluationRecords.reduce((acc, curr) => acc + curr.accuracyScore, 0);
        accuracy = Math.round(totalAccuracy / evaluationRecords.length);
      }

      // Memorization Progress (Calculated as unique thamin units / 480)
      let memorizationProgress = 0;
      let totalHizbs = 0;
      if (evaluationRecords.length > 0) {
        // Track unique units across all evaluations
        const uniqueUnits = new Set<string>();
        
        evaluationRecords.forEach(ev => {
          const covered = getCoveredThumns(ev.hizbNumber, ev.quantityIdentifier || '');
          covered.forEach(unit => {
            uniqueUnits.add(`${ev.hizbNumber}-${unit}`);
          });
          
          // For legacy data that only had quantity but not identifier
          if (covered.length === 0 && ev.quantity > 0) {
            for (let i = 1; i <= Math.min(8, ev.quantity); i++) {
              uniqueUnits.add(`${ev.hizbNumber}-${i}`);
            }
          }
        });

        const totalUniqueUnits = uniqueUnits.size;
        totalHizbs = totalUniqueUnits / 8;
        memorizationProgress = Math.min(100, Math.round((totalUniqueUnits / 480) * 100));
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
        absentRate,
        accuracy,
        memorizationProgress,
        totalHizbs,
        totalScore,
        stats: {
          attendanceRate,
          absentRate,
          accuracy,
          memorizationProgress,
          totalHizbs,
          totalScore
        },
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error updating student stats:', err);
    }
  },

  async getEvaluationsByDate(teacherId: string, kuttabName: string | undefined, date: string, isAdmin: boolean = false) {
    try {
      if (isAdmin) {
        const snap = await getDocs(query(collection(db, 'evaluations'), where('date', '==', date), limit(100)));
        return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Evaluation));
      }

      const q = query(
        collection(db, 'evaluations'),
        and(
          or(
            where('teacherId', '==', teacherId),
            where('kuttabResponsibleId', '==', teacherId),
            ...(kuttabName ? [where('kuttabName', '==', kuttabName)] : [])
          ),
          where('date', '==', date)
        ),
        limit(100)
      );

      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Evaluation));
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, 'evaluations');
    }
  },

  async getEvaluations(studentId: string) {
    try {
      const q = query(
        collection(db, 'evaluations'),
        where('studentId', '==', studentId),
        orderBy('date', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Evaluation));
      
      // Secondary sort by timestamp for same-day entries
      return items.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        const bTime = (b as any).timestamp?.toMillis?.() || 0;
        const aTime = (a as any).timestamp?.toMillis?.() || 0;
        return bTime - aTime;
      });
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, 'evaluations');
    }
  },

  subscribeWeeklyEvaluations(teacherId: string, kuttabName: string | undefined, isAdmin: boolean, callback: (evaluations: Evaluation[]) => void) {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString().split('T')[0];
    
    let q;
    if (isAdmin) {
      q = query(
        collection(db, 'evaluations'), 
        where('date', '>=', dateStr),
        limit(50)
      );
    } else {
      const teacherConditions: QueryFilterConstraint[] = [
        where('teacherId', '==', teacherId),
        where('kuttabResponsibleId', '==', teacherId)
      ];
      if (kuttabName) {
        teacherConditions.push(where('kuttabName', '==', kuttabName));
      }

      q = query(
        collection(db, 'evaluations'), 
        and(
          or(...teacherConditions),
          where('date', '>=', dateStr)
        ),
        orderBy('date', 'desc'),
        limit(50)
      );
    }
    
    return onSnapshot(q, (snapshot) => {
      let evaluations = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Evaluation));
      
      evaluations.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        const bTime = (b as any).timestamp?.toMillis?.() || 0;
        const aTime = (a as any).timestamp?.toMillis?.() || 0;
        return bTime - aTime;
      });
      
      callback(evaluations);
    }, (error) => {
      console.error("Error subscribing to evaluations:", error);
    });
  },

  subscribeAllEvaluations(teacherId: string, kuttabName: string | undefined, isAdmin: boolean, callback: (evaluations: Evaluation[]) => void) {
    let q;
    if (isAdmin) {
      q = query(
        collection(db, 'evaluations'),
        orderBy('date', 'desc'),
        limit(300)
      );
    } else {
      const teacherConditions: QueryFilterConstraint[] = [
        where('teacherId', '==', teacherId),
        where('kuttabResponsibleId', '==', teacherId)
      ];
      if (kuttabName) {
        teacherConditions.push(where('kuttabName', '==', kuttabName));
      }

      q = query(
        collection(db, 'evaluations'),
        or(...teacherConditions),
        orderBy('date', 'desc'),
        limit(300)
      );
    }
    
    return onSnapshot(q, (snapshot) => {
      let evaluations = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Evaluation));
      evaluations.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        const bTime = (b as any).timestamp?.toMillis?.() || 0;
        const aTime = (a as any).timestamp?.toMillis?.() || 0;
        return bTime - aTime;
      });
      callback(evaluations);
    }, (error) => {
      console.error("Error subscribing to all evaluations:", error);
    });
  },

  async getWeeklyEvaluationsByTeacher(teacherId: string, kuttabName: string | undefined, isAdmin: boolean = false) {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      
      const year = sevenDaysAgo.getFullYear();
      const month = String(sevenDaysAgo.getMonth() + 1).padStart(2, '0');
      const day = String(sevenDaysAgo.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      if (isAdmin) {
        const snap = await getDocs(query(
          collection(db, 'evaluations'), 
          where('date', '>=', dateStr),
          orderBy('date', 'desc'),
          limit(1000)
        ));
        return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Evaluation));
      }

      let q;
      if (kuttabName) {
        q = query(
          collection(db, 'evaluations'), 
          where('kuttabName', '==', kuttabName), 
          where('date', '>=', dateStr),
          orderBy('date', 'desc'),
          limit(1000)
        );
      } else {
        q = query(
          collection(db, 'evaluations'),
          and(
            or(
              where('teacherId', '==', teacherId),
              where('kuttabResponsibleId', '==', teacherId)
            ),
            where('date', '>=', dateStr)
          ),
          orderBy('date', 'desc'),
          limit(1000)
        );
      }

      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Evaluation));
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, 'evaluations');
    }
  },

  // Revisions
  async checkRevisionExists(studentId: string, teacherId: string, hizbNumber: number, quantity: number, date: string, excludeId?: string) {
    try {
      const q = query(
        collection(db, 'revisions'),
        where('studentId', '==', studentId),
        where('teacherId', '==', teacherId),
        where('hizbNumber', '==', hizbNumber),
        where('quantity', '==', quantity),
        where('date', '==', date)
      );
      const snapshot = await getDocs(q);
      if (excludeId) {
        return snapshot.docs.some(doc => doc.id !== excludeId);
      }
      return !snapshot.empty;
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, 'revisions');
    }
  },

  async checkOverlappingRevision(studentId: string, hizbNumber: number, quantityIdentifier: string, date: string, excludeId?: string) {
    try {
      const q = query(
        collection(db, 'revisions'),
        where('studentId', '==', studentId),
        where('hizbNumber', '==', hizbNumber),
        where('date', '==', date)
      );
      const snapshot = await getDocs(q);
      const currentCovered = getCoveredThumns(hizbNumber, quantityIdentifier);
      
      return snapshot.docs.some(doc => {
        if (excludeId && doc.id === excludeId) return false;
        const data = doc.data();
        const existingCovered = getCoveredThumns(hizbNumber, data.quantityIdentifier || '');
        return currentCovered.some(unit => existingCovered.includes(unit));
      });
    } catch (error) {
      console.error('Error checking overlapping revision:', error);
      return false;
    }
  },

  async addRevision(record: Omit<Revision, 'id'>) {
    try {
      const isSession = await this.isSessionDay(record.studentId, record.date);
      if (!isSession) {
        throw new Error('Revisions can only be added on scheduled session days.');
      }

      const student = await this.getStudent(record.studentId);
      
      const data = {
        ...record,
        studentEmail: student.email ? student.email.toLowerCase() : null,
        kuttabResponsibleId: student.kuttabResponsibleId || null,
        kuttabName: student.kuttabName || null,
        timestamp: serverTimestamp()
      };

      const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));

      const docRef = await addDoc(collection(db, 'revisions'), cleanData);
      
      // Ensure the student is marked as present for this day
      await this.ensurePresence(record.studentId, record.date, record.teacherId);

      await this.updateStudentStats(record.studentId);
      return docRef;
    } catch (error) {
      return handleFirestoreError(error, OperationType.CREATE, 'revisions');
    }
  },

  async updateRevision(id: string, data: Partial<Revision>, studentId: string) {
    try {
      const docRef = doc(db, 'revisions', id);
      
      const updateData = {
        ...data,
        updatedAt: serverTimestamp()
      };

      const cleanUpdateData = Object.fromEntries(Object.entries(updateData).filter(([_, v]) => v !== undefined));

      await setDoc(docRef, cleanUpdateData, { merge: true });

      // Ensure the student is marked as present for this day
      if (data.date || studentId) {
        const finalSnap = await getDoc(docRef);
        const finalData = finalSnap.data();
        if (finalData?.date && finalData?.teacherId) {
          await this.ensurePresence(studentId, finalData.date, finalData.teacherId);
        }
      }

      await this.updateStudentStats(studentId);
      return true;
    } catch (error) {
      return handleFirestoreError(error, OperationType.UPDATE, `revisions/${id}`);
    }
  },

  async deleteRevision(id: string, studentId?: string) {
    try {
      await deleteDoc(doc(db, 'revisions', id));
      if (studentId) {
        await this.updateStudentStats(studentId);
      }
      return true;
    } catch (error) {
      return handleFirestoreError(error, OperationType.DELETE, `revisions/${id}`);
    }
  },

  async getRevisionsByDate(teacherId: string, kuttabName: string | undefined, date: string, isAdmin: boolean = false) {
    try {
      if (isAdmin) {
        const snap = await getDocs(query(collection(db, 'revisions'), where('date', '==', date), limit(100)));
        return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Revision));
      }

      const q = query(
        collection(db, 'revisions'),
        and(
          or(
            where('teacherId', '==', teacherId),
            where('kuttabResponsibleId', '==', teacherId),
            ...(kuttabName ? [where('kuttabName', '==', kuttabName)] : [])
          ),
          where('date', '==', date)
        ),
        limit(100)
      );

      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Revision));
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, 'revisions');
    }
  },

  async getRevisions(studentId: string) {
    try {
      const q = query(
        collection(db, 'revisions'),
        where('studentId', '==', studentId),
        orderBy('date', 'desc'),
        limit(50) // Align with firestore rules limit
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Revision));
      
      // Secondary sort by timestamp for same-day entries
      return items.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        const bTime = (b as any).timestamp?.toMillis?.() || 0;
        const aTime = (a as any).timestamp?.toMillis?.() || 0;
        return bTime - aTime;
      });
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, 'revisions');
    }
  },

  async getWeeklyRevisionsByTeacher(teacherId: string, kuttabName: string | undefined, isAdmin: boolean = false) {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      
      const year = sevenDaysAgo.getFullYear();
      const month = String(sevenDaysAgo.getMonth() + 1).padStart(2, '0');
      const day = String(sevenDaysAgo.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      if (isAdmin) {
        const snap = await getDocs(query(
          collection(db, 'revisions'), 
          where('date', '>=', dateStr),
          orderBy('date', 'desc'),
          limit(1000)
        ));
        return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Revision));
      }

      let q;
      if (kuttabName) {
        q = query(
          collection(db, 'revisions'), 
          where('kuttabName', '==', kuttabName), 
          where('date', '>=', dateStr),
          orderBy('date', 'desc'),
          limit(1000)
        );
      } else {
        q = query(
          collection(db, 'revisions'),
          and(
            or(
              where('teacherId', '==', teacherId),
              where('kuttabResponsibleId', '==', teacherId)
            ),
            where('date', '>=', dateStr)
          ),
          orderBy('date', 'desc'),
          limit(1000)
        );
      }

      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Revision));
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, 'revisions');
    }
  },

  subscribeDailyRevisions(teacherId: string, kuttabName: string | undefined, isAdmin: boolean, callback: (revisions: Revision[]) => void) {
    const today = new Date().toISOString().split('T')[0];
    let q;
    if (isAdmin) {
      q = query(
        collection(db, 'revisions'), 
        where('date', '==', today),
        limit(50)
      );
    } else {
      const teacherConditions: QueryFilterConstraint[] = [
        where('teacherId', '==', teacherId),
        where('kuttabResponsibleId', '==', teacherId)
      ];
      if (kuttabName) {
        teacherConditions.push(where('kuttabName', '==', kuttabName));
      }

      q = query(
        collection(db, 'revisions'), 
        and(
          or(...teacherConditions),
          where('date', '==', today)
        ),
        limit(50)
      );
    }
    
    return onSnapshot(q, (snapshot) => {
      let revisions = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Revision));
      
      // Sort in-memory: Timestamp descending
      revisions.sort((a, b) => {
        const bTime = (b as any).timestamp?.toMillis?.() || 0;
        const aTime = (a as any).timestamp?.toMillis?.() || 0;
        return bTime - aTime;
      });
      
      callback(revisions);
    }, (error) => {
      console.error("Error subscribing to revisions:", error);
    });
  },

  async getDailyRevisionsByTeacher(teacherId: string, kuttabName: string | undefined, isAdmin: boolean = false) {
    try {
      const dateStr = new Date().toISOString().split('T')[0];

      if (isAdmin) {
        const snap = await getDocs(query(collection(db, 'revisions'), where('date', '==', dateStr), limit(100)));
        const revisions = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Revision));
        return revisions.sort((a, b) => {
          const bTime = (b as any).timestamp?.toMillis?.() || 0;
          const aTime = (a as any).timestamp?.toMillis?.() || 0;
          return bTime - aTime;
        });
      }

      const queries = [
        getDocs(query(collection(db, 'revisions'), where('teacherId', '==', teacherId), where('date', '==', dateStr), limit(100))),
        getDocs(query(collection(db, 'revisions'), where('kuttabResponsibleId', '==', teacherId), where('date', '==', dateStr), limit(100)))
      ];

      if (kuttabName) {
        queries.push(getDocs(query(collection(db, 'revisions'), where('kuttabName', '==', kuttabName), where('date', '==', dateStr), limit(100))));
      }

      const snapshots = await Promise.all(queries);

      const combinedDocs = [] as any[];
      snapshots.forEach(snap => {
        snap.docs.forEach(doc => {
          if (!combinedDocs.some(d => d.id === doc.id)) {
            combinedDocs.push(doc);
          }
        });
      });

      const revisions = combinedDocs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Revision));
      
      // Sort in-memory: Date descending (redundant for daily), then Timestamp descending
      return revisions.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        
        const bTime = (b as any).timestamp?.toMillis?.() || 0;
        const aTime = (a as any).timestamp?.toMillis?.() || 0;
        return bTime - aTime;
      });
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, 'revisions');
    }
  },

  async getDailyRevisionsByStudent(studentId: string) {
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const q = query(
        collection(db, 'revisions'),
        where('studentId', '==', studentId),
        where('date', '==', dateStr)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Revision));
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, 'revisions');
    }
  },

  subscribeMonthlyRevisions(teacherId: string, kuttabName: string | undefined, month: string, isAdmin: boolean, callback: (revisions: Revision[]) => void) {
    const startOfMonth = `${month}-01`;
    const endOfMonth = `${month}-31`;

    let q;
    if (isAdmin) {
      q = query(
        collection(db, 'revisions'),
        where('date', '>=', startOfMonth),
        where('date', '<=', endOfMonth),
        limit(100)
      );
    } else {
      const teacherConditions: QueryFilterConstraint[] = [
        where('teacherId', '==', teacherId),
        where('kuttabResponsibleId', '==', teacherId)
      ];
      if (kuttabName) {
        teacherConditions.push(where('kuttabName', '==', kuttabName));
      }

      q = query(
        collection(db, 'revisions'),
        and(
          where('date', '>=', startOfMonth),
          where('date', '<=', endOfMonth),
          or(...teacherConditions)
        ),
        limit(100)
      );
    }

    return onSnapshot(q, (snapshot) => {
      let revisions = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Revision));
      
      // Secondary filter in-memory for teacherId if needed (since Firebase doesn't support easy OR)
      // Actually, for consistency with getMonthlyRevisionsByTeacher, we could do more, but onSnapshot
      // is real-time. Let's keep it simple for now.
      
      revisions.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        const bTime = (b as any).timestamp?.toMillis?.() || 0;
        const aTime = (a as any).timestamp?.toMillis?.() || 0;
        return bTime - aTime;
      });

      callback(revisions);
    }, (error) => {
      console.error("Error subscribing to monthly revisions:", error);
    });
  },

  async approveNextRevision(nextRevision: NextRevision, qualityScore: number, notes: string = '') {
    try {
      const student = await this.getStudent(nextRevision.studentId);
      
      const revisionData: Omit<Revision, 'id'> = {
        studentId: nextRevision.studentId,
        studentEmail: (student.email || nextRevision.studentEmail || '').toLowerCase() || null,
        teacherId: nextRevision.teacherId,
        kuttabResponsibleId: nextRevision.kuttabResponsibleId || null,
        surahName: nextRevision.surahName,
        hizbNumber: nextRevision.hizbNumber,
        quantity: nextRevision.quantity,
        quantityIdentifier: nextRevision.quantityIdentifier || null,
        date: new Date().toISOString().split('T')[0], // Today is the completion date
        qualityScore,
        notes: notes || nextRevision.notes || ''
      };

      // Add to revisions
      await this.addRevision(revisionData);
      
      // Delete from next_revisions
      await this.deleteNextRevision(nextRevision.id);
      
      return true;
    } catch (error) {
      return handleFirestoreError(error, OperationType.WRITE, 'approval');
    }
  },

  async approveNextEvaluation(nextEvaluation: NextEvaluation, accuracyScore: number, mistakesCount: number, notes: string = '') {
    try {
      const student = await this.getStudent(nextEvaluation.studentId);
      
      const evaluationData: Omit<Evaluation, 'id'> = {
        studentId: nextEvaluation.studentId,
        studentEmail: (student.email || nextEvaluation.studentEmail || '').toLowerCase() || null,
        teacherId: nextEvaluation.teacherId,
        kuttabResponsibleId: nextEvaluation.kuttabResponsibleId || null,
        kuttabName: nextEvaluation.kuttabName,
        surahName: nextEvaluation.surahName,
        hizbNumber: nextEvaluation.hizbNumber,
        quantity: nextEvaluation.quantity,
        quantityIdentifier: nextEvaluation.quantityIdentifier || null,
        date: new Date().toISOString().split('T')[0], // Today is completion date
        accuracyScore,
        mistakesCount,
        notes: notes || nextEvaluation.notes || ''
      };

      // Add to evaluations
      await this.addEvaluation(evaluationData);
      
      // Delete from next_evaluations
      await this.deleteNextEvaluation(nextEvaluation.id);
      
      return true;
    } catch (error) {
      return handleFirestoreError(error, OperationType.WRITE, 'evaluationApproval');
    }
  },

  async handleNextEvaluationOverdue(nextEvaluation: NextEvaluation) {
    try {
      const today = new Date().toISOString().split('T')[0];
      if (nextEvaluation.dueDate < today) {
        await this.deleteNextEvaluation(nextEvaluation.id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error handling overdue evaluation task:', error);
      return false;
    }
  },

  async checkAndCleanupOverdueEvaluationTasks(teacherId: string, isAdmin: boolean, kuttabName?: string) {
    try {
      let q;
      if (isAdmin) {
        q = query(collection(db, 'next_evaluations'), limit(100));
      } else {
        const teacherConditions: QueryFilterConstraint[] = [
          where('teacherId', '==', teacherId),
          where('kuttabResponsibleId', '==', teacherId)
        ];
        if (kuttabName) {
          teacherConditions.push(where('kuttabName', '==', kuttabName));
        }

        q = query(
          collection(db, 'next_evaluations'),
          or(...teacherConditions),
          limit(50)
        );
      }

      const snapshot = await getDocs(q);
      const evaluationsByTeacher = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as NextEvaluation));
      
      const today = new Date().toISOString().split('T')[0];
      for (const ev of evaluationsByTeacher) {
        if (ev.dueDate < today) {
          await this.handleNextEvaluationOverdue(ev);
        }
      }
    } catch (error) {
      console.error("Error cleaning up overdue evaluation tasks:", error);
    }
  },

  async handleNextRevisionOverdue(nextRevision: NextRevision) {
    try {
      const today = new Date().toISOString().split('T')[0];
      if (nextRevision.dueDate < today) {
        // We only remove the overdue task to keep things clean, 
        // but WE NEVER delete the student automatically as it's too destructive.
        await this.deleteNextRevision(nextRevision.id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error handling overdue task:', error);
      return false;
    }
  },

  async checkAndCleanupOverdueTasks(teacherId: string, isAdmin: boolean, kuttabName?: string) {
    try {
      // This will be called when the dashboard or tasks page loads
      let q;
      if (isAdmin) {
        q = query(collection(db, 'next_revisions'), limit(100));
      } else {
        const teacherConditions: QueryFilterConstraint[] = [
          where('teacherId', '==', teacherId),
          where('kuttabResponsibleId', '==', teacherId)
        ];
        if (kuttabName) {
          teacherConditions.push(where('kuttabName', '==', kuttabName));
        }

        q = query(
          collection(db, 'next_revisions'),
          or(...teacherConditions),
          limit(50)
        );
      }

      const snapshot = await getDocs(q);
      const revisionsByTeacher = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as NextRevision));
      
      const today = new Date().toISOString().split('T')[0];
      for (const rev of revisionsByTeacher) {
        if (rev.dueDate < today) {
          await this.handleNextRevisionOverdue(rev);
        }
      }
    } catch (error) {
      console.error("Error cleaning up overdue tasks:", error);
    }
  },

  // Next Revisions
  async addNextRevision(data: Omit<NextRevision, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      let kuttabName = data.kuttabName;
      const student = await this.getStudent(data.studentId);
      if (!kuttabName) {
        kuttabName = student.kuttabName || null;
      }
      const studentEmail = (data.studentEmail || student.email || '').toLowerCase() || null;

      const docRef = await addDoc(collection(db, 'next_revisions'), {
        ...data,
        studentEmail,
        kuttabName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      return handleFirestoreError(error, OperationType.CREATE, 'next_revisions');
    }
  },

  async updateNextRevision(id: string, data: Partial<Omit<NextRevision, 'id' | 'createdAt' | 'updatedAt'>>) {
    try {
      const docRef = doc(db, 'next_revisions', id);
      await setDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      return handleFirestoreError(error, OperationType.UPDATE, `next_revisions/${id}`);
    }
  },

  async deleteNextRevision(id: string) {
    try {
      await deleteDoc(doc(db, 'next_revisions', id));
    } catch (error) {
      return handleFirestoreError(error, OperationType.DELETE, `next_revisions/${id}`);
    }
  },

  // Next Evaluations
  async addNextEvaluation(data: Omit<NextEvaluation, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      let kuttabName = data.kuttabName;
      const student = await this.getStudent(data.studentId);
      if (!kuttabName) {
        kuttabName = student.kuttabName || null;
      }
      const studentEmail = (data.studentEmail || student.email || '').toLowerCase() || null;

      const docRef = await addDoc(collection(db, 'next_evaluations'), {
        ...data,
        studentEmail,
        kuttabName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      return handleFirestoreError(error, OperationType.CREATE, 'next_evaluations');
    }
  },

  async updateNextEvaluation(id: string, data: Partial<Omit<NextEvaluation, 'id' | 'createdAt' | 'updatedAt'>>) {
    try {
      const docRef = doc(db, 'next_evaluations', id);
      await setDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      return handleFirestoreError(error, OperationType.UPDATE, `next_evaluations/${id}`);
    }
  },

  async deleteNextEvaluation(id: string) {
    try {
      await deleteDoc(doc(db, 'next_evaluations', id));
    } catch (error) {
      return handleFirestoreError(error, OperationType.DELETE, `next_evaluations/${id}`);
    }
  },

  subscribeNextRevisions(teacherId: string, kuttabName: string | undefined, isAdmin: boolean, callback: (revisions: NextRevision[]) => void) {
    let q;
    if (isAdmin) {
      q = query(
        collection(db, 'next_revisions'),
        orderBy('dueDate', 'asc'),
        limit(50)
      );
    } else {
      const teacherConditions: QueryFilterConstraint[] = [
        where('teacherId', '==', teacherId),
        where('kuttabResponsibleId', '==', teacherId)
      ];
      if (kuttabName) {
        teacherConditions.push(where('kuttabName', '==', kuttabName));
      }

      q = query(
        collection(db, 'next_revisions'),
        or(...teacherConditions),
        orderBy('dueDate', 'asc'),
        limit(50)
      );
    }

    return onSnapshot(q, (snapshot) => {
      const revisions = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as NextRevision));
      callback(revisions);
    }, (error) => {
      console.error("Error subscribing to next revisions:", error);
    });
  },

  subscribeNextEvaluations(teacherId: string, kuttabName: string | undefined, isAdmin: boolean, callback: (evaluations: NextEvaluation[]) => void) {
    let q;
    if (isAdmin) {
      q = query(
        collection(db, 'next_evaluations'),
        orderBy('dueDate', 'asc'),
        limit(50)
      );
    } else {
      const teacherConditions: QueryFilterConstraint[] = [
        where('teacherId', '==', teacherId),
        where('kuttabResponsibleId', '==', teacherId)
      ];
      if (kuttabName) {
        teacherConditions.push(where('kuttabName', '==', kuttabName));
      }

      q = query(
        collection(db, 'next_evaluations'),
        or(...teacherConditions),
        orderBy('dueDate', 'asc'),
        limit(50)
      );
    }

    return onSnapshot(q, (snapshot) => {
      const evaluations = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as NextEvaluation));
      callback(evaluations);
    }, (error) => {
      console.error("Error subscribing to next evaluations:", error);
    });
  },

  async getStudentNextRevisions(studentId: string) {
    try {
      const q = query(
        collection(db, 'next_revisions'), 
        where('studentId', '==', studentId),
        limit(50)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NextRevision));
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, 'next_revisions');
    }
  },

  async getStudentNextEvaluations(studentId: string) {
    try {
      const q = query(
        collection(db, 'next_evaluations'), 
        where('studentId', '==', studentId),
        limit(50)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NextEvaluation));
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, 'next_evaluations');
    }
  },

  subscribeStudentProfile(email: string, callback: (student: Student | null) => void) {
    const q = query(
      collection(db, 'students'),
      where('email', '==', email.toLowerCase()),
      limit(1)
    );

    return onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        callback(null);
      } else {
        const doc = snapshot.docs[0];
        callback({ id: doc.id, ...doc.data() } as Student);
      }
    }, (error) => {
      console.error("Error subscribing to student profile:", error);
    });
  },

  subscribeStudentNextRevisions(studentId: string, _studentEmail: string, callback: (revisions: NextRevision[]) => void) {
    const q = query(
      collection(db, 'next_revisions'),
      where('studentId', '==', studentId),
      limit(100)
    );
    
    return onSnapshot(q, (snapshot) => {
      const today = new Date().toISOString().split('T')[0];
      const items = snapshot.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as object) } as NextRevision))
        .filter(task => task.dueDate >= today)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      callback(items);
    }, (error) => {
      console.error("Error subscribing to student next revisions:", error);
    });
  },

  subscribeStudentNextEvaluations(studentId: string, _studentEmail: string, callback: (evaluations: NextEvaluation[]) => void) {
    const q = query(
      collection(db, 'next_evaluations'),
      where('studentId', '==', studentId),
      limit(100)
    );
    
    return onSnapshot(q, (snapshot) => {
      const today = new Date().toISOString().split('T')[0];
      const items = snapshot.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as object) } as NextEvaluation))
        .filter(task => task.dueDate >= today)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      callback(items);
    }, (error) => {
      console.error("Error subscribing to student next evaluations:", error);
    });
  },

  subscribeStudentAttendance(studentId: string, _studentEmail: string, callback: (attendance: Attendance[]) => void) {
    const q = query(
      collection(db, 'attendance'),
      where('studentId', '==', studentId),
      limit(100)
    );
    
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance));
      callback(data.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        const aTime = (a as any).timestamp?.toMillis?.() || 0;
        const bTime = (b as any).timestamp?.toMillis?.() || 0;
        return bTime - aTime;
      }));
    }, (error) => {
      console.error("Error subscribing to student attendance:", error);
    });
  },

  subscribeStudentEvaluations(studentId: string, _studentEmail: string, callback: (evaluations: Evaluation[]) => void) {
    const q = query(
      collection(db, 'evaluations'),
      where('studentId', '==', studentId),
      limit(100)
    );
    
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation));
      callback(data.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        const aTime = (a as any).timestamp?.toMillis?.() || 0;
        const bTime = (b as any).timestamp?.toMillis?.() || 0;
        return bTime - aTime;
      }));
    }, (error) => {
      console.error("Error subscribing to student evaluations:", error);
    });
  },

  subscribeStudentRevisions(studentId: string, _studentEmail: string, callback: (revisions: Revision[]) => void) {
    const q = query(
      collection(db, 'revisions'),
      where('studentId', '==', studentId),
      limit(100)
    );
 
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Revision));
      callback(data.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        const aTime = (a as any).timestamp?.toMillis?.() || 0;
        const bTime = (b as any).timestamp?.toMillis?.() || 0;
        return bTime - aTime;
      }));
    }, (error) => {
      console.error("Error subscribing to student revisions:", error);
    });
  },

  subscribeStudentMemorizations(studentId: string, _studentEmail: string, callback: (memorizations: Memorization[]) => void) {
    const q = query(
      collection(db, 'evaluations'),
      where('studentId', '==', studentId),
      limit(100)
    );
    
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const ev = doc.data() as Evaluation;
        return {
          id: doc.id,
          studentId: ev.studentId,
          studentEmail: ev.studentEmail,
          teacherId: ev.teacherId,
          kuttabResponsibleId: ev.kuttabResponsibleId,
          kuttabName: ev.kuttabName,
          surahName: ev.surahName || '',
          fromAyah: ev.fromAyah || 0,
          toAyah: ev.toAyah || 0,
          hizbNumber: ev.hizbNumber,
          quantity: ev.quantity,
          quantityIdentifier: ev.quantityIdentifier,
          date: ev.date
        } as Memorization;
      });
      callback(data.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        const aTime = (a as any).timestamp?.toMillis?.() || 0;
        const bTime = (b as any).timestamp?.toMillis?.() || 0;
        return bTime - aTime;
      }));
    }, (error) => {
      console.error("Error subscribing to student memorizations from evaluations:", error);
    });
  },

  // User Profiles & Roles
  async logSignIn(uid: string, email: string, displayName: string) {
    try {
      await addDoc(collection(db, 'login_history'), {
        userId: uid,
        email: email.toLowerCase(),
        displayName: displayName || 'Anonymous',
        userAgent: navigator.userAgent,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('Error logging sign in:', err);
    }
  },

  async getLoginHistory() {
    try {
      const q = query(
        collection(db, 'login_history'),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate 
          ? data.timestamp.toDate().toISOString() 
          : (new Date().toISOString());
        return { id: doc.id, ...data, timestamp };
      });
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, 'login_history');
    }
  },

  async upsertUserProfile(uid: string, data: Partial<UserProfile>) {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    
    // Remove undefined values to prevent Firestore errors
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );
    
    if (snap.exists()) {
      await updateDoc(userRef, { ...cleanData, updatedAt: serverTimestamp() });
      const existing = snap.data();
      return { ...existing, ...cleanData, uid } as any as UserProfile;
    } else {
      // Check if there is a pre-registered doc with this email
      if (data.email) {
        const q = query(collection(db, 'users'), where('email', '==', data.email.toLowerCase()));
        const emailSnap = await getDocs(q);
        
        if (!emailSnap.empty) {
          const oldDoc = emailSnap.docs[0];
          const oldData = oldDoc.data();

          // Firestore rules copy the role/kuttab from the pre-registered doc
          // named by migratedFrom, so it must still exist when this is written.
          const newUser = {
            ...oldData,
            ...cleanData,
            uid,
            migratedFrom: oldDoc.id,
            updatedAt: serverTimestamp()
          };
          await setDoc(userRef, newUser);

          // Then remove the pre-registered doc (it has a different ID)
          if (oldDoc.id !== uid) {
            await deleteDoc(doc(db, 'users', oldDoc.id));
          }
          return newUser as any as UserProfile;
        }
      }

      // Default to teacher unless specified
      const newUser = {
        uid,
        role: 'teacher' as UserRole,
        createdAt: serverTimestamp(),
        ...cleanData
      };
      await setDoc(userRef, newUser);
      return newUser as any as UserProfile;
    }
  },

  async getUserProfile(uid: string) {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    return snap.exists() ? (snap.data() as UserProfile) : null;
  },

  async getStudentByEmail(email: string) {
    try {
      const q = query(
        collection(db, 'students'), 
        where('email', '==', email.toLowerCase()),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as Student;
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, 'students');
    }
  },

  async getStudentsByEmail(email: string) {
    try {
      const q = query(collection(db, 'students'), where('email', '==', email.toLowerCase()));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Student));
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, 'students');
    }
  },

  async getUserByEmail(email: string) {
    try {
      const q = query(
        collection(db, 'users'), 
        where('email', '==', email.toLowerCase()),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return { uid: snap.docs[0].id, ...snap.docs[0].data() } as UserProfile;
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, 'users');
    }
  },

  async getUserById(uid: string) {
    try {
      const docRef = doc(db, 'users', uid);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      return { uid: snap.id, ...snap.data() } as UserProfile;
    } catch (error) {
      return handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    }
  },

  // User Management
  async getTeachers(kuttabName?: string) {
    let q;
    if (kuttabName) {
      q = query(
        collection(db, 'users'), 
        where('role', 'in', ['teacher', 'manager', 'admin']),
        where('kuttabName', '==', kuttabName)
      );
    } else {
      q = query(collection(db, 'users'), where('role', 'in', ['teacher', 'manager', 'admin']));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...(doc.data() as object), uid: doc.id } as UserProfile));
  },

  async getAllTeachers() {
    return this.getTeachers();
  },

  async deleteTeacher(uid: string) {
    await deleteDoc(doc(db, 'users', uid));
    return true;
  },

  async addTeacher(data: Omit<UserProfile, 'uid'>) {
    if (data.email) {
      const emailLower = data.email.toLowerCase();
      
      // Check if student exists (keep strict: a primary student account shouldn't be a teacher entry)
      const qStudents = query(collection(db, 'students'), where('email', '==', emailLower));
      const snapStudents = await getDocs(qStudents);
      if (!snapStudents.empty) {
        throw new Error('email_already_exists_as_student');
      }

      // Check if user already exists in users collection
      const qUsers = query(collection(db, 'users'), where('email', '==', emailLower));
      const snapUsers = await getDocs(qUsers);
      
      if (!snapUsers.empty) {
        // User exists, update them to the new role/kuttab instead of failing
        const existingDoc = snapUsers.docs[0];
        const userRef = doc(db, 'users', existingDoc.id);
        await updateDoc(userRef, {
          ...data,
          role: data.role || 'teacher',
          updatedAt: serverTimestamp()
        });
        return existingDoc.id;
      }
    }

    const userRef = await addDoc(collection(db, 'users'), {
      ...data,
      role: data.role || 'teacher',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return userRef.id;
  },

  async updateTeacher(uid: string, data: Partial<UserProfile>) {
    if (data.email) {
      await this.checkEmailUniqueness(data.email, uid, 'users');
    }
    const userRef = doc(db, 'users', uid);
    return await setDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
  },

  async getStudentDataForPortal(studentId: string, teacherId: string) {
    try {
      const email = auth.currentUser?.email;
      if (!email) return null;
      const todayStr = new Date().toISOString().split('T')[0];

      const [studentSnap, attendanceSnap, evaluationSnap, revisionSnap] = await Promise.all([
        getDoc(doc(db, 'students', studentId)),
        getDocs(query(
          collection(db, 'attendance'), 
          where('studentEmail', '==', email.toLowerCase()), 
          orderBy('date', 'desc'),
          limit(50)
        )),
        getDocs(query(
          collection(db, 'evaluations'), 
          where('studentEmail', '==', email.toLowerCase()), 
          orderBy('date', 'desc'),
          limit(50)
        )),
        getDocs(query(
          collection(db, 'revisions'), 
          where('studentEmail', '==', email.toLowerCase()), 
          where('date', '==', todayStr),
          orderBy('date', 'desc'),
          limit(50)
        ))
      ]);

      if (!studentSnap.exists()) return null;
      const student = { id: studentSnap.id, ...(studentSnap.data() as object) } as Student;

      const evalData = evaluationSnap.docs.map(d => ({ id: d.id, ...d.data() } as Evaluation)).sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        const bTime = (b as any).timestamp?.toMillis?.() || 0;
        const aTime = (a as any).timestamp?.toMillis?.() || 0;
        return bTime - aTime;
      });

      const revData = revisionSnap.docs.map(d => ({ id: d.id, ...d.data() } as Revision)).sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        const bTime = (b as any).timestamp?.toMillis?.() || 0;
        const aTime = (a as any).timestamp?.toMillis?.() || 0;
        return bTime - aTime;
      });

      return {
        student,
        attendance: attendanceSnap.docs.map(d => ({ id: d.id, ...d.data() } as Attendance)),
        evaluations: evalData,
        revisions: revData
      };
    } catch (error) {
      return handleFirestoreError(error, OperationType.GET, `portal/${studentId}`);
    }
  },

  async listCustomQuestions() {
    try {
      const snap = await getDocs(query(collection(db, 'smart_questions'), limit(1000)));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      return handleFirestoreError(error, OperationType.GET, 'smart_questions');
    }
  },

  async addCustomQuestion(data: any) {
    try {
      const docRef = await addDoc(collection(db, 'smart_questions'), {
        ...data,
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      return handleFirestoreError(error, OperationType.CREATE, 'smart_questions');
    }
  },

  async deleteCustomQuestion(id: string) {
    try {
      const docRef = doc(db, 'smart_questions', id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      return handleFirestoreError(error, OperationType.DELETE, `smart_questions/${id}`);
    }
  },

  async clearAllCustomQuestions() {
    try {
      const snap = await getDocs(query(collection(db, 'smart_questions'), limit(1500)));
      if (snap.empty) return true;
      
      const chunks: string[] = snap.docs.map(doc => doc.id);
      
      for (let i = 0; i < chunks.length; i += 400) {
        const batch = writeBatch(db);
        const chunkIds = chunks.slice(i, i + 400);
        for (const id of chunkIds) {
          batch.delete(doc(db, 'smart_questions', id));
        }
        await batch.commit();
      }
      return true;
    } catch (error) {
      return handleFirestoreError(error, OperationType.DELETE, 'smart_questions/clear_all');
    }
  },

  async addCustomQuestionsBulk(questions: any[]) {
    try {
      for (let i = 0; i < questions.length; i += 400) {
        const batch = writeBatch(db);
        const chunk = questions.slice(i, i + 400);
        for (const q of chunk) {
          const newDocRef = doc(collection(db, 'smart_questions'));
          batch.set(newDocRef, {
            ...q,
            createdAt: serverTimestamp()
          });
        }
        await batch.commit();
      }
      return true;
    } catch (error) {
      return handleFirestoreError(error, OperationType.CREATE, 'smart_questions/bulk');
    }
  }
};
