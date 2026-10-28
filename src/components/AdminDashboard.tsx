import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Upload,
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  Lock,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
  HardDrive,
  AlertTriangle,
  KeyRound,
  ExternalLink,
  BookOpen,
  Volume2,
  RefreshCw,
} from 'lucide-react';
import { StudyNote, Level, Faculty, FACULTIES, LEVELS } from '../types.ts';
import { api, removeStoredAdminToken } from '../services/api.ts';
import { firebaseService } from '../services/firebaseService.ts';
import { UploadNoteModal } from './UploadNoteModal.tsx';
import { EditNoteModal } from './EditNoteModal.tsx';

interface AdminDashboardProps {
  onLogout: () => void;
  onViewStudentPortal: () => void;
  onPreviewNote: (note: StudyNote) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onLogout,
  onViewStudentPortal,
  onPreviewNote,
}) => {
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [facultyFilter, setFacultyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<StudyNote | null>(null);
  const [deletingNote, setDeletingNote] = useState<StudyNote | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Password change form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);

  // Load all admin notes (merging server and firestore records)
  const fetchNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      const serverResult = await api.getAdminNotes().catch(() => ({ notes: [] }));
      const firestoreResult = await firebaseService.getAllAdminNotes().catch(() => []);

      const map = new Map<string, StudyNote>();
      for (const n of firestoreResult) map.set(n.id, n);
      for (const n of (serverResult.notes || [])) {
        if (!map.has(n.id)) map.set(n.id, n);
      }
      const combined = Array.from(map.values());
      combined.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
      setNotes(combined);
    } catch (err: any) {
      setError(err?.message || 'Failed to load administrator records');
      if (err?.message?.includes('Unauthorized')) {
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (levelFilter !== 'all' && n.level !== levelFilter) return false;
      if (facultyFilter !== 'all' && n.faculty !== facultyFilter) return false;
      if (statusFilter === 'published' && !n.isPublished) return false;
      if (statusFilter === 'draft' && n.isPublished) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          n.courseTitle.toLowerCase().includes(q) ||
          n.topic.toLowerCase().includes(q) ||
          n.lecturer.toLowerCase().includes(q) ||
          n.faculty.toLowerCase().includes(q) ||
          n.level.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [notes, searchQuery, levelFilter, facultyFilter, statusFilter]);

  // Toggle publish / unpublish
  const handleTogglePublish = async (note: StudyNote) => {
    try {
      // Sync to Firestore
      try {
        await firebaseService.togglePublishStatus(note.id, note.isPublished);
      } catch (fbErr) {
        console.warn('Firestore toggle publish sync warning:', fbErr);
      }

      const updated = await api.togglePublish(note.id, !note.isPublished);
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setActionSuccess(
        updated.isPublished
          ? `"${updated.courseTitle}" is now PUBLISHED to students.`
          : `"${updated.courseTitle}" is now UNPUBLISHED (hidden from students).`
      );
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to toggle publication status');
    }
  };

  // Confirm delete note
  const handleConfirmDelete = async () => {
    if (!deletingNote) return;
    try {
      // Sync delete to Firestore and Storage
      try {
        await firebaseService.deleteNote(deletingNote.id, deletingNote.fileUrl);
      } catch (fbErr) {
        console.warn('Firestore delete sync warning:', fbErr);
      }

      await api.deleteNote(deletingNote.id);
      setNotes((prev) => prev.filter((n) => n.id !== deletingNote.id));
      setActionSuccess(`Note "${deletingNote.courseTitle}" was permanently deleted.`);
      setDeletingNote(null);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete note');
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setPasswordChangeError('Please fill in both password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordChangeError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordChangeError('New passwords do not match.');
      return;
    }

    try {
      setPasswordChangeLoading(true);
      setPasswordChangeError(null);
      await api.changeAdminPassword(currentPassword, newPassword);
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setActionSuccess('Administrator password updated successfully.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setPasswordChangeError(err?.message || 'Failed to change password');
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'PDF';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  const publishedCount = notes.filter((n) => n.isPublished).length;
  const draftCount = notes.filter((n) => !n.isPublished).length;

  return (
    <div className="space-y-6 pb-20">
      {/* Top action header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-full bg-white p-0.5 border-2 border-amber-400 flex items-center justify-center shadow-md overflow-hidden shrink-0">
            <img
              src="/logo.png"
              alt="Bernice University Buea"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Admin Dashboard</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Authorized
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage lecturers' lecture notes, publications, and security settings
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-amber-300 font-bold text-xs shadow-md flex items-center space-x-2 transition cursor-pointer"
          >
            <Upload className="w-4 h-4 text-amber-400" />
            <span>Upload New PDF Note</span>
          </button>

          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Lock className="w-4 h-4 text-slate-600" />
            <span>Change Password</span>
          </button>

          <button
            onClick={onViewStudentPortal}
            className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-purple-950 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-purple-950" />
            <span>View Student Section</span>
          </button>

          <button
            onClick={onLogout}
            className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
            title="Log out of admin"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Course Notes
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{notes.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5 text-purple-800" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Published to Students
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-1">{publishedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Unpublished (Drafts)
            </div>
            <div className="text-2xl font-extrabold text-amber-700 mt-1">{draftCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            <XCircle className="w-5 h-5 text-amber-700" />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by course title, topic, lecturer, level, or faculty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-purple-600 outline-none text-xs transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published Only</option>
              <option value="draft">Drafts Only</option>
            </select>

            {/* Level Filter */}
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 outline-none"
            >
              <option value="all">All Levels</option>
              {LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>

            {/* Faculty Filter */}
            <select
              value={facultyFilter}
              onChange={(e) => setFacultyFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 outline-none max-w-[200px] truncate"
            >
              <option value="all">All 6 Faculties</option>
              {FACULTIES.map((fac) => (
                <option key={fac} value={fac}>
                  {fac}
                </option>
              ))}
            </select>

            <button
              onClick={fetchNotes}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition cursor-pointer"
              title="Refresh notes list"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Notes Table / List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
          <span>Showing {filteredNotes.length} uploaded notes</span>
          <span className="hidden sm:inline">Lecturer Course Note Database</span>
        </div>

        {filteredNotes.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="p-5 sm:p-6 hover:bg-slate-50/80 transition flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
              >
                {/* Note Details */}
                <div className="space-y-2 flex-1 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center space-x-1 ${
                        note.isPublished
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          note.isPublished ? 'bg-emerald-600' : 'bg-amber-600'
                        }`}
                      />
                      <span>{note.isPublished ? 'Published' : 'Unpublished (Draft)'}</span>
                    </span>

                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-900 border border-purple-200">
                      {note.level}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 truncate max-w-[220px]">
                      {note.faculty}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">{note.courseTitle}</h3>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      <strong className="text-slate-800">Topic:</strong> {note.topic}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span>
                      <strong className="text-slate-700">Lecturer:</strong> {note.lecturer}
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Uploaded {formatDate(note.uploadDate)}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatFileSize(note.fileSize)}</span>
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  {/* Preview PDF */}
                  <button
                    onClick={() => onPreviewNote(note)}
                    className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
                    title="Preview PDF in e-reader"
                  >
                    <Eye className="w-3.5 h-3.5 text-purple-700" />
                    <span>Preview</span>
                  </button>

                  {/* Toggle publish status */}
                  <button
                    onClick={() => handleTogglePublish(note)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      note.isPublished
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                    title={note.isPublished ? 'Unpublish note from student portal' : 'Publish note to students'}
                  >
                    {note.isPublished ? 'Unpublish' : 'Publish Note'}
                  </button>

                  {/* Edit metadata */}
                  <button
                    onClick={() => setEditingNote(note)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition cursor-pointer"
                    title="Edit note descriptive details"
                  >
                    <Edit3 className="w-4 h-4 text-slate-600" />
                  </button>

                  {/* Delete note */}
                  <button
                    onClick={() => setDeletingNote(note)}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs transition cursor-pointer"
                    title="Delete note after confirmation"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-900 mx-auto flex items-center justify-center">
              <FileText className="w-7 h-7 text-purple-700" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                {notes.length === 0 ? 'No Course Notes in Repository' : 'No notes found matching filters'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {notes.length === 0
                  ? 'All demo notes have been removed. Click "Upload New PDF Note" to publish official course materials for Bernice University Buea students.'
                  : 'Try adjusting your search criteria or clearing active level/faculty filters.'}
              </p>
            </div>
            {notes.length === 0 && (
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-amber-300 font-bold text-xs shadow-md transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload First PDF Note</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadNoteModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={(newNote) => {
          setNotes((prev) => [newNote, ...prev]);
          setActionSuccess(`Note "${newNote.courseTitle}" uploaded successfully.`);
          setTimeout(() => setActionSuccess(null), 4000);
        }}
      />

      {/* Edit Modal */}
      {editingNote && (
        <EditNoteModal
          note={editingNote}
          isOpen={!!editingNote}
          onClose={() => setEditingNote(null)}
          onUpdateSuccess={(updatedNote) => {
            setNotes((prev) => prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
            setActionSuccess(`Note "${updatedNote.courseTitle}" updated successfully.`);
            setTimeout(() => setActionSuccess(null), 4000);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingNote && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Delete Course Note?</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <strong className="text-slate-900">&ldquo;{deletingNote.courseTitle}&rdquo;</strong>?
                This action cannot be undone and will remove the PDF document from the university server.
              </p>
            </div>

            <div className="pt-2 flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setDeletingNote(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Yes, Delete Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2 text-purple-900">
              <KeyRound className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-bold text-slate-900">Change Admin Password</h3>
            </div>

            <p className="text-xs text-slate-500">
              Update the default password (12345678) to a secure custom password.
            </p>

            {passwordChangeError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{passwordChangeError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  placeholder="Enter current password (default: 12345678)"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-purple-600 outline-none text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  placeholder="Enter new secure password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-purple-600 outline-none text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-purple-600 outline-none text-xs"
                  required
                />
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordChangeLoading}
                  className="flex-1 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-amber-300 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {passwordChangeLoading ? 'Updating...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
