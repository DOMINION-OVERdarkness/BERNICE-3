import React from 'react';
import { BookOpen, Search, Sparkles, Volume2, ShieldCheck, ArrowRight, Layers, Award } from 'lucide-react';
import { Level, StudyNote } from '../types.ts';

interface StudentHomeProps {
  notes: StudyNote[];
  onSelectLevel: (level: Level) => void;
  onSearchClick: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onExecuteSearch: (q: string) => void;
}

export const StudentHome: React.FC<StudentHomeProps> = ({
  notes,
  onSelectLevel,
  onSearchClick,
  searchQuery,
  setSearchQuery,
  onExecuteSearch,
}) => {
  const getLevelCount = (lvl: Level) => notes.filter((n) => n.level === lvl).length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onExecuteSearch(searchQuery.trim());
    } else {
      onSearchClick();
    }
  };

  const levelDetails: Record<Level, { tag: string; description: string; badgeColor: string; accentColor: string }> = {
    'Level 100': {
      tag: 'First Year / Foundation',
      description: 'Introductory departmental foundational lecture notes, vector calculus, gross anatomy, accounting basics, and pedagogy.',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      accentColor: 'from-emerald-500/10 to-emerald-500/5 hover:border-emerald-500',
    },
    'Level 200': {
      tag: 'Second Year / Intermediate',
      description: 'Core departmental syllabus, digital logic systems, pharmacology ADME, animal husbandry, and educational psychology.',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      accentColor: 'from-blue-500/10 to-blue-500/5 hover:border-blue-500',
    },
    'Level 300': {
      tag: 'Third Year / Advanced',
      description: 'Specialized advanced degree modules, electric power grids, clinical enzymology, corporate finance, and curriculum design.',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      accentColor: 'from-purple-500/10 to-purple-500/5 hover:border-purple-500',
    },
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 text-white p-6 sm:p-10 shadow-xl border border-purple-800/60">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 text-xs font-semibold tracking-wide">
                <img
                  src="/logo.png"
                  alt="BUB"
                  className="w-4 h-4 rounded-full object-contain bg-white/90 p-0.5"
                />
                <span>Bernice University Buea • Academic Portal</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Bernice University Buea <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400 font-serif-title italic">
                  Official Study Notes & E-Books
                </span>
              </h1>

              <p className="text-purple-200 text-sm sm:text-base leading-relaxed">
                Instant mobile access to authentic lecture notes, diagrams, and course materials uploaded by Bernice University Buea lecturers across all 6 faculties. Listen to notes with AI-powered Read Aloud or study comfortably in our dedicated e-book reader.
              </p>
            </div>

            {/* Official University Crest Banner Display */}
            <div className="hidden sm:flex shrink-0 w-28 h-28 md:w-36 md:h-36 rounded-full bg-white p-1.5 shadow-2xl border-4 border-amber-400 items-center justify-center overflow-hidden">
              <img
                src="/logo.png"
                alt="Bernice University Buea Official Crest"
                className="w-full h-full object-contain drop-shadow"
              />
            </div>
          </div>

          {/* Quick Search Form */}
          <form onSubmit={handleSearchSubmit} className="pt-2 flex flex-col sm:flex-row gap-2.5 max-w-2xl w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-300 pointer-events-none" />
              <input
                type="text"
                placeholder="Search courses, topics (e.g. Boolean, Anatomy), or lecturers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-slate-900 placeholder:text-purple-300 focus:placeholder:text-slate-400 border border-purple-700/60 focus:border-amber-400 outline-none transition text-base backdrop-blur-sm shadow-inner min-h-[48px]"
              />
            </div>
            <button
              type="submit"
              className="min-h-[48px] px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-purple-950 font-extrabold text-sm shadow-lg flex items-center justify-center space-x-2 transition cursor-pointer active:scale-[0.98] shrink-0"
            >
              <span>Search Notes</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Key Value Badges */}
          <div className="pt-2 flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs text-purple-200">
            <span className="inline-flex items-center space-x-1.5 bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>No Password Needed</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-xs">
              <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Read-Aloud Speech</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-xs">
              <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Original PDF E-Reader</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>In-App Offline Downloads</span>
            </span>
          </div>
        </div>
      </div>

      {/* STEP 1: CHOOSE A LEVEL */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-purple-900">
              <span className="w-6 h-6 rounded-full bg-purple-900 text-amber-300 flex items-center justify-center text-xs font-black shrink-0">
                1
              </span>
              <span>Step 1: Choose Your Academic Level</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              Select Your Class Level to Begin
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Large touch-friendly buttons optimized for mobile & tablet study
          </p>
        </div>

        {/* The 3 Large Easy-to-Tap Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {(['Level 100', 'Level 200', 'Level 300'] as Level[]).map((level) => {
            const count = getLevelCount(level);
            const details = levelDetails[level];

            return (
              <button
                key={level}
                onClick={() => onSelectLevel(level)}
                className={`group text-left p-5 sm:p-7 rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden active:scale-[0.98] min-h-[140px] sm:min-h-[180px] ${details.accentColor}`}
              >
                <div className="space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold border ${details.badgeColor}`}>
                      {details.tag}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-900 border border-purple-200">
                      {count} {count === 1 ? 'Note' : 'Notes'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 group-hover:text-purple-900 transition-colors">
                      {level}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5 sm:mt-2 line-clamp-2 leading-relaxed">
                      {details.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 sm:pt-6 mt-3 border-t border-slate-100 flex items-center justify-between text-sm font-bold text-purple-900 group-hover:text-amber-600 transition-colors">
                  <span>Browse Faculties</span>
                  <div className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-purple-100 group-hover:bg-amber-400 group-hover:text-purple-950 flex items-center justify-center transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* University Announcement & Guidelines */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-5 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-11 h-11 rounded-full bg-white p-0.5 border-2 border-amber-400 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
            <img src="/logo.png" alt="BUB" className="w-full h-full object-contain" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-amber-950">
              Bernice University Buea Academic Quality Assurance
            </h4>
            <p className="text-xs text-amber-900/80 mt-0.5">
              {notes.length === 0
                ? 'Welcome to the academic repository. Verified lecture notes will appear as departmental lecturers publish them. Authorized lecturers can sign in via Lecturer & Admin Login above to upload course materials.'
                : 'All published PDF course notes are verified and authorized by Bernice University Buea academic faculties. Students can download notes for offline study or use our built-in e-reader with voice assistance.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
