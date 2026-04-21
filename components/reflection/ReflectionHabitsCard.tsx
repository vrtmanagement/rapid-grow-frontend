import React from 'react';

interface ReflectionHabitsCardProps {
  error: string | null;
}

const HabitItem: React.FC<{ text: string }> = ({ text }) => (
  <li className="flex items-start gap-3 text-slate-700">
    <span className="mt-2 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-brand-red" />
    <span className="text-[15px] leading-7">{text}</span>
  </li>
);

const ReflectionHabitsCard: React.FC<ReflectionHabitsCardProps> = ({ error }) => (
  <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-10">
    <h3 className="text-xl text-red-600">Daily Reflection Habits</h3>
    <ul className="space-y-8">
      <HabitItem text="Write what you accomplished today so you end the day with a sense of completion." />
      <HabitItem text="Note when you felt most energized so you can design more of those moments." />
      <HabitItem text="Capture your top action items for tomorrow before you log off." />
      <HabitItem text="Send a quick thank you message or email to someone (including yourself) who deserves it." />
    </ul>
    {error ? (
      <p className="mt-3 text-xs text-red-500">{error}</p>
    ) : null}
  </div>
);

export default ReflectionHabitsCard;
