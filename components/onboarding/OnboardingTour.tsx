import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'rapidgrow-onboarding-complete';

type TourStep = {
  title: string;
  body: string;
  route?: string;
};

const OWNER_STEPS: TourStep[] = [
  { title: 'Command Matrix', body: 'See projects, tasks, attendance, and weekly performance in one place.', route: '/' },
  { title: 'TaskHub', body: 'Create, assign, and complete work in TaskHub.', route: '/spaces' },
  { title: 'Vision goals', body: 'Connect goals to tasks and watch progress update automatically.', route: '/yearly' },
  { title: 'Invite your team', body: 'Add employees from Staff when you are ready to scale.', route: '/staff' },
];

const EMPLOYEE_STEPS: TourStep[] = [
  { title: 'Your tasks', body: 'See assigned tasks and update status from TaskHub.', route: '/spaces' },
  { title: 'Attendance', body: 'Clock in and out from the attendance screen.', route: '/attendance' },
  { title: 'Daily goals', body: "Check Vision for today's priorities.", route: '/daily' },
];

function readCompleted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markCompleted() {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // ignore
  }
}

const OnboardingTour: React.FC<{ role: string }> = ({ role }) => {
  const navigate = useNavigate();
  const steps = useMemo(
    () => (role === 'Employee' ? EMPLOYEE_STEPS : OWNER_STEPS),
    [role]
  );
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!readCompleted()) setOpen(true);
  }, []);

  if (!open) return null;

  const step = steps[index];
  const isLast = index >= steps.length - 1;

  const finish = () => {
    markCompleted();
    setOpen(false);
  };

  const goNext = () => {
    if (step.route) {
      navigate(step.route);
    }
    if (isLast) {
      finish();
      return;
    }
    setIndex((value) => value + 1);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
          Step {index + 1} of {steps.length}
        </p>
        <h2 className="text-xl font-bold text-slate-900 mt-2">{step.title}</h2>
        <p className="text-slate-600 mt-2 text-sm">{step.body}</p>
        <div className="mt-6 flex justify-between gap-3">
          <button type="button" onClick={finish} className="text-sm font-medium text-slate-500">
            Skip tour
          </button>
          <button
            type="button"
            onClick={goNext}
            className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white"
          >
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
