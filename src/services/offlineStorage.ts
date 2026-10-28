import { StudyNote } from '../types.ts';

const DB_NAME = 'bub_study_notes_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_notes';

export interface OfflineNoteRecord {
  id: string;
  courseTitle: string;
  topic: string;
  lecturer: string;
  level: string;
  faculty: string;
  fileName: string;
  fileSize: number;
  downloadedAt: string;
  pdfBlob: Blob;
  ocrText?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open offline database'));
    };
  });
}

export const offlineStorage = {
  // Check if a note is downloaded in-app
  async isDownloaded(id: string): Promise<boolean> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);

        req.onsuccess = () => {
          resolve(!!req.result);
        };
        req.onerror = () => {
          resolve(false);
        };
      });
    } catch {
      return false;
    }
  },

  // Save a note and its PDF blob in-app
  async saveNoteInApp(
    note: StudyNote,
    onProgress?: (progressPct: number) => void
  ): Promise<void> {
    const db = await openDB();

    // Fetch the PDF binary data
    const pdfUrl = `/api/notes/${note.id}/pdf`;
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to download PDF stream (${response.status})`);
    }

    // Read stream to calculate progress
    const contentLength = Number(response.headers.get('content-length')) || note.fileSize || 1;
    let receivedBytes = 0;
    const chunks: Uint8Array[] = [];

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          receivedBytes += value.length;
          if (onProgress && contentLength > 0) {
            const pct = Math.min(Math.round((receivedBytes / contentLength) * 100), 99);
            onProgress(pct);
          }
        }
      }
    } else {
      const blob = await response.blob();
      chunks.push(new Uint8Array(await blob.arrayBuffer()));
    }

    if (onProgress) onProgress(100);

    const fullBlob = new Blob(chunks as any[], { type: 'application/pdf' });

    const record: OfflineNoteRecord = {
      id: note.id,
      courseTitle: note.courseTitle,
      topic: note.topic,
      lecturer: note.lecturer,
      level: note.level,
      faculty: note.faculty,
      fileName: note.fileName,
      fileSize: fullBlob.size || note.fileSize,
      downloadedAt: new Date().toISOString(),
      pdfBlob: fullBlob,
      ocrText: note.ocrText,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const putReq = store.put(record);

      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error || new Error('Failed to save in-app download'));
    });
  },

  // Get all in-app downloaded notes
  async getAllOfflineNotes(): Promise<OfflineNoteRecord[]> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const records = (req.result || []) as OfflineNoteRecord[];
          records.sort(
            (a, b) =>
              new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
          );
          resolve(records);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Could not read offline notes:', err);
      return [];
    }
  },

  // Get single offline note by ID
  async getOfflineNote(id: string): Promise<OfflineNoteRecord | null> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);

        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  // Get a blob object URL for offline rendering
  async getOfflineBlobUrl(id: string): Promise<string | null> {
    const record = await this.getOfflineNote(id);
    if (!record || !record.pdfBlob) return null;
    return URL.createObjectURL(record.pdfBlob);
  },

  // Remove downloaded note from in-app storage
  async removeOfflineNote(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  // Get total storage used in bytes
  async getTotalStorageUsed(): Promise<{ totalBytes: number; count: number }> {
    const notes = await this.getAllOfflineNotes();
    const totalBytes = notes.reduce((sum, n) => sum + (n.fileSize || 0), 0);
    return { totalBytes, count: notes.length };
  },
};
