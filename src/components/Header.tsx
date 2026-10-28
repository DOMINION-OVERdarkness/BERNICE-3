import React from 'react';
import { BookOpen, Shield, Search, ArrowLeft, GraduationCap, Home, Download } from 'lucide-react';
import { Level, Faculty, StudentNavStep, AppView } from '../types.ts';

interface HeaderProps {
  appView: AppView;
  navStep: StudentNavStep;
  selectedLevel: Level | null;
  selectedFaculty: Faculty | null;
  offlineCount: number;
  onNavigateHome: () => void;
  onSelectLevelStep: () => void;
  onSelectFacultyStep: () => void;
  onOpenSearch: () => void;
  onOpenDownloads: () => void;
  onOpenAdmin: () => void;
  onExitAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  appView,
  navStep,
  selectedLevel,
  selectedFaculty,
  offlineCount,
  onNavigateHome,
  onSelectLevelStep,
  onSelectFacultyStep,
  onOpenSearch,
  onOpenDownloads,
  onOpenAdmin,
  onExitAdmin,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-purple-950 text-white shadow-md border-b border-purple-900/60 pt-safe">
      {/* Top institution bar with safe area */}
      <div className="bg-purple-950/95 border-b border-purple-800/40 px-3 sm:px-6 py-1.5 text-xs text-purple-200 flex items-center justify-between">
        <div className="flex items-center space-x-2 truncate">
          <img
            src="/logo.png"
            alt="BUB"
            className="w-4 h-4 rounded-full object-contain bg-white/90 p-0.5 inline-block shrink-0"
          />
          <span className="font-semibold tracking-wide text-amber-300 text-[11px] sm:text-xs truncate">
            BERNICE UNIVERSITY BUEA
          </span>
          <span className="hidden md:inline text-purple-400">|</span>
          <span className="hidden md:inline italic text-purple-200 text-[11px]">
            Buea Campus, Cameroon
          </span>
        </div>
        <div className="flex items-center space-x-2 text-xs shrink-0">
          <span className="text-purple-300 hidden lg:inline text-[11px]">Session: 2025/2026</span>
          {appView !== 'student' ? (
            <button
              onClick={onExitAdmin}
              className="min-h-[36px] px-2.5 py-1 rounded-lg bg-purple-800 hover:bg-purple-700 text-purple-100 flex items-center space-x-1.5 text-xs font-semibold transition active:scale-95"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Student Portal</span>
            </button>
          ) : (
            <button
              onClick={onOpenAdmin}
              className="min-h-[36px] px-2.5 py-1 rounded-lg bg-purple-900/90 hover:bg-purple-800 border border-purple-700/80 text-amber-300 flex items-center space-x-1 text-xs transition font-semibold active:scale-95"
              title="Admin Portal Login"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xs:inline">Lecturer /</span>
              <span>Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Crest */}
        <div
          onClick={onNavigateHome}
          className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer group select-none py-1"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white p-0.5 shadow-lg border-2 border-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 active:scale-95 transition-transform overflow-hidden">
            <img
              src="/logo.png"
              alt="Bernice University Buea Official Crest"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-base sm:text-xl font-extrabold tracking-tight text-white group-hover:text-amber-300 transition-colors truncate">
                BUB Study Notes
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-md">
                Official
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-purple-200 truncate">
              Bernice University Buea E-Notes
            </p>
          </div>
        </div>

        {/* Action Controls with minimum 44px touch targets */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5">
          {appView === 'student' && (
            <>
              {/* In-App Downloads Button */}
              <button
                onClick={onOpenDownloads}
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer active:scale-95 ${
                  navStep === 'downloads'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                    : 'bg-purple-900/70 hover:bg-purple-800 text-purple-100 border border-purple-700/60'
                }`}
                title="View in-app downloaded notes for offline reading"
                aria-label="Offline Downloads"
              >
                <div className="relative">
                  <Download className="w-4 h-4 text-emerald-400" />
                  {offlineCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black flex items-center justify-center">
                      {offlineCount}
                    </span>
                  )}
                </div>
                <span className="hidden md:inline">Downloads</span>
              </button>

              {/* Search Notes Button */}
              <button
                onClick={onOpenSearch}
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer active:scale-95 ${
                  navStep === 'search-results'
                    ? 'bg-amber-400 text-purple-950 shadow-md font-bold'
                    : 'bg-purple-900/70 hover:bg-purple-800 text-purple-100 border border-purple-700/60'
                }`}
                title="Search study notes across courses and lecturers"
                aria-label="Search study notes"
              >
                <Search className="w-4 h-4 text-amber-300" />
                <span className="hidden md:inline">Search</span>
              </button>
            </>
          )}

          {appView === 'student' && (
            <button
              onClick={onOpenAdmin}
              className="min-h-[44px] px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-purple-950 shadow-sm flex items-center justify-center space-x-1.5 transition cursor-pointer active:scale-95"
              title="Lecturer & Administrator Area"
            >
              <Shield className="w-4 h-4 text-purple-950" />
              <span>Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb banner for student navigation */}
      {appView === 'student' && navStep !== 'home' && navStep !== 'choose-level' && (
        <div className="bg-purple-900/50 border-t border-purple-800/50 px-3 sm:px-6 py-2 text-xs text-purple-200 overflow-x-auto whitespace-nowrap scroll-touch">
          <div className="max-w-7xl mx-auto flex items-center space-x-2">
            <button
              onClick={onNavigateHome}
              className="min-h-[32px] px-2 rounded-lg text-purple-300 hover:text-white flex items-center space-x-1 transition active:scale-95"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>

            {navStep === 'downloads' ? (
              <>
                <span className="text-purple-400">/</span>
                <span className="text-emerald-400 font-bold">My In-App Downloads (Offline Notes)</span>
              </>
            ) : (
              <>
                <span className="text-purple-400">/</span>
                <button
                  onClick={onSelectLevelStep}
                  className="text-purple-300 hover:text-white"
                >
                  Levels
                </button>

                {selectedLevel && (
                  <>
                    <span className="text-purple-400">/</span>
                    <button
                      onClick={onSelectFacultyStep}
                      className="font-semibold text-amber-300 hover:underline"
                    >
                      {selectedLevel}
                    </button>
                  </>
                )}

                {selectedFaculty && (
                  <>
                    <span className="text-purple-400">/</span>
                    <span className="text-white truncate max-w-[200px] sm:max-w-none">
                      {selectedFaculty}
                    </span>
                  </>
                )}

                {navStep === 'pdf-reader' && (
                  <>
                    <span className="text-purple-400">/</span>
                    <span className="text-amber-400 font-medium">E-Book Reader</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
