import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Volume2,
  Trash2,
  Download,
  HardDrive,
  WifiOff,
  CheckCircle2,
  Calendar,
  User,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { StudyNote } from '../types.ts';
import { offlineStorage, OfflineNoteRecord } from '../services/offlineStorage.ts';

interface OfflineDownloadsProps {
  onSelectOfflineNote: (note: StudyNote) => void;
  onOpenReadAloudOffline: (note: StudyNote) => void;
  onBackToHome: () => void;
  onStorageChanged: () => void;
}

export const OfflineDownloads: React.FC<OfflineDownloadsProps> = ({
  onSelectOfflineNote,
  onOpenReadAloudOffline,
  onBackToHome,
  onStorageChanged,
}) => {
  const [offlineNotes, setOfflineNotes] = useState<OfflineNoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStorage, setTotalStorage] = useState<{ totalBytes: number; count: number }>({
    totalBytes: 0,
    count: 0,
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadOfflineNotes = async () => {
    try {
      setLoading(true);
      const records = await offlineStorage.getAllOfflineNotes();
      setOfflineNotes(records);
      const storageInfo = await offlineStorage.getTotalStorageUsed();
      setTotalStorage(storageInfo);
    } catch (err) {
      console.error('Failed to load offline notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfflineNotes();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await offlineStorage.removeOfflineNote(id);
      setDeleteConfirmId(null);
      await loadOfflineNotes();
      onStorageChanged();
    } catch (err) {
      console.error('Failed to remove offline note:', err);
    }
  };

  const handleExportToFile = (record: OfflineNoteRecord) => {
    const url = URL.createObjectURL(record.pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = record.fileName || `${record.courseTitle}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'PDF';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recently';
    }
  };

  // Convert OfflineNoteRecord to StudyNote
  const toStudyNote = (record: OfflineNoteRecord): StudyNote => {
    return {
      id: record.id,
      courseTitle: record.courseTitle,
      topic: record.topic,
      lecturer: record.lecturer,
      level: record.level as any,
      faculty: record.faculty as any,
      fileUrl: `/api/notes/${record.id}/pdf`,
      fileName: record.fileName,
      fileSize: record.fileSize,
      pageCount: 1,
      isPublished: true,
      uploadDate: record.downloadedAt,
      lastUpdated: record.downloadedAt,
      ocrText: record.ocrText,
    };
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-sm font-semibold transition cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Course Portal</span>
        </button>

        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-900 text-emerald-300 text-xs font-bold tracking-wide shadow-sm">
          <WifiOff className="w-4 h-4" />
          <span>Offline Study Mode: Active</span>
        </div>
      </div>

      {/* Hero card for In-App Downloads */}
      <div className="bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-emerald-800/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>In-App Device Storage (IndexedDB)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              My In-App Downloads
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/90 max-w-xl leading-relaxed">
              These course lecture notes are stored locally inside this app on your phone or computer. You can open, read, zoom, and listen to them anytime without using any mobile data or internet!
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 text-center sm:text-right shrink-0">
            <div className="text-xs uppercase tracking-wider text-emerald-300 font-bold flex items-center justify-center sm:justify-end space-x-1.5">
              <HardDrive className="w-4 h-4" />
              <span>Device Storage</span>
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {formatFileSize(totalStorage.totalBytes)}
            </div>
            <div className="text-xs text-emerald-200 mt-0.5">
              {totalStorage.count} {totalStorage.count === 1 ? 'Note Saved' : 'Notes Saved'}
            </div>
          </div>
        </div>
      </div>

      {/* Downloaded Notes List */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-sm">
          Loading in-app downloads...
        </div>
      ) : offlineNotes.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {offlineNotes.map((record) => (
            <div
              key={record.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-5 sm:p-6 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Saved In-App</span>
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200">
                      {record.level}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {formatFileSize(record.fileSize)}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {record.courseTitle}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    <strong className="text-slate-800">Topic:</strong> {record.topic}
                  </p>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 pt-1">
                  <div className="flex items-center space-x-2">
                    <User className="w-3.5 h-3.5 text-purple-700" />
                    <span>Lecturer: {record.lecturer}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span className="truncate">{record.faculty}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400 pt-0.5">
                    <Calendar className="w-3 h-3" />
                    <span>Downloaded: {formatDate(record.downloadedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 sm:pt-5 mt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <button
                  onClick={() => onSelectOfflineNote(toStudyNote(record))}
                  className="min-h-[46px] w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 active:bg-purple-950 text-amber-300 font-bold text-xs transition shadow-sm cursor-pointer active:scale-95"
                >
                  <BookOpen className="w-4 h-4 text-amber-300" />
                  <span>Open Offline E-Book</span>
                </button>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => onOpenReadAloudOffline(toStudyNote(record))}
                    className="min-h-[44px] flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 border border-amber-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-95"
                    title="Listen with Read Aloud offline"
                  >
                    <Volume2 className="w-4 h-4 text-amber-700" />
                    <span>Read Aloud</span>
                  </button>

                  <button
                    onClick={() => handleExportToFile(record)}
                    className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center transition cursor-pointer active:scale-95"
                    title="Export file to device storage"
                    aria-label="Export PDF"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-600" />
                  </button>

                  <button
                    onClick={() => setDeleteConfirmId(record.id)}
                    className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center transition cursor-pointer active:scale-95"
                    title="Remove from in-app storage"
                    aria-label="Delete offline copy"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-800 mx-auto flex items-center justify-center">
            <Download className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">
              No In-App Downloads Yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              When you download course notes inside the app, they appear here and remain 100% accessible even when you are disconnected from the internet.
            </p>
          </div>
          <button
            onClick={onBackToHome}
            className="px-5 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-amber-300 font-bold text-xs shadow-md transition cursor-pointer"
          >
            Browse & Download Course Notes
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Remove from In-App Storage?</h3>
              <p className="text-xs text-slate-500">
                This will free up device storage by deleting the offline copy. You can re-download it anytime while online.
              </p>
            </div>

            <div className="pt-2 flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
