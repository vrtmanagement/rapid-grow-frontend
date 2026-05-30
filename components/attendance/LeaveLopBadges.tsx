import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { LeaveLopBadge } from './attendanceUtils';
import { getLopBadgeClass } from './lopUtils';

interface LeaveLopBadgesProps {
  badges?: LeaveLopBadge[];
  compact?: boolean;
  className?: string;
}

const LeaveLopBadges: React.FC<LeaveLopBadgesProps> = ({ badges = [], compact = false, className = '' }) => {
  if (!badges.length) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {badges.map((badge) => (
        <span
          key={badge.key}
          title={`LOP: ${badge.label}`}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold uppercase tracking-[0.08em] ${getLopBadgeClass(badge.tone)} ${
            compact ? 'text-[10px]' : 'text-[11px]'
          }`}
        >
          {badge.tone === 'warning' || badge.tone === 'danger' ? (
            <AlertTriangle size={compact ? 10 : 12} />
          ) : (
            <Info size={compact ? 10 : 12} />
          )}
          {badge.label}
        </span>
      ))}
    </div>
  );
};

export default LeaveLopBadges;
