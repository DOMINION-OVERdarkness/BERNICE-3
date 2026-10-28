import React, { useState } from 'react';
import { X, Edit3, AlertCircle, Loader2, Save } from 'lucide-react';
import { StudyNote, Level, Faculty, FACULTIES, LEVELS } from '../types.ts';
import { api } from '../services/api.ts';

interface EditNoteModalProps {
  note: StudyNote;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSuccess: (updatedNote: StudyNote) => void;
}

export const EditNoteModal: React.FC<EditNoteModalProps> = ({
  note,
  isOpen,
  onClose,
  onUpdateSuccess,
}) => {
  const [courseTitle, setCourseTitle] = useState(note.courseTitle);
  const [topic, setTopic] = useState(note.topic);
  const [lecturer, setLecturer] = useState(note.lecturer);
  const [level, setLevel] = useState<Level>(note.level);
  const [faculty, setFaculty] = useState<Faculty>(note.faculty);
  const [isPublished, setIsPublished] = useState<boolean>(note.isPublished);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseTitle.trim() || !topic.trim() || !lecturer.trim() || !level || !faculty) {
      setError('All fields are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const updated = await api.updateNote(note.id, {
        courseTitle: courseTitle.trim(),
        topic: topic.trim(),
        lecturer: lecturer.trim(),
        level,
        faculty,
        isPublished,
      });
      onUpdateSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update note details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Edit3 className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold">Edit Note Information</h2>
              <p className="text-xs text-purple-200 truncate max-w-sm">{note.courseTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-purple-200 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Course Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl border border-slate-300 focus:border-purple-600 outline-none text-base sm:text-sm min-h-[44px]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              PDF Topic <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl border border-slate-300 focus:border-purple-600 outline-none text-base sm:text-sm min-h-[44px]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Lecturer's Name / Author <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={lecturer}
              onChange={(e) => setLecturer(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl border border-slate-300 focus:border-purple-600 outline-none text-base sm:text-sm min-h-[44px]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Level <span className="text-rose-500">*</span>
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as Level)}
                className="w-full px-3.5 py-3 rounded-xl border border-slate-300 focus:border-purple-600 text-base sm:text-xs font-medium bg-white min-h-[44px]"
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Faculty <span className="text-rose-500">*</span>
              </label>
              <select
                value={faculty}
                onChange={(e) => setFaculty(e.target.value as Faculty)}
                className="w-full px-3.5 py-3 rounded-xl border border-slate-300 focus:border-purple-600 text-base sm:text-xs font-medium bg-white min-h-[44px]"
              >
                {FACULTIES.map((fac) => (
                  <option key={fac} value={fac}>
                    {fac}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Publication Status toggle */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800">
                Publication Status
              </div>
              <div className="text-[11px] text-slate-500">
                {isPublished ? 'Visible to students' : 'Hidden from students (Unpublished draft)'}
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-900"></div>
            </label>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-amber-300 font-bold text-xs shadow-sm flex items-center space-x-1.5 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
