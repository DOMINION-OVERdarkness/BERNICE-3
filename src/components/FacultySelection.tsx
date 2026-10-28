import React from 'react';
import { ArrowLeft, BookOpen, Cpu, HeartPulse, Sprout, Briefcase, GraduationCap, Users, ArrowRight } from 'lucide-react';
import { Faculty, Level, StudyNote, FACULTIES } from '../types.ts';

interface FacultySelectionProps {
  selectedLevel: Level;
  notes: StudyNote[];
  onSelectFaculty: (faculty: Faculty) => void;
  onBackToLevel: () => void;
}

export const FacultySelection: React.FC<FacultySelectionProps> = ({
  selectedLevel,
  notes,
  onSelectFaculty,
  onBackToLevel,
}) => {
  // Count published notes for this faculty and selected level
  const getFacultyCount = (faculty: Faculty) => {
    return notes.filter((n) => n.faculty === faculty && n.level === selectedLevel).length;
  };

  const facultyMetadata: Record<Faculty, { icon: React.ReactNode; shortDesc: string; departments: string; bgTone: string }> = {
    'Faculty of Engineering and Technology': {
      icon: <Cpu className="w-6 h-6 text-purple-700" />,
      shortDesc: 'Electrical, Computer, Mechanical, Civil, Chemical & Production Engineering',
      departments: 'Civil, Mechanical, Electrical, Computer, Chemical',
      bgTone: 'hover:border-purple-500 hover:bg-purple-50/50',
    },
    'Faculty of Health and Biomedical Science': {
      icon: <HeartPulse className="w-6 h-6 text-rose-600" />,
      shortDesc: 'Anatomy, Physiology, Pharmacology, Medical Laboratory & Nursing Science',
      departments: 'Anatomy, Physiology, Pharmacology, Medical Lab',
      bgTone: 'hover:border-rose-500 hover:bg-rose-50/50',
    },
    'Faculty of Agriculture': {
      icon: <Sprout className="w-6 h-6 text-emerald-600" />,
      shortDesc: 'Crop Science, Animal Science, Soil Science, Agricultural Economics & Fisheries',
      departments: 'Crop Science, Animal Science, Soil Science, Agri-Econ',
      bgTone: 'hover:border-emerald-500 hover:bg-emerald-50/50',
    },
    'Faculty of Business and Management Sciences': {
      icon: <Briefcase className="w-6 h-6 text-blue-600" />,
      shortDesc: 'Accounting, Banking & Finance, Business Administration, Marketing & Management',
      departments: 'Accounting, Banking & Finance, Business Admin',
      bgTone: 'hover:border-blue-500 hover:bg-blue-50/50',
    },
    'Faculty of Education': {
      icon: <GraduationCap className="w-6 h-6 text-amber-600" />,
      shortDesc: 'Educational Foundations, Curriculum & Instruction, Educational Psychology & Guidance',
      departments: 'Curriculum & Instruction, Ed. Foundations, Psychology',
      bgTone: 'hover:border-amber-500 hover:bg-amber-50/50',
    },
    'Faculty of Home Economics and Social Works': {
      icon: <Users className="w-6 h-6 text-indigo-600" />,
      shortDesc: 'Food Science & Nutrition, Clothing & Textiles, Child Development & Social Welfare',
      departments: 'Food & Nutrition, Textiles, Social Welfare, Family Studies',
      bgTone: 'hover:border-indigo-500 hover:bg-indigo-50/50',
    },
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Back Button & Navigation Path */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBackToLevel}
          className="min-h-[44px] inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-300 text-slate-800 text-sm font-bold transition cursor-pointer shadow-sm active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-purple-900" />
          <span>Change Level (Back to Step 1)</span>
        </button>

        <div className="inline-flex items-center space-x-2 px-3 py-2 rounded-xl bg-purple-900 text-amber-300 text-xs font-bold tracking-wide shadow-sm">
          <span>Active Filter:</span>
          <span className="text-white bg-purple-800 px-2 py-0.5 rounded-lg border border-purple-700">
            {selectedLevel}
          </span>
        </div>
      </div>

      {/* Header section for Step 2 */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-widest text-purple-900">
          <span className="w-6 h-6 rounded-full bg-purple-900 text-amber-300 flex items-center justify-center text-xs font-black shrink-0">
            2
          </span>
          <span>Step 2: Choose Faculty for {selectedLevel}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
          University Faculties
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Select your faculty to view lecturers’ published lecture notes for {selectedLevel}.
        </p>
      </div>

      {/* Grid of the 6 Faculties */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {FACULTIES.map((faculty, idx) => {
          const count = getFacultyCount(faculty);
          const meta = facultyMetadata[faculty];

          return (
            <button
              key={faculty}
              onClick={() => onSelectFaculty(faculty)}
              className={`group text-left p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between cursor-pointer relative overflow-hidden active:scale-[0.98] min-h-[160px] ${meta.bgTone}`}
            >
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-white flex items-center justify-center shadow-sm shrink-0 transition-colors">
                    {meta.icon}
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      count > 0
                        ? 'bg-purple-50 text-purple-900 border-purple-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {count} {count === 1 ? 'Note' : 'Notes'}
                  </span>
                </div>

                <div>
                  <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Faculty 0{idx + 1}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-purple-950 transition-colors mt-0.5 leading-snug">
                    {faculty}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 sm:mt-2 line-clamp-2 leading-relaxed">
                    {meta.shortDesc}
                  </p>
                </div>
              </div>

              <div className="pt-4 sm:pt-5 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-900 group-hover:text-purple-700 transition-colors">
                <span>View {selectedLevel} Notes</span>
                <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-purple-900 group-hover:text-amber-300 flex items-center justify-center transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
