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
  type DocumentData
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import type { Student, Attendance, Memorization, Evaluation, Revision, UserProfile, UserRole, Kuttab, NextRevision } from '../types';
import { getCoveredThumns } from '../lib/quranUtils';

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
    const snapshot = await getDocs(collection(db, 'kuttabs'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Kuttab));
  },

  async deleteKuttab(id: string) {
    await deleteDoc(doc(db, 'kuttabs', id));
    return true;
  },

  async updateKuttab(id: string, data: Partial<Kuttab>) {
    const docRef = doc(db, 'kuttabs', id);
    return await setDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
  },

  async getKuttabByName(name: string) {
    const q = query(collection(db, 'kuttabs'), where('name', '==', name));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Kuttab;
  },

  // Students
  async addStudent(student: Omit<Student, 'id'>) {
    let kuttabResponsibleId = student.teacherId;
    
    if (student.kuttabName) {
      const q = query(collection(db, 'kuttabs'), where('name', '==', student.kuttabName));
      const snap = await getDocs(q);
      if (!snap.empty) {
        kuttabResponsibleId = snap.docs[0].data().teacherId;
      }
    }

    if (student.email) {
      const qEmail = query(collection(db, 'students'), where('email', '==', student.email.toLowerCase()));
      const snapEmail = await getDocs(qEmail);
      if (!snapEmail.empty) {
        throw new Error('A student with this email already exists.');
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
    const queries = [
      getDocs(query(collection(db, 'students'), where('teacherId', '==', teacherId))),
      getDocs(query(collection(db, 'students'), where('kuttabResponsibleId', '==', teacherId)))
    ];

    if (kuttabName) {
      queries.push(getDocs(query(collection(db, 'students'), where('kuttabName', '==', kuttabName))));
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

    return combinedDocs.map(doc => {
      const data = doc.data();
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

  async getAllStudents() {
    const snapshot = await getDocs(collection(db, 'students'));
    return snapshot.docs.map(doc => {
      const data = doc.data();
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
      return onSnapshot(query(collection(db, 'students')), (snapshot) => {
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
    const conditions = [
      where('teacherId', '==', teacherId),
      where('kuttabResponsibleId', '==', teacherId)
    ];

    if (kuttabName) {
      conditions.push(where('kuttabName', '==', kuttabName));
    }

    const q = query(
      collection(db, 'students'),
      or(...conditions)
    );
    
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

  // Attendance
  async saveAttendance(records: Omit<Attendance, 'id'>[]) {
    // For each record, check if it exists and update or create
    const promises = records.map(async (record) => {
      try {
        const student = await this.getStudent(record.studentId);
        const enrichedRecord = {
          ...record,
          studentEmail: student.email || null,
          kuttabResponsibleId: student.kuttabResponsibleId || null,
          kuttabName: student.kuttabName || null
        };

        const q = query(
          collection(db, 'attendance'),
          where('studentId', '==', record.studentId),
          where('teacherId', '==', record.teacherId),
          where('date', '==', record.date)
        );
        const snapshot = await getDocs(q);
        
        // Filter undefined values for Firestore
        const cleanData = Object.fromEntries(
          Object.entries({
            ...enrichedRecord,
            timestamp: serverTimestamp()
          }).filter(([_, v]) => v !== undefined)
        );

        if (!snapshot.empty) {
          const docRef = doc(db, 'attendance', snapshot.docs[0].id);
          return updateDoc(docRef, cleanData);
        } else {
          return addDoc(collection(db, 'attendance'), cleanData);
        }
      } catch (err) {
        console.error(`Error saving attendance for student ${record.studentId}:`, err);
        throw err;
      }
    });

    await Promise.all(promises);
    
    // Update stats for all affected students
    const uniqueStudentIds = Array.from(new Set(records.map(r => r.studentId)));
    const teacherId = records[0]?.teacherId;
    if (teacherId) {
      // Use teacherId for fetching records they touched, but stats update might need more broad view
      await Promise.all(uniqueStudentIds.map(sid => this.updateStudentStats(sid)));
    }
    
    return true;
  },

  async getAttendanceByDate(teacherId: string, kuttabName: string | undefined, date: string, isAdmin: boolean = false) {
    if (isAdmin) {
      const snap = await getDocs(query(collection(db, 'attendance'), where('date', '==', date)));
      return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Attendance));
    }
    const queries = [
      getDocs(query(collection(db, 'attendance'), where('teacherId', '==', teacherId), where('date', '==', date))),
      getDocs(query(collection(db, 'attendance'), where('kuttabResponsibleId', '==', teacherId), where('date', '==', date)))
    ];

    if (kuttabName) {
      queries.push(getDocs(query(collection(db, 'attendance'), where('kuttabName', '==', kuttabName), where('date', '==', date))));
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

  async getStudentAttendance(studentId: string) {
    const q = query(
      collection(db, 'attendance'),
      where('studentId', '==', studentId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Attendance));
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
      const snap = await getDocs(query(collection(db, 'attendance'), where('date', '>=', dateStr)));
      const records = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Attendance));
      return records.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        const bTime = (b as any).timestamp?.toMillis?.() || 0;
        const aTime = (a as any).timestamp?.toMillis?.() || 0;
        return bTime - aTime;
      });
    }

    const queries = [
      getDocs(query(collection(db, 'attendance'), where('teacherId', '==', teacherId), where('date', '>=', dateStr))),
      getDocs(query(collection(db, 'attendance'), where('kuttabResponsibleId', '==', teacherId), where('date', '>=', dateStr)))
    ];

    if (kuttabName) {
      queries.push(getDocs(query(collection(db, 'attendance'), where('kuttabName', '==', kuttabName), where('date', '>=', dateStr))));
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

    const records = combinedDocs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Attendance));
    
    return records.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      const bTime = (b as any).timestamp?.toMillis?.() || 0;
      const aTime = (a as any).timestamp?.toMillis?.() || 0;
      return bTime - aTime;
    });
  },

  // Memorization
  async addMemorization(record: Omit<Memorization, 'id'>) {
    const student = await this.getStudent(record.studentId);
    const docRef = await addDoc(collection(db, 'memorizations'), {
      ...record,
      studentEmail: student.email || null,
      kuttabResponsibleId: student.kuttabResponsibleId || null,
      kuttabName: student.kuttabName || null,
      timestamp: serverTimestamp()
    });
    await this.updateStudentStats(record.studentId);
    return docRef;
  },

  async getMemorizations(studentId: string) {
    const q = query(
      collection(db, 'memorizations'),
      where('studentId', '==', studentId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Memorization));
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
      const student = await this.getStudent(record.studentId);
      
      const data = {
        ...record,
        studentEmail: student.email || null,
        kuttabResponsibleId: student.kuttabResponsibleId || null,
        kuttabName: student.kuttabName || null,
        timestamp: serverTimestamp()
      };

      const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));

      const docRef = await addDoc(collection(db, 'evaluations'), cleanData);
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
          where('studentId', '==', studentId)
        )),
        getDocs(query(
          collection(db, 'evaluations'), 
          where('studentId', '==', studentId)
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
        accuracy,
        memorizationProgress,
        totalHizbs,
        totalScore,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error updating student stats:', err);
    }
  },

  async getEvaluations(studentId: string) {
    try {
      const q = query(
        collection(db, 'evaluations'),
        where('studentId', '==', studentId),
        orderBy('date', 'desc')
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
      q = query(collection(db, 'evaluations'), where('date', '>=', dateStr));
    } else {
      const teacherConditions = [
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
        orderBy('date', 'desc')
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
        const snap = await getDocs(query(collection(db, 'evaluations'), where('date', '>=', dateStr)));
        const evaluations = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Evaluation));
        return evaluations.sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;
          const bTime = (b as any).timestamp?.toMillis?.() || 0;
          const aTime = (a as any).timestamp?.toMillis?.() || 0;
          return bTime - aTime;
        });
      }

      const queries = [
        getDocs(query(collection(db, 'evaluations'), where('teacherId', '==', teacherId), where('date', '>=', dateStr))),
        getDocs(query(collection(db, 'evaluations'), where('kuttabResponsibleId', '==', teacherId), where('date', '>=', dateStr)))
      ];

      if (kuttabName) {
        queries.push(getDocs(query(collection(db, 'evaluations'), where('kuttabName', '==', kuttabName), where('date', '>=', dateStr))));
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

      const evaluations = combinedDocs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Evaluation));
      
      // Sort in-memory: Date descending, then Timestamp descending
      return evaluations.sort((a, b) => {
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
      const student = await this.getStudent(record.studentId);
      
      const data = {
        ...record,
        studentEmail: student.email || null,
        kuttabResponsibleId: student.kuttabResponsibleId || null,
        kuttabName: student.kuttabName || null,
        timestamp: serverTimestamp()
      };

      const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));

      const docRef = await addDoc(collection(db, 'revisions'), cleanData);
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

  async getRevisions(studentId: string) {
    try {
      const q = query(
        collection(db, 'revisions'),
        where('studentId', '==', studentId),
        orderBy('date', 'desc')
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
        const snap = await getDocs(query(collection(db, 'revisions'), where('date', '>=', dateStr)));
        const revisions = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Revision));
        return revisions.sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;
          const bTime = (b as any).timestamp?.toMillis?.() || 0;
          const aTime = (a as any).timestamp?.toMillis?.() || 0;
          return bTime - aTime;
        });
      }

      const queries = [
        getDocs(query(collection(db, 'revisions'), where('teacherId', '==', teacherId), where('date', '>=', dateStr))),
        getDocs(query(collection(db, 'revisions'), where('kuttabResponsibleId', '==', teacherId), where('date', '>=', dateStr)))
      ];

      if (kuttabName) {
        queries.push(getDocs(query(collection(db, 'revisions'), where('kuttabName', '==', kuttabName), where('date', '>=', dateStr))));
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
      
      // Sort in-memory: Date descending, then Timestamp descending
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

  subscribeDailyRevisions(teacherId: string, kuttabName: string | undefined, isAdmin: boolean, callback: (revisions: Revision[]) => void) {
    const today = new Date().toISOString().split('T')[0];
    let q;
    if (isAdmin) {
      q = query(collection(db, 'revisions'), where('date', '==', today));
    } else {
      const teacherConditions = [
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
        )
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
        const snap = await getDocs(query(collection(db, 'revisions'), where('date', '==', dateStr)));
        const revisions = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Revision));
        return revisions.sort((a, b) => {
          const bTime = (b as any).timestamp?.toMillis?.() || 0;
          const aTime = (a as any).timestamp?.toMillis?.() || 0;
          return bTime - aTime;
        });
      }

      const queries = [
        getDocs(query(collection(db, 'revisions'), where('teacherId', '==', teacherId), where('date', '==', dateStr))),
        getDocs(query(collection(db, 'revisions'), where('kuttabResponsibleId', '==', teacherId), where('date', '==', dateStr)))
      ];

      if (kuttabName) {
        queries.push(getDocs(query(collection(db, 'revisions'), where('kuttabName', '==', kuttabName), where('date', '==', dateStr))));
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
        where('date', '<=', endOfMonth)
      );
    } else {
      const teacherConditions = [
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
        )
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

  async getMonthlyRevisionsByTeacher(teacherId: string, kuttabName: string | undefined, month: string, isAdmin: boolean = false) {
    try {
      // month is expected as "YYYY-MM"
      const startOfMonth = `${month}-01`;
      const endOfMonth = `${month}-31`; // Simple approach, Firestore range query will handle it

      if (isAdmin) {
        const q = query(
          collection(db, 'revisions'),
          where('date', '>=', startOfMonth),
          where('date', '<=', endOfMonth)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as Revision));
      }

      const queries = [
        getDocs(query(collection(db, 'revisions'), where('teacherId', '==', teacherId), where('date', '>=', startOfMonth), where('date', '<=', endOfMonth))),
        getDocs(query(collection(db, 'revisions'), where('kuttabResponsibleId', '==', teacherId), where('date', '>=', startOfMonth), where('date', '<=', endOfMonth)))
      ];

      if (kuttabName) {
        queries.push(getDocs(query(collection(db, 'revisions'), where('kuttabName', '==', kuttabName), where('date', '>=', startOfMonth), where('date', '<=', endOfMonth))));
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

  async approveNextRevision(nextRevision: NextRevision, qualityScore: number, notes: string = '') {
    try {
      const student = await this.getStudent(nextRevision.studentId);
      
      const revisionData: Omit<Revision, 'id'> = {
        studentId: nextRevision.studentId,
        studentEmail: nextRevision.studentEmail || null,
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

  async handleNextRevisionOverdue(nextRevision: NextRevision) {
    try {
      const today = new Date().toISOString().split('T')[0];
      if (nextRevision.dueDate < today) {
        // "if the students doesn't make the revision he will be deleted automaticly"
        // Deleting student record as requested
        await this.deleteStudent(nextRevision.studentId);
        // Also delete the task
        await this.deleteNextRevision(nextRevision.id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error handling overdue task:', error);
      return false;
    }
  },

  async checkAndCleanupOverdueTasks(teacherId: string, isAdmin: boolean) {
    // This will be called when the dashboard or tasks page loads
    const snapshot = await getDocs(query(collection(db, 'next_revisions')));
    const revisionsByTeacher = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NextRevision))
      .filter(r => isAdmin || r.teacherId === teacherId || r.kuttabResponsibleId === teacherId);
    
    const today = new Date().toISOString().split('T')[0];
    for (const rev of revisionsByTeacher) {
      if (rev.dueDate < today) {
        await this.handleNextRevisionOverdue(rev);
      }
    }
  },

  // Next Revisions
  async addNextRevision(data: Omit<NextRevision, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      let kuttabName = data.kuttabName;
      if (!kuttabName) {
        const student = await this.getStudent(data.studentId);
        kuttabName = student.kuttabName || null;
      }

      const docRef = await addDoc(collection(db, 'next_revisions'), {
        ...data,
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

  subscribeNextRevisions(teacherId: string, kuttabName: string | undefined, isAdmin: boolean, callback: (revisions: NextRevision[]) => void) {
    let q;
    if (isAdmin) {
      q = query(
        collection(db, 'next_revisions'),
        orderBy('dueDate', 'asc')
      );
    } else {
      const teacherConditions = [
        where('teacherId', '==', teacherId),
        where('kuttabResponsibleId', '==', teacherId)
      ];
      if (kuttabName) {
        teacherConditions.push(where('kuttabName', '==', kuttabName));
      }

      q = query(
        collection(db, 'next_revisions'),
        or(...teacherConditions),
        orderBy('dueDate', 'asc')
      );
    }

    return onSnapshot(q, (snapshot) => {
      const revisions = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as NextRevision));
      callback(revisions);
    }, (error) => {
      console.error("Error subscribing to next revisions:", error);
    });
  },

  async getStudentNextRevisions(studentId: string) {
    try {
      const q = query(collection(db, 'next_revisions'), where('studentId', '==', studentId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NextRevision));
    } catch (error) {
      return handleFirestoreError(error, OperationType.GET, 'next_revisions');
    }
  },

  subscribeStudentNextRevisions(studentEmail: string, callback: (revisions: NextRevision[]) => void) {
    const q = query(
      collection(db, 'next_revisions'),
      where('studentEmail', '==', studentEmail),
      where('dueDate', '>=', new Date().toISOString().split('T')[0]),
      orderBy('dueDate', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const revisions = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) } as NextRevision));
      callback(revisions);
    }, (error) => {
      console.error("Error subscribing to student next revisions:", error);
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
          
          // Delete old doc if it has a different ID
          if (oldDoc.id !== uid) {
            await deleteDoc(doc(db, 'users', oldDoc.id));
          }

          const newUser = {
            uid,
            ...oldData,
            ...cleanData,
            updatedAt: serverTimestamp()
          };
          await setDoc(userRef, newUser);
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
    const q = query(collection(db, 'students'), where('email', '==', email.toLowerCase()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Student;
  },

  async getUserByEmail(email: string) {
    const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { uid: snap.docs[0].id, ...snap.docs[0].data() } as UserProfile;
  },

  async getUserById(uid: string) {
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { uid: snap.id, ...snap.data() } as UserProfile;
  },

  // User Management
  async getTeachers(kuttabName?: string) {
    let q;
    if (kuttabName) {
      q = query(
        collection(db, 'users'), 
        where('role', 'in', ['teacher', 'admin']),
        where('kuttabName', '==', kuttabName)
      );
    } else {
      q = query(collection(db, 'users'), where('role', 'in', ['teacher', 'admin']));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...(doc.data() as object), uid: doc.id } as UserProfile));
  },

  async updateTeacher(uid: string, data: Partial<UserProfile>) {
    const userRef = doc(db, 'users', uid);
    return await setDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
  },

  async deleteTeacher(uid: string) {
    await deleteDoc(doc(db, 'users', uid));
    return true;
  },

  async addTeacher(data: Omit<UserProfile, 'uid'>) {
    const q = query(collection(db, 'users'), where('email', '==', data.email.toLowerCase()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      throw new Error('A teacher with this email already exists.');
    }
    const userRef = await addDoc(collection(db, 'users'), {
      ...data,
      role: data.role || 'teacher',
      createdAt: serverTimestamp()
    });
    return userRef.id;
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
          orderBy('date', 'desc')
        )),
        getDocs(query(
          collection(db, 'evaluations'), 
          where('studentEmail', '==', email.toLowerCase()), 
          orderBy('date', 'desc')
        )),
        getDocs(query(
          collection(db, 'revisions'), 
          where('studentEmail', '==', email.toLowerCase()), 
          where('date', '==', todayStr),
          orderBy('date', 'desc')
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
  }
};
