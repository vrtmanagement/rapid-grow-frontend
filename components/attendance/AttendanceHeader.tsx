import React from 'react';
import { Calendar, Clock, BarChart3, Moon, SunMedium } from 'lucide-react';
import { Range } from './attendanceUtils';

interface Props {
  range: Range;
  onRangeChange: (range: Range) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  subtitle: string;
}

const AttendanceHeader: React.FC<Props> = ({ range, onRangeChange, theme, onToggleTheme, subtitle }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-1.5 w-8 bg-brand-red rounded-full" />
          <span className="text-[15px] text-slate-500">{subtitle}</span>
        </div>
        <h2 className="text-3xl md:text-4xl text-slate-900 leading-none">
          Manage Attendance
        </h2>
        <p className="text-slate-500 text-[15px] md:text-lg mt-3">
          Login & logout, track hours, and review attendance + leave history in one premium view.
        </p>
      </div>
      <div className="flex flex-col items-end gap-3">
        <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => onRangeChange('day')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm ${
              range === 'day' ? 'bg-brand-red text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Clock size={14} /> Today
          </button>
          <button
            type="button"
            onClick={() => onRangeChange('week')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm ${
              range === 'week' ? 'bg-brand-red text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Calendar size={14} /> Week
          </button>
          <button
            type="button"
            onClick={() => onRangeChange('month')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm ${
              range === 'month' ? 'bg-brand-red text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <BarChart3 size={14} /> Month
          </button>
        </div>
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 shadow-sm hover:bg-slate-50"
        >
          {theme === 'light' ? <Moon size={14} /> : <SunMedium size={14} />}
          {theme === 'light' ? 'Night mode' : 'Day mode'}
        </button>
      </div>
    </div>
  );
};

export default AttendanceHeader;

