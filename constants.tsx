
import React from 'react';
import { Settings } from 'lucide-react';

export const HOURS = [
  "01:00 PM", 
  "02:00 PM", 
  "03:00 PM", 
  "04:00 PM",
  "05:00 PM (Coffee break)", 
  "05:15 PM (Resume)", 
  "06:00 PM",
  "07:00 PM (Dinner break)", 
  "07:45 PM (Resume)", 
  "08:00 PM",
  "09:00 PM", 
  "10:00 PM"
];

export const PROJECT_ROLES = [
  "Project Manager",
  "Product Owner",
  "Lead Developer",
  "Developer",
  "Lead Designer",
  "UX Designer",
  "UI Designer",
  "QA Lead",
  "QA Specialist",
  "DevOps Engineer",
  "Data Scientist",
  "Security Architect",
  "Stakeholder",
  "Subject Matter Expert",
  "Strategic Advisor",
  "Operational Lead",
  "Executive Sponsor",
  "Marketing Lead",
  "Sales Representative",
  "Legal Counsel"
];

export const BrandingLogo = () => (
  <div className="flex items-center gap-3">
    <div className="relative w-10 h-10 flex items-center justify-center">
      <div className="absolute inset-0 bg-brand-red rounded-lg opacity-10 animate-pulse-slow"></div>
      <div className="grid grid-cols-2 gap-0.5 relative z-10 p-1">
         <Settings size={18} className="text-brand-red rotate-12" />
         <Settings size={14} className="text-brand-red -rotate-12 translate-y-1" />
      </div>
    </div>
    <div className="flex flex-col leading-none">
      <span className="text-xl font-black text-brand-red tracking-tighter  leading-tight">Rapid Grow</span>
      <span className="text-[9px] font-black text-brand-grey tracking-[0.2em]">Management group</span>
    </div>
  </div>
);

export const PriorityStamp = () => (
  <div className="border-4 border-brand-red rounded-full px-5 py-1.5 inline-flex items-center justify-center -rotate-12 opacity-80 select-none pointer-events-none shadow-lg">
    <span className="text-brand-red font-black text-md tracking-widest">Priority</span>
  </div>
);
