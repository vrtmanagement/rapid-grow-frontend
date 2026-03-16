import React from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { AttendanceSession } from './attendanceUtils';

interface Props {
  activeSession: AttendanceSession | null;
  locationInput: string;
  onLocationChange: (value: string) => void;
  onLogin: () => void;
  onLogout: () => void;
  loginLoading?: boolean;
  logoutLoading?: boolean;
  errorMessage?: string | null;
}

const AttendanceLiveSession: React.FC<Props> = ({
  activeSession,
  locationInput,
  onLocationChange,
  onLogin,
  onLogout,
  loginLoading,
  logoutLoading,
  errorMessage,
}) => {
  return (
    <div className="bg-slate-900 text-white rounded-[2rem] p-7 shadow-2xl flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 mb-1">Live session</p>
          <h3 className="text-lg font-semibold">Attendance control</h3>
        </div>
        <div className="px-3 py-1 rounded-full bg-slate-800 text-[11px] flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${activeSession ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          {activeSession ? 'Active' : 'Idle'}
        </div>
      </div>
      <div className="space-y-3">
        <label className="block text-[11px] text-slate-400">
          Location / workspace
          <input
            type="text"
            value={locationInput}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="E.g. Bangalore office, Remote – Home"
            className="mt-1 w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-red/60"
          />
        </label>
        <p className="text-[11px] text-slate-400">
          We capture login & logout time, place and calculate your active hours automatically.
        </p>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onLogin}
          disabled={!!activeSession || !!loginLoading}
          className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold shadow-lg ${
            activeSession || loginLoading
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-emerald-500 text-white hover:bg-emerald-400'
          }`}
        >
          {loginLoading ? (
            <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <LogIn size={14} />
          )}
          {loginLoading ? 'Logging in...' : 'Login'}
        </button>
        <button
          type="button"
          onClick={onLogout}
          disabled={!activeSession || !!logoutLoading}
          className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold shadow-lg ${
            activeSession && !logoutLoading
              ? 'bg-rose-500 text-white hover:bg-rose-400'
              : !activeSession && !logoutLoading
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-slate-800 text-slate-200 cursor-wait'
          }`}
        >
          {logoutLoading ? (
            <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <LogOut size={14} />
          )}
          {logoutLoading ? 'Logging out...' : 'Logout'}
        </button>
      </div>
      {errorMessage && (
        <p className="mt-2 text-[11px] text-rose-300">
          {errorMessage}
        </p>
      )}
      {activeSession && (
        <div className="mt-3 rounded-xl bg-slate-800/80 border border-slate-700 px-4 py-3 text-[11px] text-slate-300 space-y-1">
          <div className="flex items-center justify-between">
            <span>Logged in at</span>
            <span className="font-mono">
              {new Date(activeSession.loginTime).toLocaleTimeString()}
            </span>
          </div>
          {activeSession.location && (
            <div className="flex items-center justify-between">
              <span>Location</span>
              <span className="truncate max-w-[160px] text-right">
                {activeSession.location}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceLiveSession;

