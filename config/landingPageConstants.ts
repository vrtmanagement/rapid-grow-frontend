import {
  BarChart3,
  Bot,
  Calendar,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  MessageSquare,
  Target,
  Users,
  Wallet,
  Briefcase,
  Sparkles,
} from 'lucide-react';

export type PublicPlanId = 'free' | 'gold' | 'platinum';

export const PUBLIC_PLANS: Array<{
  id: PublicPlanId;
  name: string;
  price: string;
  period: string;
  description: string;
  highlight?: boolean;
  features: string[];
}> = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for small teams getting started with performance management.',
    features: ['Up to 5 users', '50 AI calls / month', '100 MB storage', 'All core modules'],
  },
  {
    id: 'gold',
    name: 'Gold',
    price: '$49',
    period: '/ month',
    description: 'For growing teams that need more capacity and AI-powered workflows.',
    highlight: true,
    features: ['Up to 50 users', '500 AI calls / month', '5 GB storage', 'Priority support'],
  },
  {
    id: 'platinum',
    name: 'Platinum',
    price: '$149',
    period: '/ month',
    description: 'Enterprise-grade limits for large organizations and mission-critical ops.',
    features: ['Up to 200 users', '10,000 AI calls / month', '20 GB storage', 'Dedicated onboarding'],
  },
];

export const LANDING_FEATURES = [
  {
    icon: LayoutDashboard,
    title: 'Command Matrix',
    description: 'Unified dashboard for projects, tasks, attendance, and weekly performance.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: Briefcase,
    title: 'Project Charters',
    description: 'Enterprise mission control for charters, milestones, and execution tracking.',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: ClipboardList,
    title: 'TaskHub',
    description: 'Kanban tasks, review workflows, dependencies, and time tracking in one hub.',
    image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: Bot,
    title: 'AI Agent',
    description: 'Extract tasks, assign work, and generate project plans with AI assistance.',
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: Calendar,
    title: 'Manage Attendance',
    description: 'Clock in/out, leave requests, team attendance history, and approvals.',
    image: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: Target,
    title: 'Vision Goals',
    description: 'Cascade goals from yearly vision down to daily actions and priorities.',
    image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: BarChart3,
    title: 'Review Matrix',
    description: 'Structured daily debriefs, reflections, and performance reviews.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: MessageSquare,
    title: 'Communication',
    description: 'Real-time team messaging with unread tracking and pinned conversations.',
    image: 'https://images.unsplash.com/photo-1521737711862-e3b97375f902?auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: Users,
    title: 'Staff & Org Chart',
    description: 'People directory, org structure, strengths, and skill gap analytics.',
    image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: Sparkles,
    title: 'Content Calendar',
    description: 'Plan and manage marketing content across channels and campaigns.',
    image: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: Wallet,
    title: 'CRM & Expenses',
    description: 'Sales pipeline, lead tracking, expense claims, and travel reimbursements.',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80',
  },
  {
    icon: CheckCircle2,
    title: 'Client Portal',
    description: 'Shareable project progress views for clients without full app access.',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=80',
  },
];

export const LANDING_TAGLINE = 'Your home for projects, tasks, attendance, and weekly performance.';
export const LANDING_HERO_IMAGE =
  'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1400&q=80';
