import React, { useState, useEffect } from 'react';
import {
  Level,
  Faculty,
  StudyNote,
  StudentNavStep,
  AppView,
  FACULTIES,
  LEVELS,
} from './types.ts';
import { api, getStoredAdminToken, removeStoredAdminToken } from './services/api.ts';
import { Header } from './components/Header.tsx';
import { StudentHome } from './components/StudentHome.tsx';
import { FacultySelection } from './components/FacultySelection.tsx';
import { CourseList } from './components/CourseList.tsx';
import { PdfReader } from './components/PdfReader.tsx';
import { SearchPage } from './components/SearchPage.tsx';
import { OfflineDownloads } from './components/OfflineDownloads.tsx';
import { AdminLogin } from './components/AdminLogin.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { offlineStorage } from './services/offlineStorage.ts';
import { firebaseService } from './services/firebaseService.ts';
import { testFirestoreConnection } from './firebase.ts';
import { Loader2, AlertCircle, RefreshCw, GraduationCap, ShieldCheck, BookOpen } from 'lucide-react';

export default function App() {
  // Navigation & View state
  const [appView, setAppView] = useState<AppView>('student');
  const [navStep, setNavStep] = useState<StudentNavStep>('home');

  // Student flow state
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [selectedNote, setSelectedNote] = useState<StudyNote | null>(null);
  const [initialStartReadAloud, setInitialStartReadAloud] = useState<boolean>(false);

  // In-App Downloads count
  const [offlineCount, setOfflineCount] = useState<number>(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data state
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Admin auth state
  const [adminToken, setAdminToken] = useState<string | null>(getStoredAdminToken());

  // Load published notes on mount
  const loadPublishedNotes = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      // Validate Firestore connection on boot per Firebase skill guidelines
      testFirestoreConnection().catch(() => {});

      const data = await firebaseService.getPublishedNotes();
      setNotes(data);
    } catch (err: any) {
      console.error('Error fetching notes:', err);
      setFetchError(err?.message || 'Failed to connect to university server');
    } finally {
      setLoading(false);
    }
  };

  const refreshOfflineCount = async () => {
    try {
      const records = await offlineStorage.getAllOfflineNotes();
      setOfflineCount(records.length);
    } catch {
      setOfflineCount(0);
    }
  };

  useEffect(() => {
    loadPublishedNotes();
    refreshOfflineCount();

    // Subscribe to Firestore real-time updates for published notes
    const unsubscribe = firebaseService.subscribePublishedNotes(
      (realtimeNotes) => {
        if (realtimeNotes.length > 0) {
          setNotes(realtimeNotes);
        }
      },
      (err) => {
        console.warn('Realtime subscription notice:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  // Check admin session on mount
  useEffect(() => {
    async function checkAuth() {
      if (adminToken) {
        const isValid = await api.checkAdminSession();
        if (!isValid) {
          removeStoredAdminToken();
          setAdminToken(null);
        }
      }
    }
    checkAuth();
  }, [adminToken]);

  // Student Navigation Actions
  const handleSelectLevel = (level: Level) => {
    setSelectedLevel(level);
    setNavStep('choose-faculty');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectFaculty = (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setNavStep('course-list');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectNote = (note: StudyNote, startVoice = false) => {
    setSelectedNote(note);
    setInitialStartReadAloud(startVoice);
    setNavStep('pdf-reader');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenSearch = () => {
    setNavStep('search-results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDownloads = () => {
    setNavStep('downloads');
    refreshOfflineCount();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExecuteSearch = (q: string) => {
    setSearchQuery(q);
    setNavStep('search-results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateHome = () => {
    setNavStep('home');
    setSelectedLevel(null);
    setSelectedFaculty(null);
    setSelectedNote(null);
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToLevelStep = () => {
    setNavStep('choose-faculty');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToCourseList = () => {
    setNavStep('course-list');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Admin Actions
  const handleOpenAdmin = () => {
    if (adminToken) {
      setAppView('admin');
    } else {
      setAppView('admin-login');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminLoginSuccess = (token: string) => {
    setAdminToken(token);
    setAppView('admin');
    loadPublishedNotes(); // Refresh published notes cache
  };

  const handleAdminLogout = () => {
    removeStoredAdminToken();
    setAdminToken(null);
    setAppView('student');
    loadPublishedNotes();
  };

  const handleExitAdmin = () => {
    setAppView('student');
    loadPublishedNotes();
  };

  const handleAdminPreviewNote = (note: StudyNote) => {
    setSelectedNote(note);
    setSelectedLevel(note.level);
    setSelectedFaculty(note.faculty);
    setNavStep('pdf-reader');
    setAppView('student');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Header */}
      <Header
        appView={appView}
        navStep={navStep}
        selectedLevel={selectedLevel}
        selectedFaculty={selectedFaculty}
        offlineCount={offlineCount}
        onNavigateHome={handleNavigateHome}
        onSelectLevelStep={() => {
          setNavStep('home');
          setSelectedFaculty(null);
        }}
        onSelectFacultyStep={() => {
          if (selectedLevel) setNavStep('choose-faculty');
        }}
        onOpenSearch={handleOpenSearch}
        onOpenDownloads={handleOpenDownloads}
        onOpenAdmin={handleOpenAdmin}
        onExitAdmin={handleExitAdmin}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        {/* Connection / Loading error banner if any */}
        {fetchError && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{fetchError}</span>
            </div>
            <button
              onClick={loadPublishedNotes}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-1 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Global Loading state on first load */}
        {loading && notes.length === 0 ? (
          <div className="py-24 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-purple-900 animate-spin mx-auto" />
            <div className="text-base font-bold text-slate-800">
              Connecting to Bernice University Buea E-Notes Portal...
            </div>
            <p className="text-xs text-slate-500">
              Loading verified academic lecture notes across faculties.
            </p>
          </div>
        ) : (
          <>
            {/* VIEW: ADMIN LOGIN */}
            {appView === 'admin-login' && (
              <AdminLogin
                onLoginSuccess={handleAdminLoginSuccess}
                onBackToStudent={() => setAppView('student')}
              />
            )}

            {/* VIEW: ADMIN DASHBOARD */}
            {appView === 'admin' && (
              <AdminDashboard
                onLogout={handleAdminLogout}
                onViewStudentPortal={handleExitAdmin}
                onPreviewNote={handleAdminPreviewNote}
              />
            )}

            {/* VIEW: STUDENT PORTAL */}
            {appView === 'student' && (
              <>
                {/* Step 1: Choose a Level (or Home) */}
                {navStep === 'home' && (
                  <StudentHome
                    notes={notes}
                    onSelectLevel={handleSelectLevel}
                    onSearchClick={handleOpenSearch}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    onExecuteSearch={handleExecuteSearch}
                  />
                )}

                {/* Step 2: Choose a Faculty */}
                {navStep === 'choose-faculty' && selectedLevel && (
                  <FacultySelection
                    selectedLevel={selectedLevel}
                    notes={notes}
                    onSelectFaculty={handleSelectFaculty}
                    onBackToLevel={() => setNavStep('home')}
                  />
                )}

                {/* Step 3: Choose a Course */}
                {navStep === 'course-list' && selectedLevel && selectedFaculty && (
                  <CourseList
                    selectedLevel={selectedLevel}
                    selectedFaculty={selectedFaculty}
                    notes={notes}
                    onSelectNote={(note) => handleSelectNote(note, false)}
                    onOpenReadAloudDirect={(note) => handleSelectNote(note, true)}
                    onBackToFaculty={handleBackToLevelStep}
                    onBackToLevel={() => setNavStep('home')}
                    onDownloadStatusChange={refreshOfflineCount}
                  />
                )}

                {/* Step 4: PDF Reader — E-Book Experience */}
                {navStep === 'pdf-reader' && selectedNote && (
                  <PdfReader
                    note={selectedNote}
                    onBackToCourseList={handleBackToCourseList}
                    onBackToFaculty={handleBackToLevelStep}
                    onBackToLevel={() => setNavStep('home')}
                    initialStartReadAloud={initialStartReadAloud}
                  />
                )}

                {/* In-App Offline Downloads View */}
                {navStep === 'downloads' && (
                  <OfflineDownloads
                    onSelectOfflineNote={(note) => handleSelectNote(note, false)}
                    onOpenReadAloudOffline={(note) => handleSelectNote(note, true)}
                    onBackToHome={handleNavigateHome}
                    onStorageChanged={refreshOfflineCount}
                  />
                )}

                {/* Search Results Across All Levels */}
                {navStep === 'search-results' && (
                  <SearchPage
                    notes={notes}
                    initialQuery={searchQuery}
                    onSelectNote={(note) => handleSelectNote(note, false)}
                    onOpenReadAloudDirect={(note) => handleSelectNote(note, true)}
                    onBackToHome={() => setNavStep('home')}
                    onDownloadStatusChange={refreshOfflineCount}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* University Footer with safe-area padding for mobile */}
      <footer className="bg-purple-950 text-white border-t border-purple-900 mt-auto pb-safe">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-purple-200">
            <div>
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <GraduationCap className="w-5 h-5" />
                <span>BERNICE UNIVERSITY BUEA</span>
              </div>
              <p className="mt-2 text-purple-300 leading-relaxed">
                Buea Campus, Southwest Region, Cameroon.
                Official academic lecture note repository for undergraduate students.
              </p>
            </div>

            <div>
              <div className="font-bold text-white text-xs uppercase tracking-wider mb-2">
                Supported Faculties
              </div>
              <ul className="space-y-1 text-purple-300 text-[11px]">
                {FACULTIES.map((fac) => (
                  <li key={fac} className="truncate">
                    • {fac}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <div className="font-bold text-white text-xs uppercase tracking-wider mb-2">
                Student & Lecturer Support
              </div>
              <p className="text-purple-300 text-[11px] leading-relaxed">
                Students do not require login credentials. Lecturers and departmental administrators can access the portal with authorized passwords to upload, update, and publish course notes.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleOpenAdmin}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 border border-purple-700 text-amber-300 text-xs font-bold cursor-pointer transition active:scale-95"
                >
                  Admin & Lecturer Login
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-purple-900/60 flex flex-col sm:flex-row items-center justify-between text-[11px] text-purple-400 gap-2">
            <div>
              © 2026 Bernice University Buea. All Rights Reserved. Excellence, Integrity and Service.
            </div>
            <div className="flex items-center space-x-4">
              <span>Read Aloud TTS</span>
              <span>•</span>
              <span>Original PDF Preservation</span>
              <span>•</span>
              <span>Mobile-First Reader</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
