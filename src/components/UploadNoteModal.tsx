import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  Eye,
  CheckCircle2,
  Loader2,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { Level, Faculty, StudyNote, FACULTIES, LEVELS } from '../types.ts';
import { api } from '../services/api.ts';
import { firebaseService } from '../services/firebaseService.ts';

interface UploadNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newNote: StudyNote) => void;
}

export const UploadNoteModal: React.FC<UploadNoteModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [courseTitle, setCourseTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [lecturer, setLecturer] = useState('');
  const [level, setLevel] = useState<Level>('Level 100');
  const [faculty, setFaculty] = useState<Faculty>('Faculty of Engineering and Technology');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isPublished, setIsPublished] = useState<boolean>(true);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setError('Please select a valid PDF document.');
        return;
      }
      setPdfFile(file);
      setError(null);
      // Create local preview blob URL
      const blobUrl = URL.createObjectURL(file);
      setPreviewBlobUrl(blobUrl);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setError('Please drop a valid PDF document.');
        return;
      }
      setPdfFile(file);
      setError(null);
      const blobUrl = URL.createObjectURL(file);
      setPreviewBlobUrl(blobUrl);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate all required fields
    if (!courseTitle.trim()) {
      setError('Course Title is required.');
      return;
    }
    if (!topic.trim()) {
      setError('PDF Topic is required.');
      return;
    }
    if (!lecturer.trim()) {
      setError("Lecturer's Name / Author is required.");
      return;
    }
    if (!level) {
      setError('Level is required.');
      return;
    }
    if (!faculty) {
      setError('Faculty is required.');
      return;
    }
    if (!pdfFile) {
      setError('Please select a PDF file to upload.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setUploadProgress(0);

      const createdNote = await firebaseService.uploadNoteWithPdf(
        pdfFile,
        {
          courseTitle: courseTitle.trim(),
          topic: topic.trim(),
          lecturer: lecturer.trim(),
          level,
          faculty,
          isPublished,
        },
        (pct) => setUploadProgress(pct)
      );

      onUploadSuccess(createdNote);
      onClose();
    } catch (err: any) {
      console.warn('Firebase storage upload failed, trying backend upload proxy:', err);
      try {
        const formData = new FormData();
        formData.append('courseTitle', courseTitle.trim());
        formData.append('topic', topic.trim());
        formData.append('lecturer', lecturer.trim());
        formData.append('level', level);
        formData.append('faculty', faculty);
        formData.append('isPublished', String(isPublished));
        formData.append('pdfFile', pdfFile);

        const createdNote = await api.uploadNote(formData);
        onUploadSuccess(createdNote);
        onClose();
      } catch (fallbackErr: any) {
        setError(fallbackErr?.message || err?.message || 'Failed to upload PDF note.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 p-5 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white p-0.5 border border-amber-300 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                <img
                  src="/logo.png"
                  alt="BUB"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h2 className="text-lg font-bold">Upload Course Lecture Note</h2>
                <p className="text-xs text-purple-200">
                  Upload and publish original PDF materials for Bernice University Buea students
                </p>
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
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Field 1: Course Title */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  1. Course Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. CPE 201: Digital Logic & Computer Organization"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-300 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-none text-base sm:text-sm transition min-h-[44px]"
                  required
                />
              </div>

              {/* Field 2: PDF Topic */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  2. PDF Topic <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Karnaugh Maps, Circuit Minimization and Combinational Hazards"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-300 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-none text-base sm:text-sm transition min-h-[44px]"
                  required
                />
              </div>

              {/* Field 3: Lecturer's Name / Author */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  3. Lecturer's Name / Author <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engr. Prof. K. O. Egharevba / Dr. (Mrs.) A. N. Osagie"
                  value={lecturer}
                  onChange={(e) => setLecturer(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-300 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-none text-base sm:text-sm transition min-h-[44px]"
                  required
                />
              </div>

              {/* Field 4: Level */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  4. Level <span className="text-rose-500">*</span>
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as Level)}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-300 focus:border-purple-600 outline-none text-base sm:text-sm font-medium bg-white min-h-[44px]"
                  required
                >
                  {LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 5: Faculty */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  5. Faculty <span className="text-rose-500">*</span>
                </label>
                <select
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value as Faculty)}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-300 focus:border-purple-600 outline-none text-base sm:text-xs font-medium bg-white min-h-[44px]"
                  required
                >
                  {FACULTIES.map((fac) => (
                    <option key={fac} value={fac}>
                      {fac}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Field 6: PDF File Upload */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                6. Original PDF File <span className="text-rose-500">*</span>
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition ${
                  pdfFile
                    ? 'border-purple-600 bg-purple-50/50'
                    : 'border-slate-300 hover:border-purple-400 bg-slate-50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="application/pdf,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {pdfFile ? (
                  <div className="flex items-center justify-between text-left">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-900 text-amber-300 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 truncate max-w-xs">
                          {pdfFile.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                        </div>
                      </div>
                    </div>

                    {/* Preview Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPreviewModal(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-purple-900 font-bold text-xs flex items-center space-x-1 shadow-xs cursor-pointer"
                      title="Preview PDF before publishing"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                    <div className="text-xs font-bold text-slate-700">
                      Click to choose or drag & drop lecture note PDF here
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Standard PDF documents up to 50 MB
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Publication Status & Action */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800">
                  Publish to Students Immediately
                </div>
                <div className="text-[11px] text-slate-500">
                  {isPublished
                    ? 'Note will be visible in the student portal immediately.'
                    : 'Note will be saved as draft (unpublished). You can publish it anytime.'}
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

            {/* Modal Buttons */}
            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 active:bg-purple-950 text-amber-300 font-bold text-xs shadow-md transition flex items-center space-x-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {uploadProgress > 0
                        ? `Uploading to Firebase (${uploadProgress}%)...`
                        : 'Uploading PDF...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>{isPublished ? 'Publish Note to Students' : 'Save as Draft'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* PDF Preview Modal before publishing */}
      {showPreviewModal && previewBlobUrl && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-300">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between text-xs">
              <div className="font-bold flex items-center space-x-2">
                <Eye className="w-4 h-4 text-amber-400" />
                <span>Pre-Publication PDF Preview: {pdfFile?.name}</span>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <iframe
              src={previewBlobUrl}
              className="w-full flex-1 border-none"
              title="Pre-publish preview"
            />
            <div className="bg-slate-100 p-3 flex items-center justify-between text-xs border-t border-slate-200">
              <span className="text-slate-500">
                Check that layout, equations, and diagrams appear correctly.
              </span>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-1.5 rounded-lg bg-purple-900 text-amber-300 font-bold hover:bg-purple-800 cursor-pointer"
              >
                Done Previewing
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
