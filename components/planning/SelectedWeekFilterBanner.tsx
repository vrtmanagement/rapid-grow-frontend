import React from 'react';
import { Link } from 'react-router-dom';

interface SelectedWeekFilterBannerProps {
  selectedWeekId: string;
  onlySelectedWeek: boolean;
  onToggleOnlySelectedWeek: (value: boolean) => void;
}

const SelectedWeekFilterBanner: React.FC<SelectedWeekFilterBannerProps> = ({
  selectedWeekId,
  onlySelectedWeek,
  onToggleOnlySelectedWeek,
}) => {
  if (!selectedWeekId) return null;

  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-brand-red/20 bg-red-50/40 px-3 py-2">
      <div className="text-xs text-slate-700">
        Opened from Weekly focus. Week ID: <span className="font-semibold">{selectedWeekId}</span>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={onlySelectedWeek}
            onChange={(e) => onToggleOnlySelectedWeek(e.target.checked)}
          />
          Show only this week
        </label>
        <Link to="/daily" className="text-xs font-medium text-brand-red hover:underline">
          Clear filter
        </Link>
      </div>
    </div>
  );
};

export default SelectedWeekFilterBanner;
