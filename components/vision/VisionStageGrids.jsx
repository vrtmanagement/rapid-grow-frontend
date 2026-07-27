import React from 'react';
import { Target } from 'lucide-react';
import { VisionHierarchyCard } from './VisionPrimitives';
import { buildVisionStageHref } from '../planning/visionNavigation';
import {
  getCalendarMonthNumber,
  getDaysInMonth,
  getMonthlyDate,
  getQuarterDayCount,
  getQuarterWeekCount,
  getQuarterlyDateRange,
  getWeeklyDateRange,
  getWeeksInMonth,
  getYearWeekCount,
  getYearlyDateRange,
} from './visionPlanningHelpers';

export const VisionYearStageGrid = ({
  visions,
  hierarchyProgressById,
  progressLoading,
  isAdmin,
  editingId,
  draftById,
  openCardMenuId,
  isCurrentPlanningYear,
  navigate,
  openEditor,
  deleteHierarchyItem,
  setDraft,
  saveNode,
  closeEditor,
  setOpenCardMenuId,
}) =>
  visions.length ? (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {visions.map((vision) => (
          <VisionHierarchyCard
            key={vision.id}
            item={vision}
            stageKey="year"
            stageLabel="Yearly"
            badge={`Vision ${String(vision.visionIndex).padStart(2, '0')}`}
            title={vision.text || 'Untitled yearly vision'}
            details={vision.details}
            progress={hierarchyProgressById.yearMap.get(String(vision.id || '').trim()) ?? vision.progress}
            footerLabel="Open vision"
            linkTo={buildVisionStageHref('quarter', { yearId: vision.id })}
            dateRange={getYearlyDateRange()}
            infoRows={[
              { label: 'Execution structure', value: '4 quarters' },
              { label: 'Monthly depth', value: '12 months' },
              { label: 'Weekly capacity', value: `${getYearWeekCount()} weeks` },
            ]}
            onOpen={() => navigate(buildVisionStageHref('quarter', { yearId: vision.id }))}
            onEdit={() => openEditor(vision)}
            onDelete={() => deleteHierarchyItem(vision)}
            isAdmin={isAdmin}
            isEditing={editingId === vision.id}
            draft={draftById[vision.id]}
            onDraftChange={(updates) => setDraft(vision, updates)}
            onSave={() => saveNode(vision)}
            onCancel={closeEditor}
            titlePlaceholder="Define the yearly strategic vision"
            detailsPlaceholder="Add notes, metrics, or execution detail"
            isProgressLoading={progressLoading}
            menuOpen={openCardMenuId === vision.id}
            onMenuToggle={() => setOpenCardMenuId((current) => (current === vision.id ? '' : vision.id))}
            onMenuClose={() => setOpenCardMenuId('')}
            isCurrentPeriod={isCurrentPlanningYear}
            currentLabel="Current year"
          />
      ))}
    </div>
  ) : (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-brand-red">
        <Target size={24} />
      </div>
      <h3 className="mt-4 text-xl font-semibold text-slate-900">No yearly visions yet</h3>
      <p className="mt-2 text-sm text-slate-500">Create a yearly vision first, then drill into quarters, months, weeks, and daily execution.</p>
    </div>
  );

export const VisionQuarterStageGrid = ({
  selectedYear,
  hierarchyProgressById,
  progressLoading,
  isAdmin,
  editingId,
  draftById,
  openCardMenuId,
  isCurrentPlanningYear,
  currentQuarterTimeline,
  navigate,
  openEditor,
  deleteHierarchyItem,
  setDraft,
  saveNode,
  closeEditor,
  setOpenCardMenuId,
}) =>
  selectedYear ? (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {selectedYear.quarters.map((quarter) => (
          <VisionHierarchyCard
            key={quarter.id}
            item={quarter}
            stageKey="quarter"
            stageLabel="Quarterly"
            badge={quarter.timeline}
            title={quarter.text || `${quarter.timeline} outcome`}
            details={quarter.details}
            progress={hierarchyProgressById.quarterMap.get(String(quarter.id || '').trim()) ?? quarter.progress}
            footerLabel="Open quarter"
            linkTo={buildVisionStageHref('month', { yearId: selectedYear.id, quarterId: quarter.id })}
            dateRange={getQuarterlyDateRange(quarter.timeline)}
            infoRows={[
              { label: 'Monthly depth', value: '3 months' },
              { label: 'Weekly capacity', value: `${getQuarterWeekCount(quarter.timeline)} weeks` },
              { label: 'Daily runway', value: `${getQuarterDayCount(quarter.timeline)} days` },
            ]}
            onOpen={() =>
              navigate(
                buildVisionStageHref('month', {
                  yearId: selectedYear.id,
                  quarterId: quarter.id,
                }),
              )
            }
            onEdit={() => openEditor(quarter)}
            onDelete={() => deleteHierarchyItem(quarter)}
            isAdmin={isAdmin}
            isEditing={editingId === quarter.id}
            draft={draftById[quarter.id]}
            onDraftChange={(updates) => setDraft(quarter, updates)}
            onSave={() => saveNode(quarter)}
            onCancel={closeEditor}
            titlePlaceholder={`Define the outcome for ${quarter.timeline}`}
            detailsPlaceholder="Add notes, metrics, or execution detail"
            isProgressLoading={progressLoading}
            menuOpen={openCardMenuId === quarter.id}
            onMenuToggle={() => setOpenCardMenuId((current) => (current === quarter.id ? '' : quarter.id))}
            onMenuClose={() => setOpenCardMenuId('')}
            isCurrentPeriod={isCurrentPlanningYear && quarter.timeline === currentQuarterTimeline}
            currentLabel="Current quarter"
          />
      ))}
    </div>
  ) : (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center shadow-sm text-slate-500">
      Choose a yearly vision first to open its quarterly cards.
    </div>
  );

export const VisionMonthStageGrid = ({
  selectedYear,
  selectedQuarter,
  hierarchyProgressById,
  progressLoading,
  isAdmin,
  editingId,
  draftById,
  openCardMenuId,
  isCurrentPlanningYear,
  currentQuarterTimeline,
  currentMonthTimeline,
  navigate,
  openEditor,
  deleteHierarchyItem,
  setDraft,
  saveNode,
  closeEditor,
  setOpenCardMenuId,
}) =>
  selectedQuarter ? (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {selectedQuarter.months.map((month) => (
          <VisionHierarchyCard
            key={month.id}
            item={month}
            stageKey="month"
            stageLabel="Monthly"
            badge={`Month ${month.calendarMonthNumber || getCalendarMonthNumber(month.timeline, selectedQuarter.timeline)}`}
            title={month.text || `Month ${month.calendarMonthNumber || getCalendarMonthNumber(month.timeline, selectedQuarter.timeline)} milestone`}
            details={month.details}
            progress={hierarchyProgressById.monthMap.get(String(month.id || '').trim()) ?? month.progress}
            footerLabel="Open month"
            linkTo={buildVisionStageHref('week', {
              yearId: selectedYear?.id,
              quarterId: selectedQuarter.id,
              monthId: month.id,
            })}
            dateRange={getMonthlyDate(month.timeline, selectedQuarter.timeline)}
            infoRows={[
              { label: 'Weekly capacity', value: `${getWeeksInMonth(month.timeline, selectedQuarter.timeline)} weeks` },
              { label: 'Daily actions', value: `${getDaysInMonth(month.timeline, selectedQuarter.timeline)} days` },
              { label: 'Quarter context', value: selectedQuarter.timeline || 'Quarter' },
            ]}
            onOpen={() =>
              navigate(
                buildVisionStageHref('week', {
                  yearId: selectedYear?.id,
                  quarterId: selectedQuarter.id,
                  monthId: month.id,
                }),
              )
            }
            onEdit={() => openEditor(month)}
            onDelete={() => deleteHierarchyItem(month)}
            isAdmin={isAdmin}
            isEditing={editingId === month.id}
            draft={draftById[month.id]}
            onDraftChange={(updates) => setDraft(month, updates)}
            onSave={() => saveNode(month)}
            onCancel={closeEditor}
            titlePlaceholder="Define the monthly milestone"
            detailsPlaceholder="Add notes, metrics, or execution detail"
            isProgressLoading={progressLoading}
            menuOpen={openCardMenuId === month.id}
            onMenuToggle={() => setOpenCardMenuId((current) => (current === month.id ? '' : month.id))}
            onMenuClose={() => setOpenCardMenuId('')}
            isCurrentPeriod={
              isCurrentPlanningYear &&
              selectedQuarter?.timeline === currentQuarterTimeline &&
              month.timeline === currentMonthTimeline
            }
            currentLabel="Current month"
          />
      ))}
    </div>
  ) : (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center shadow-sm text-slate-500">
      Choose a quarter first to open its monthly cards.
    </div>
  );

export const VisionWeekStageGrid = ({
  selectedYear,
  selectedQuarter,
  selectedMonth,
  selectedMonthDisplayLabel,
  weekCardProgressById,
  progressLoading,
  isAdmin,
  editingId,
  draftById,
  openCardMenuId,
  isCurrentPlanningYear,
  currentQuarterTimeline,
  currentMonthTimeline,
  currentWeekSlotIndex,
  navigate,
  openEditor,
  deleteHierarchyItem,
  setDraft,
  saveNode,
  closeEditor,
  setOpenCardMenuId,
}) =>
  selectedMonth ? (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {selectedMonth.weeks.map((week) => (
          <VisionHierarchyCard
            key={week.id}
            item={week}
            stageKey="week"
            stageLabel="Weekly"
            badge={`Week ${week.yearWeekNumber || week.slotIndex}`}
            title={week.text || `Week ${week.yearWeekNumber || week.slotIndex} commitment`}
            details={week.details}
            progress={weekCardProgressById.get(String(week.id || '').trim()) ?? week.progress}
            footerLabel="Open week"
            linkTo={buildVisionStageHref('day', {
              yearId: selectedYear?.id,
              quarterId: selectedQuarter?.id,
              monthId: selectedMonth.id,
              weekId: week.id,
              weekSlot: week.slotIndex,
            })}
            dateRange={getWeeklyDateRange(week.slotIndex, selectedMonth.timeline, selectedQuarter.timeline)}
            infoRows={[
              { label: 'Daily actions', value: `${week.days.length} days` },
              { label: 'Month context', value: selectedMonthDisplayLabel },
              { label: 'Quarter context', value: selectedQuarter?.timeline || 'Quarter' },
            ]}
            onOpen={() =>
              navigate(
                buildVisionStageHref('day', {
                  yearId: selectedYear?.id,
                  quarterId: selectedQuarter?.id,
                  monthId: selectedMonth.id,
                  weekId: week.id,
                  weekSlot: week.slotIndex,
                }),
              )
            }
            onEdit={() => openEditor(week)}
            onDelete={() => deleteHierarchyItem(week)}
            isAdmin={isAdmin}
            isEditing={editingId === week.id}
            draft={draftById[week.id]}
            onDraftChange={(updates) => setDraft(week, updates)}
            onSave={() => saveNode(week)}
            onCancel={closeEditor}
            titlePlaceholder="Define the weekly task or commitment"
            detailsPlaceholder="Add notes, metrics, or execution detail"
            isProgressLoading={progressLoading}
            menuOpen={openCardMenuId === week.id}
            onMenuToggle={() => setOpenCardMenuId((current) => (current === week.id ? '' : week.id))}
            onMenuClose={() => setOpenCardMenuId('')}
            isCurrentPeriod={
              isCurrentPlanningYear &&
              selectedQuarter?.timeline === currentQuarterTimeline &&
              selectedMonth?.timeline === currentMonthTimeline &&
              week.slotIndex === currentWeekSlotIndex
            }
            currentLabel="This week"
          />
      ))}
    </div>
  ) : (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center shadow-sm text-slate-500">
      Choose a month first to open its weekly cards.
    </div>
  );
