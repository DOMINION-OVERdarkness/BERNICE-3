import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User as FirebaseUser,
  onAuthStateChanged,
} from 'firebase/auth';
import { db, auth, storage, handleFirestoreError, OperationType } from '../firebase.ts';
import { StudyNote, Level, Faculty, FACULTIES, LEVELS } from '../types.ts';
import { api } from './api.ts';

const NOTES_COLLECTION = 'notes';
const ADMIN_EMAIL = 'overdarknessdominion@gmail.com';

export const firebaseService = {
  // Check if current user is admin
  isUserAdmin(user: FirebaseUser | null): boolean {
    if (!user) return false;
    if (user.email === ADMIN_EMAIL) return true;
    return false;
  },

  // Auth: Google Sign-in with popup
  async loginWithGoogle(): Promise<FirebaseUser> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    return result.user;
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },

  onAuthChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  // Fetch published notes for students (no login required)
  async getPublishedNotes(params?: {
    level?: Level;
    faculty?: Faculty;
    q?: string;
  }): Promise<StudyNote[]> {
    try {
      const notesRef = collection(db, NOTES_COLLECTION);
      const q = query(notesRef, where('isPublished', '==', true));
      const snapshot = await getDocs(q);

      let notes: StudyNote[] = snapshot.docs.map((d) => d.data() as StudyNote);

      // Merge with server notes to ensure unified access regardless of upload method
      try {
        const serverNotes = await api.getPublishedNotes();
        const map = new Map<string, StudyNote>();
        for (const n of notes) map.set(n.id, n);
        for (const sn of serverNotes) {
          if (!map.has(sn.id)) {
            map.set(sn.id, sn);
          }
        }
        notes = Array.from(map.values());
      } catch {
        // Fallback to whichever was retrieved
      }

      // Apply client-side filters
      if (params?.level) {
        notes = notes.filter((n) => n.level === params.level);
      }
      if (params?.faculty) {
        notes = notes.filter((n) => n.faculty === params.faculty);
      }
      if (params?.q && params.q.trim()) {
        const term = params.q.trim().toLowerCase();
        notes = notes.filter(
          (n) =>
            n.courseTitle.toLowerCase().includes(term) ||
            n.topic.toLowerCase().includes(term) ||
            n.lecturer.toLowerCase().includes(term) ||
            n.faculty.toLowerCase().includes(term) ||
            n.level.toLowerCase().includes(term)
        );
      }

      notes.sort(
        (a, b) => new Date(b.lastUpdated || b.uploadDate).getTime() - new Date(a.lastUpdated || a.uploadDate).getTime()
      );

      return notes;
    } catch (error) {
      console.warn('Firestore fetch failed, attempting server proxy fallback:', error);
      // Fallback to server API if permissions or offline
      return api.getPublishedNotes(params);
    }
  },

  // Real-time listener for student notes
  subscribePublishedNotes(
    callback: (notes: StudyNote[]) => void,
    onError?: (err: any) => void
  ) {
    const notesRef = collection(db, NOTES_COLLECTION);
    const q = query(notesRef, where('isPublished', '==', true));

    return onSnapshot(
      q,
      (snapshot) => {
        const notes = snapshot.docs.map((d) => d.data() as StudyNote);
        notes.sort(
          (a, b) =>
            new Date(b.lastUpdated || b.uploadDate).getTime() -
            new Date(a.lastUpdated || a.uploadDate).getTime()
        );
        callback(notes);
      },
      (error) => {
        console.warn('Firestore snapshot error:', error);
        if (onError) onError(error);
      }
    );
  },

  // Admin: Get all notes (published and unpublished)
  async getAllAdminNotes(): Promise<StudyNote[]> {
    try {
      const notesRef = collection(db, NOTES_COLLECTION);
      const snapshot = await getDocs(notesRef);
      const notes = snapshot.docs.map((d) => d.data() as StudyNote);
      notes.sort(
        (a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
      );
      return notes;
    } catch (error) {
      // Fallback to server admin endpoint
      const result = await api.getAdminNotes();
      return result.notes || [];
    }
  },

  // Upload PDF to Firebase Storage (or server fallback) and save metadata to Firestore
  async uploadNoteWithPdf(
    file: File,
    metadata: {
      courseTitle: string;
      topic: string;
      lecturer: string;
      level: Level;
      faculty: Faculty;
      isPublished: boolean;
    },
    onProgress?: (progressPct: number) => void
  ): Promise<StudyNote> {
    const id = `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    let fileUrl = '';

    // Attempt Firebase Cloud Storage upload
    try {
      const cleanFileName = `${id}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const storagePath = `pdf_notes/${metadata.level}/${cleanFileName}`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: 'application/pdf',
        customMetadata: {
          courseTitle: metadata.courseTitle,
          lecturer: metadata.lecturer,
        },
      });

      fileUrl = await new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            if (onProgress) onProgress(pct);
          },
          (err) => reject(err),
          async () => {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadUrl);
          }
        );
      });
    } catch (storageErr) {
      console.warn('Firebase Storage direct upload failed (using backend upload fallback):', storageErr);
      // Fallback to server multipart upload
      const formData = new FormData();
      formData.append('courseTitle', metadata.courseTitle);
      formData.append('topic', metadata.topic);
      formData.append('lecturer', metadata.lecturer);
      formData.append('level', metadata.level);
      formData.append('faculty', metadata.faculty);
      formData.append('isPublished', String(metadata.isPublished));
      formData.append('pdfFile', file);

      const saved = await api.uploadNote(formData);
      return saved;
    }

    const newNote: StudyNote = {
      id,
      courseTitle: metadata.courseTitle,
      topic: metadata.topic,
      lecturer: metadata.lecturer,
      level: metadata.level,
      faculty: metadata.faculty,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      pageCount: 1,
      isPublished: metadata.isPublished,
      uploadDate: now,
      lastUpdated: now,
    };

    // Save metadata to Firestore
    try {
      const docRef = doc(db, NOTES_COLLECTION, id);
      await setDoc(docRef, newNote);
    } catch (dbErr) {
      handleFirestoreError(dbErr, OperationType.CREATE, `${NOTES_COLLECTION}/${id}`);
    }

    return newNote;
  },

  // Update note metadata in Firestore
  async updateNoteMetadata(
    id: string,
    updates: Partial<StudyNote>
  ): Promise<void> {
    try {
      const docRef = doc(db, NOTES_COLLECTION, id);
      const payload = {
        ...updates,
        lastUpdated: new Date().toISOString(),
      };
      await updateDoc(docRef, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${NOTES_COLLECTION}/${id}`);
    }
  },

  // Toggle publish status in Firestore
  async togglePublishStatus(id: string, currentStatus: boolean): Promise<boolean> {
    const newStatus = !currentStatus;
    try {
      const docRef = doc(db, NOTES_COLLECTION, id);
      await updateDoc(docRef, {
        isPublished: newStatus,
        lastUpdated: new Date().toISOString(),
      });
      return newStatus;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${NOTES_COLLECTION}/${id}`);
    }
  },

  // Delete note from Firestore
  async deleteNote(id: string, fileUrl?: string): Promise<void> {
    try {
      const docRef = doc(db, NOTES_COLLECTION, id);
      await deleteDoc(docRef);

      // Also remove from storage if it is a firebase storage URL
      if (fileUrl && fileUrl.includes('firebasestorage')) {
        try {
          const storageRef = ref(storage, fileUrl);
          await deleteObject(storageRef);
        } catch {}
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${NOTES_COLLECTION}/${id}`);
    }
  },

  // Seed Firestore from local pre-seeded notes on initial boot
  async seedFirestoreFromLocal(notes: StudyNote[]): Promise<void> {
    for (const note of notes) {
      try {
        const docRef = doc(db, NOTES_COLLECTION, note.id);
        const existing = await getDoc(docRef);
        if (!existing.exists()) {
          await setDoc(docRef, note);
        }
      } catch (e) {
        // Silently continue if permissions or rules block anonymous seeding
      }
    }
  },
};
