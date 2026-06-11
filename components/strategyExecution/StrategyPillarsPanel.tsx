import React, { useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  TrendingUp,
  Award,
  HeartHandshake,
  Users,
  Wallet,
  Target,
  Lightbulb,
  FolderKanban,
  ArrowDown,
  Info,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import ConfirmDialog from '../ui/ConfirmDialog';
import { StrategyPillar, StrategyItem } from '../../services/strategyExecutionApi';

interface StrategyPillarsPanelProps {
  pillars: StrategyPillar[];
  canManage: boolean;
  onChange: (pillars: StrategyPillar[]) => void;
}

type LayerKey = 'metrics' | 'initiatives' | 'projects';

interface LayerConfig {
  key: LayerKey;
  step: number;
  label: string;
  singular: string;
  title: string;
  hint: string;
  icon: LucideIcon;
  accent: string;
  ring: string;
  bg: string;
  chip: string;
  placeholder: string;
}

const DEFAULT_PILLAR_IDS = new Set(['growth', 'quality', 'service', 'people', 'finance']);

const LAYERS: LayerConfig[] = [
  {
    key: 'metrics',
    step: 1,
    label: 'Metrics',
    singular: 'metric',
    title: 'How you measure success',
    hint: 'KPIs or targets that show whether this pillar is on track.',
    icon: Target,
    accent: 'text-sky-700 dark:text-sky-300',
    ring: 'ring-sky-100 dark:ring-sky-900/40',
    bg: 'bg-sky-50/80 dark:bg-sky-950/20',
    chip: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200',
    placeholder: 'e.g. Revenue growth 15%',
  },
  {
    key: 'initiatives',
    step: 2,
    label: 'Initiatives',
    singular: 'initiative',
    title: 'What you will focus on',
    hint: 'Big strategic bets or programs that move the metrics.',
    icon: Lightbulb,
    accent: 'text-amber-700 dark:text-amber-300',
    ring: 'ring-amber-100 dark:ring-amber-900/40',
    bg: 'bg-amber-50/80 dark:bg-amber-950/20',
    chip: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
    placeholder: 'e.g. Launch new product line',
  },
  {
    key: 'projects',
    step: 3,
    label: 'Projects',
    singular: 'project',
    title: 'How you will execute',
    hint: 'Specific projects or workstreams that deliver each initiative.',
    icon: FolderKanban,
    accent: 'text-emerald-700 dark:text-emerald-300',
    ring: 'ring-emerald-100 dark:ring-emerald-900/40',
    bg: 'bg-emerald-50/80 dark:bg-emerald-950/20',
    chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
    placeholder: 'e.g. Q2 rollout project',
  },
];

const PILLAR_META: Record<
  string,
  { icon: LucideIcon; gradient: string; border: string; description: string }
> = {
  growth: {
    icon: TrendingUp,
    gradient: 'from-emerald-500/10 via-white to-teal-500/5 dark:from-emerald-500/15 dark:via-slate-900 dark:to-teal-500/10',
    border: 'border-emerald-200/80 dark:border-emerald-800/60',
    description: 'Revenue, market share, and expansion goals.',
  },
  quality: {
    icon: Award,
    gradient: 'from-sky-500/10 via-white to-blue-500/5 dark:from-sky-500/15 dark:via-slate-900 dark:to-blue-500/10',
    border: 'border-sky-200/80 dark:border-slate-800/60',
    description: 'Product quality, reliability, and excellence.',
  },
  service: {
    icon: HeartHandshake,
    gradient: 'from-violet-500/10 via-white to-purple-500/5 dark:from-violet-500/15 dark:via-slate-900 dark:to-purple-500/10',
    border: 'border-violet-200/80 dark:border-violet-800/60',
    description: 'Customer experience and service delivery.',
  },
  people: {
    icon: Users,
    gradient: 'from-amber-500/10 via-white to-orange-500/5 dark:from-amber-500/15 dark:via-slate-900 dark:to-orange-500/10',
    border: 'border-amber-200/80 dark:border-amber-800/60',
    description: 'Talent, culture, and organizational capability.',
  },
  finance: {
    icon: Wallet,
    gradient: 'from-rose-500/10 via-white to-red-500/5 dark:from-rose-500/15 dark:via-slate-900 dark:to-red-500/10',
    border: 'border-rose-200/80 dark:border-rose-800/60',
    description: 'Profitability, cash flow, and financial health.',
  },
};

function newItem(text = ''): StrategyItem {
  return { id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text };
}

function slugify(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || `pillar-${Date.now()}`;
}

function countFilled(items: StrategyItem[]) {
  return items.filter((item) => item.text.trim()).length;
}

function pillarTotal(pillar: StrategyPillar) {
  return countFilled(pillar.metrics) + countFilled(pillar.initiatives) + countFilled(pillar.projects);
}

function getPillarMeta(pillar: StrategyPillar) {
  return (
    PILLAR_META[pillar.id] || {
      icon: Layers,
      gradient: 'from-slate-500/10 via-white to-slate-500/5 dark:from-slate-500/15 dark:via-slate-900 dark:to-slate-800/10',
      border: 'border-slate-200/80 dark:border-slate-700/60',
      description: 'Custom strategic pillar for your organization.',
    }
  );
}

interface LayerSectionProps {
  layer: LayerConfig;
  items: StrategyItem[];
  canManage: boolean;
  onUpdate: (items: StrategyItem[]) => void;
}

const LayerSection: React.FC<LayerSectionProps> = ({ layer, items, canManage, onUpdate }) => {
  const filledItems = items.filter((item) => item.text.trim());
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const LayerIcon = layer.icon;

  const confirmAdd = () => {
    const text = addDraft.trim();
    if (!text) return;
    onUpdate([...items.filter((item) => item.text.trim()), newItem(text)]);
    setAddDraft('');
    setAdding(false);
  };

  const cancelAdd = () => {
    setAddDraft('');
    setAdding(false);
  };

  const startEdit = (item: StrategyItem) => {
    setEditingId(item.id);
    setEditDraft(item.text);
    setAdding(false);
  };

  const confirmEdit = () => {
    if (!editingId) return;
    const text = editDraft.trim();
    if (!text) {
      onUpdate(items.filter((item) => item.id !== editingId));
    } else {
      onUpdate(items.map((item) => (item.id === editingId ? { ...item, text } : item)));
    }
    setEditingId(null);
    setEditDraft('');
  };

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    onUpdate(items.filter((item) => item.id !== pendingDeleteId));
    if (editingId === pendingDeleteId) {
      setEditingId(null);
      setEditDraft('');
    }
    setPendingDeleteId(null);
  };

  return (
    <section
      className={`rounded-2xl border border-white/80 p-5 ring-1 ${layer.ring} ${layer.bg} dark:border-slate-800/80`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-900">
            <LayerIcon size={18} className={layer.accent} />
          </div>
          <div className="min-w-0">
            <p className={`text-xs font-bold uppercase tracking-wider ${layer.accent}`}>
              Step {layer.step} · {layer.label}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">{layer.title}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{layer.hint}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`hidden rounded-full px-2.5 py-1 text-[10px] font-bold uppercase sm:inline ${layer.chip}`}>
            {filledItems.length} added
          </span>
          {canManage && !adding && editingId === null && (
            <button
              type="button"
              onClick={() => {
                setAdding(true);
                setAddDraft('');
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold shadow-sm ring-1 ring-slate-200 transition hover:ring-brand-red/40 dark:bg-slate-900 dark:ring-slate-700 ${layer.accent}`}
            >
              <Plus size={14} />
              Add
            </button>
          )}
        </div>
      </div>

      <ul className="space-y-2">
        {filledItems.map((item, idx) => {
          const isEditing = editingId === item.id;
          return (
            <li
              key={item.id}
              className="rounded-xl border border-white/80 bg-white/90 px-3 py-2.5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80"
            >
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                    rows={2}
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={confirmEdit}
                      className="inline-flex items-center gap-1 rounded-lg bg-brand-red px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <Check size={14} /> Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setEditDraft('');
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-600"
                    >
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-500 dark:bg-slate-800">
                    {idx + 1}
                  </span>
                  <p className="min-w-0 flex-1 text-sm leading-relaxed text-slate-700 break-words dark:text-slate-300">
                    {item.text}
                  </p>
                  {canManage && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-red dark:hover:bg-slate-800"
                        aria-label={`Edit ${layer.singular}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(item.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                        aria-label={`Delete ${layer.singular}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {adding && (
        <div className="mt-3 space-y-2 rounded-xl border border-dashed border-slate-300 bg-white/80 p-3 dark:border-slate-600 dark:bg-slate-900/60">
          <input
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
            value={addDraft}
            onChange={(e) => setAddDraft(e.target.value)}
            placeholder={layer.placeholder}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmAdd();
              if (e.key === 'Escape') cancelAdd();
            }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!addDraft.trim()}
              onClick={confirmAdd}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-red px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              <Check size={14} /> Add {layer.singular}
            </button>
            <button
              type="button"
              onClick={cancelAdd}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-600"
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {!filledItems.length && !adding && !canManage && (
        <p className="rounded-xl border border-dashed border-slate-300/80 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-600">
          No {layer.label.toLowerCase()} defined yet.
        </p>
      )}

      {pendingDeleteId !== null && (
        <ConfirmDialog
          title={`Delete this ${layer.singular}?`}
          description="It will be removed from your strategy map. You can add it again later."
          confirmLabel="Yes"
          cancelLabel="No"
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={confirmDelete}
        />
      )}
    </section>
  );
};

const StrategyPillarsPanel: React.FC<StrategyPillarsPanelProps> = ({
  pillars,
  canManage,
  onChange,
}) => {
  const [activePillarId, setActivePillarId] = useState(pillars[0]?.id || 'growth');
  const [showAddPillar, setShowAddPillar] = useState(false);
  const [newPillarName, setNewPillarName] = useState('');
  const [pendingDeletePillarId, setPendingDeletePillarId] = useState<string | null>(null);

  const activeIndex = useMemo(
    () => pillars.findIndex((pillar) => pillar.id === activePillarId),
    [pillars, activePillarId]
  );
  const activePillar = activeIndex >= 0 ? pillars[activeIndex] : pillars[0];
  const meta = activePillar ? getPillarMeta(activePillar) : getPillarMeta({ id: 'growth', name: 'Growth', metrics: [], initiatives: [], projects: [] });
  const PillarIcon = meta.icon;

  const updatePillar = (index: number, patch: Partial<StrategyPillar>) => {
    onChange(pillars.map((pillar, i) => (i === index ? { ...pillar, ...patch } : pillar)));
  };

  const updateLayer = (layer: LayerKey, items: StrategyItem[]) => {
    if (activeIndex < 0) return;
    updatePillar(activeIndex, { [layer]: items.filter((item) => item.text.trim()) });
  };

  const addPillar = () => {
    const name = newPillarName.trim();
    if (!name) return;
    let id = slugify(name);
    if (pillars.some((pillar) => pillar.id === id)) {
      id = `${id}-${Date.now()}`;
    }
    const next: StrategyPillar = {
      id,
      name,
      metrics: [],
      initiatives: [],
      projects: [],
    };
    onChange([...pillars, next]);
    setActivePillarId(id);
    setNewPillarName('');
    setShowAddPillar(false);
  };

  const deletePillar = () => {
    if (!pendingDeletePillarId) return;
    const next = pillars.filter((pillar) => pillar.id !== pendingDeletePillarId);
    onChange(next);
    if (activePillarId === pendingDeletePillarId) {
      setActivePillarId(next[0]?.id || '');
    }
    setPendingDeletePillarId(null);
  };

  if (!activePillar) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
        No strategy pillars yet. {canManage ? 'Click + to add your first pillar.' : ''}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
            <Info size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">What is the Strategy Map?</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Pick a pillar, then add metrics, initiatives, and projects — top to bottom.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {pillars.map((pillar) => {
          const pillarMeta = getPillarMeta(pillar);
          const Icon = pillarMeta.icon;
          const isActive = pillar.id === activePillar.id;
          const total = pillarTotal(pillar);
          const isCustom = !DEFAULT_PILLAR_IDS.has(pillar.id);
          return (
            <div key={pillar.id} className="inline-flex items-center">
              <button
                type="button"
                onClick={() => setActivePillarId(pillar.id)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? 'border-brand-red bg-brand-red text-white shadow-md shadow-brand-red/20'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                }`}
              >
                <Icon size={16} />
                {pillar.name}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {total}
                </span>
              </button>
              {canManage && isCustom && isActive && (
                <button
                  type="button"
                  onClick={() => setPendingDeletePillarId(pillar.id)}
                  className="ml-1 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Delete ${pillar.name} pillar`}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
        {canManage && (
          <button
            type="button"
            onClick={() => setShowAddPillar(true)}
            className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-500 transition hover:border-brand-red hover:text-brand-red dark:border-slate-600"
            aria-label="Add pillar"
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      {showAddPillar && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">New strategic pillar</p>
          <div className="flex flex-wrap gap-2">
            <input
              className="min-w-[200px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              value={newPillarName}
              onChange={(e) => setNewPillarName(e.target.value)}
              placeholder="e.g. Innovation, Sustainability…"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') addPillar();
                if (e.key === 'Escape') {
                  setShowAddPillar(false);
                  setNewPillarName('');
                }
              }}
            />
            <button
              type="button"
              disabled={!newPillarName.trim()}
              onClick={addPillar}
              className="rounded-xl bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Add pillar
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddPillar(false);
                setNewPillarName('');
              }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 dark:border-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className={`overflow-hidden rounded-2xl border bg-gradient-to-br shadow-sm ${meta.border} ${meta.gradient}`}>
        <div className="border-b border-white/60 bg-white/50 px-6 py-5 backdrop-blur-sm dark:border-slate-800/60 dark:bg-slate-900/50">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:ring-slate-700">
              <PillarIcon size={22} className="text-brand-red" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white">{activePillar.name} pillar</h4>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{meta.description}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-6">
          {LAYERS.map((layer, layerIndex) => (
            <React.Fragment key={layer.key}>
              {layerIndex > 0 && (
                <div className="flex justify-center py-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                    <ArrowDown size={16} className="text-slate-400" />
                  </div>
                </div>
              )}
              <LayerSection
                layer={layer}
                items={activePillar[layer.key]}
                canManage={canManage}
                onUpdate={(items) => updateLayer(layer.key, items)}
              />
            </React.Fragment>
          ))}
        </div>
      </div>

      {pendingDeletePillarId !== null && (
        <ConfirmDialog
          title="Delete this pillar?"
          description="All metrics, initiatives, and projects under this pillar will be removed."
          confirmLabel="Yes"
          cancelLabel="No"
          onCancel={() => setPendingDeletePillarId(null)}
          onConfirm={deletePillar}
        />
      )}
    </div>
  );
};

export default StrategyPillarsPanel;
