import React from 'react';
import { NavLink, useLocation, useSearchParams } from 'react-router-dom';
import { BarChart3, Calendar, CheckSquare, Sun, Target } from 'lucide-react';
import { usePermissions } from '../../context/usePermissions';
import {
  buildVisionStageHref,
  resolveVisionStageFromPath,
  VISION_STAGE_CONFIG,
} from './visionNavigation';

const iconForStage = (key: string) => {
  if (key === 'year') return Target;
  if (key === 'quarter') return BarChart3;
  if (key === 'month') return Calendar;
  if (key === 'week') return CheckSquare;
  return Sun;
};

const VisionHeaderTabs: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { hasPermission } = usePermissions();

  const stage = resolveVisionStageFromPath(location.pathname);
  const selection = {
    yearId: searchParams.get('yearId') || '',
    quarterId: searchParams.get('quarterId') || '',
    monthId: searchParams.get('monthId') || '',
    weekId: searchParams.get('weekId') || '',
  };

  const visibleStages = VISION_STAGE_CONFIG.filter((item) => {
    if (item.key === 'year') return hasPermission('YEARLY_VIEW');
    if (item.key === 'quarter') return hasPermission('QUARTERLY_VIEW');
    if (item.key === 'month') return hasPermission('MONTHLY_VIEW');
    if (item.key === 'week') return hasPermission('WEEKLY_VIEW');
    return hasPermission('DAILY_VIEW');
  });

  return (
    <div className="min-w-0 max-w-full overflow-x-auto no-scrollbar">
      <div className="inline-flex min-w-max items-center gap-1.5 rounded-[1.15rem] border border-slate-200 bg-white/95 px-2.5 py-1.5 shadow-[0_10px_28px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        {visibleStages.map((item) => {
          const Icon = iconForStage(item.key);
          const active = item.key === stage;

          return (
            <NavLink
              key={item.key}
              to={buildVisionStageHref(item.key, selection)}
              className={`inline-flex items-center gap-2 rounded-[0.95rem] px-3 py-2 text-[13px] font-semibold tracking-[-0.01em] transition ${
                active
                  ? 'bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={15} className={active ? 'text-brand-red' : 'text-slate-400'} />
              <span className="whitespace-nowrap">{item.short}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default VisionHeaderTabs;
