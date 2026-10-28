import React, { useState, useMemo, useEffect } from 'react';
import { Search, BookOpen, ArrowLeft, User, Calendar, HardDrive, Filter, X, Volume2, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { StudyNote, Level, Faculty, FACULTIES, LEVELS } from '../types.ts';
import { api } from '../services/api.ts';
import { offlineStorage } from '../services/offlineStorage.ts';

interface SearchPageProps {
  notes: StudyNote[];
  initialQuery?: string;
  onSelectNote: (note: StudyNote) => void;
  onOpenReadAloudDirect: (note: StudyNote) => void;
  onBackToHome: () => void;
  onDownloadStatusChange?: () => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  notes,
  initialQuery = '',
  onSelectNote,
  onOpenReadAloudDirect,
  onBackToHome,
  onDownloadStatusChange,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('all');
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState<string>('all');
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadDownloaded() {
      const offlineList = await offlineStorage.getAllOfflineNotes();
      setDownloadedIds(new Set(offlineList.map((n) => n.id)));
    }
    loadDownloaded();
  }, []);

  const handleInAppDownload = async (e: React.MouseEvent, note: StudyNote) => {
    e.stopPropagation();
    try {
      setDownloadingId(note.id);
      await offlineStorage.saveNoteInApp(note);
      setDownloadedIds((prev) => new Set([...prev, note.id]));
      if (onDownloadStatusChange) onDownloadStatusChange();
    } catch (err) {
      console.error('In-app download error:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  // Filter notes across all 3 levels (only published notes are passed)
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      // Level filter
      if (selectedLevelFilter !== 'all' && n.level !== selectedLevelFilter) {
        return false;
      }
      // Faculty filter
      if (selectedFacultyFilter !== 'all' && n.faculty !== selectedFacultyFilter) {
        return false;
      }
      // Text query across: Course title, PDF topic, Lecturer, Faculty, Level
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchesTitle = n.courseTitle.toLowerCase().includes(q);
        const matchesTopic = n.topic.toLowerCase().includes(q);
        const matchesLecturer = n.lecturer.toLowerCase().includes(q);
        const matchesFaculty = n.faculty.toLowerCase().includes(q);
        const matchesLevel = n.level.toLowerCase().includes(q);
        return matchesTitle || matchesTopic || matchesLecturer || matchesFaculty || matchesLevel;
      }
      return true;
    });
  }, [notes, searchTerm, selectedLevelFilter, selectedFacultyFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedLevelFilter('all');
    setSelectedFacultyFilter('all');
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'PDF';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Back button and page title */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-sm font-semibold transition cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Levels</span>
        </button>
        <span className="text-xs text-slate-500">
          Searching across Level 100, 200 & 300 notes
        </span>
      </div>

      {/* Main Search Input */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Search University Lecture Notes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Search by course title, topic, lecturer name, level, or faculty.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-700 pointer-events-none" />
          <input
            type="text"
            placeholder="Type any course (e.g. ENG 101, Anatomy, Accounting, Boolean Algebra)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 focus:bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 outline-none transition text-base font-medium shadow-inner min-h-[48px]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-700 flex items-center space-x-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-purple-700" />
            <span>Level:</span>
          </span>
          <button
            onClick={() => setSelectedLevelFilter('all')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer active:scale-95 flex items-center justify-center ${
              selectedLevelFilter === 'all'
                ? 'bg-purple-900 text-amber-300 shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Levels
          </button>
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedLevelFilter(lvl)}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer active:scale-95 flex items-center justify-center ${
                selectedLevelFilter === lvl
                  ? 'bg-purple-900 text-amber-300 shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Faculty Filter Select */}
        <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
          <span className="font-bold text-slate-700">Faculty:</span>
          <select
            value={selectedFacultyFilter}
            onChange={(e) => setSelectedFacultyFilter(e.target.value)}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 font-medium outline-none focus:border-purple-600 text-base sm:text-xs max-w-full sm:max-w-xs"
          >
            <option value="all">All 6 Faculties</option>
            {FACULTIES.map((fac) => (
              <option key={fac} value={fac}>
                {fac}
              </option>
            ))}
          </select>

          {(searchTerm || selectedLevelFilter !== 'all' || selectedFacultyFilter !== 'all') && (
            <button
              onClick={clearFilters}
              className="text-purple-700 hover:text-purple-900 font-bold ml-auto text-xs underline cursor-pointer py-2 px-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Count Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          Found <strong>{filteredNotes.length}</strong> matching published{' '}
          {filteredNotes.length === 1 ? 'note' : 'notes'}
        </span>
        {searchTerm && (
          <span className="text-purple-800 font-medium">
            Search term: &ldquo;{searchTerm}&rdquo;
          </span>
        )}
      </div>

      {/* Search Results Grid */}
      {filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => onSelectNote(note)}
              className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between hover:border-purple-400"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200">
                      {note.level}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 truncate max-w-[200px]">
                      {note.faculty}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {formatFileSize(note.fileSize)}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-900 transition-colors leading-snug">
                    {note.courseTitle}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    <strong className="text-slate-800">Topic:</strong> {note.topic}
                  </p>
                </div>

                <div className="flex items-center space-x-2 text-xs text-slate-500 pt-1">
                  <User className="w-3.5 h-3.5 text-purple-700" />
                  <span>Lecturer: {note.lecturer}</span>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-purple-900 font-bold group-hover:text-amber-600 transition-colors flex items-center space-x-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Open in PDF E-Reader</span>
                </span>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenReadAloudDirect(note);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-semibold flex items-center space-x-1"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-amber-700" />
                    <span>Read Aloud</span>
                  </button>

                  {downloadingId === note.id ? (
                    <button
                      disabled
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800"
                    >
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                    </button>
                  ) : downloadedIds.has(note.id) ? (
                    <span
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center space-x-1 text-[11px]"
                      title="Stored in-app for offline reading"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="hidden sm:inline">Saved</span>
                    </span>
                  ) : (
                    <button
                      onClick={(e) => handleInAppDownload(e, note)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 transition"
                      title="Download in-app for offline reading"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3 max-w-md mx-auto shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No matching study notes found</h3>
          <p className="text-xs text-slate-500">
            Try searching with broader terms, check the spelling, or clear the level/faculty filters.
          </p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 rounded-xl bg-purple-900 text-amber-300 text-xs font-bold hover:bg-purple-800 transition cursor-pointer"
          >
            Show All Notes
          </button>
        </div>
      )}
    </div>
  );
};
