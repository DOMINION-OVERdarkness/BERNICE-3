import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Volume2,
  Download,
  Search,
  FileText,
  User,
  Calendar,
  HardDrive,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Faculty, Level, StudyNote } from '../types.ts';
import { api } from '../services/api.ts';
import { offlineStorage } from '../services/offlineStorage.ts';

interface CourseListProps {
  selectedLevel: Level;
  selectedFaculty: Faculty;
  notes: StudyNote[];
  onSelectNote: (note: StudyNote) => void;
  onOpenReadAloudDirect: (note: StudyNote) => void;
  onBackToFaculty: () => void;
  onBackToLevel: () => void;
  onDownloadStatusChange?: () => void;
}

export const CourseList: React.FC<CourseListProps> = ({
  selectedLevel,
  selectedFaculty,
  notes,
  onSelectNote,
  onOpenReadAloudDirect,
  onBackToFaculty,
  onBackToLevel,
  onDownloadStatusChange,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  useEffect(() => {
    async function loadDownloadedStatus() {
      const offlineList = await offlineStorage.getAllOfflineNotes();
      setDownloadedIds(new Set(offlineList.map((n) => n.id)));
    }
    loadDownloadedStatus();
  }, []);

  const handleInAppDownload = async (note: StudyNote) => {
    try {
      setDownloadingId(note.id);
      await offlineStorage.saveNoteInApp(note);
      setDownloadedIds((prev) => new Set([...prev, note.id]));
      setDownloadToast(`"${note.courseTitle}" saved in-app! You can access it offline anytime in "My Downloads".`);
      if (onDownloadStatusChange) onDownloadStatusChange();
      setTimeout(() => setDownloadToast(null), 5000);
    } catch (err: any) {
      setDownloadToast(`Failed to save note in-app: ${err.message || 'Network error'}`);
      setTimeout(() => setDownloadToast(null), 5000);
    } finally {
      setDownloadingId(null);
    }
  };

  // Filter notes strictly by selectedLevel and selectedFaculty
  const matchingNotes = notes.filter(
    (n) => n.level === selectedLevel && n.faculty === selectedFaculty
  );

  // Sub-filter by search text if student types
  const displayedNotes = matchingNotes.filter((n) => {
    if (!filterQuery.trim()) return true;
    const term = filterQuery.toLowerCase();
    return (
      n.courseTitle.toLowerCase().includes(term) ||
      n.topic.toLowerCase().includes(term) ||
      n.lecturer.toLowerCase().includes(term)
    );
  });

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'PDF Document';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* In-app download toast alert */}
      {downloadToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-900 text-emerald-100 border border-emerald-800 text-xs flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="font-semibold">{downloadToast}</span>
          </div>
          <button
            onClick={() => setDownloadToast(null)}
            className="text-emerald-300 hover:text-white underline text-xs cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onBackToFaculty}
            className="min-h-[44px] inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-300 text-slate-800 text-sm font-bold transition cursor-pointer shadow-sm active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-purple-900" />
            <span>Back to Faculties</span>
          </button>
          <button
            onClick={onBackToLevel}
            className="min-h-[44px] inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-semibold hover:bg-slate-200/50 transition cursor-pointer"
          >
            <span>Change Level ({selectedLevel})</span>
          </button>
        </div>

        {/* Selected context badges */}
        <div className="flex items-center space-x-2">
          <span className="px-3 py-1.5 rounded-xl bg-purple-900 text-amber-300 font-bold text-xs shadow-sm">
            {selectedLevel}
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-amber-500 text-purple-950 font-bold text-xs shadow-sm truncate max-w-[200px] sm:max-w-none">
            {selectedFaculty}
          </span>
        </div>
      </div>

      {/* Header section for Step 3 */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-purple-900">
            <span className="w-6 h-6 rounded-full bg-purple-900 text-amber-300 flex items-center justify-center text-xs font-black shrink-0">
              3
            </span>
            <span>Step 3: Choose Course Note</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Course Notes & E-Books
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Showing verified lecture materials for {selectedFaculty} ({selectedLevel})
          </p>
        </div>

        {/* Filter input with 16px font on mobile */}
        {matchingNotes.length > 0 && (
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter by course, topic, lecturer..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 text-base sm:text-xs rounded-xl bg-white border border-slate-300 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-none transition shadow-sm min-h-[44px] sm:min-h-0"
            />
          </div>
        )}
      </div>

      {/* Course Notes List */}
      {displayedNotes.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {displayedNotes.map((note) => (
            <div
              key={note.id}
              className="group bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-lg transition-all p-5 sm:p-6 flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Header row: Course Title & Level */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-purple-900" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {note.level}
                      </span>
                      <h2 className="text-lg font-bold text-slate-900 group-hover:text-purple-900 transition-colors mt-1 leading-snug">
                        {note.courseTitle}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* PDF Topic */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Topic / Module:
                  </div>
                  <div className="text-sm font-semibold text-slate-800 mt-0.5 leading-relaxed">
                    {note.topic}
                  </div>
                </div>

                {/* Lecturer / Faculty / Metadata badges */}
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <User className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                    <span>
                      <strong className="text-slate-800">Lecturer / Author:</strong> {note.lecturer}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      <strong className="text-slate-800">Faculty:</strong> {note.faculty}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(note.uploadDate)}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <HardDrive className="w-3 h-3" />
                      <span>{formatFileSize(note.fileSize)}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons with mobile touch targets */}
              <div className="pt-4 sm:pt-5 mt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <button
                  onClick={() => onSelectNote(note)}
                  className="min-h-[46px] w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 active:bg-purple-950 text-white font-bold text-xs transition shadow-sm cursor-pointer active:scale-95"
                >
                  <BookOpen className="w-4 h-4 text-amber-300" />
                  <span>Open PDF E-Book</span>
                </button>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => onOpenReadAloudDirect(note)}
                    className="min-h-[44px] flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 border border-amber-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-95"
                    title="Listen to this note with Read Aloud"
                  >
                    <Volume2 className="w-4 h-4 text-amber-600" />
                    <span>Read Aloud</span>
                  </button>

                  {downloadingId === note.id ? (
                    <button
                      disabled
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center justify-center space-x-1.5"
                    >
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-700" />
                      <span className="text-[11px] font-bold">Saving...</span>
                    </button>
                  ) : downloadedIds.has(note.id) ? (
                    <button
                      disabled
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center justify-center space-x-1.5"
                      title="Stored in-app for offline reading"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-[11px]">Saved</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleInAppDownload(note)}
                      className="min-h-[44px] flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 active:bg-emerald-100 hover:text-emerald-800 text-slate-700 text-xs font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-95 border border-slate-200/80"
                      title="Download in-app for offline reading without internet"
                    >
                      <Download className="w-4 h-4 text-slate-600" />
                      <span>Download In-App</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty state as required */
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-900 mx-auto flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-purple-700" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">
              No Notes Currently Available
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              There are currently no published course lecture notes for{' '}
              <strong className="text-purple-900">{selectedFaculty}</strong> at{' '}
              <strong className="text-purple-900">{selectedLevel}</strong>.
            </p>
            <p className="text-xs text-slate-400">
              New PDF lecture notes are continuously published by lecturers. Please check back later or choose another faculty.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onBackToFaculty}
              className="px-4 py-2 rounded-xl bg-purple-900 text-amber-300 font-bold text-xs hover:bg-purple-800 transition cursor-pointer"
            >
              Browse Other Faculties
            </button>
            <button
              onClick={onBackToLevel}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition cursor-pointer"
            >
              Change Level
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
