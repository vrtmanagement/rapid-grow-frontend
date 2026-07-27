import React from 'react';
import { Plus, Sparkles, Sun } from 'lucide-react';
import PageSectionSubnav from '../components/layout/PageSectionSubnav';
import VisionHeaderTabs from '../components/planning/VisionHeaderTabs';
import { SmallActionButton } from '../components/vision/VisionPrimitives';
import VisionLoadingSkeleton from '../components/vision/VisionLoadingSkeleton';
import {
  VisionMonthStageGrid,
  VisionQuarterStageGrid,
  VisionWeekStageGrid,
  VisionYearStageGrid,
} from '../components/vision/VisionStageGrids';
import VisionDayStagePanel from '../components/vision/VisionDayStagePanel';
import { VISION_PROGRESS_SHIMMER_STYLE } from '../components/vision/visionPlanningHelpers';
import { useVisionPlanningState } from '../components/vision/useVisionPlanningState';
import { useVisionGoalActions } from '../components/vision/useVisionGoalActions';
import { useVisionTaskActions } from '../components/vision/useVisionTaskActions';

const Vision = ({ state, updateState, loading = false }) => {
  const ctx = useVisionPlanningState({ state, updateState, loading });
  const goalActions = useVisionGoalActions(ctx, { state, updateState });
  const taskActions = useVisionTaskActions(ctx, goalActions, { state, updateState });

  const {
    stage,
    isAdmin,
    draftById,
    editingId,
    openCardMenuId,
    setOpenCardMenuId,
    showVisionComposer,
    setShowVisionComposer,
    newVisionTitle,
    setNewVisionTitle,
    newVisionDetails,
    setNewVisionDetails,
    progressLoading,
    visions,
    selectedYear,
    selectedQuarter,
    selectedMonth,
    selectedWeek,
    activeDayId,
    setActiveDayId,
    me,
    today,
    isCurrentPlanningYear,
    currentQuarterTimeline,
    currentMonthTimeline,
    currentWeekSlotIndex,
    selectedMonthDisplayLabel,
    assignableEmployees,
    taskAssigneeOptions,
    taskPriorityOptions,
    taskStatusOptions,
    isDailyStage,
    heroBadgeLabel,
    heroStatLabel,
    heroStatValue,
    navigate,
    taskError,
    setTaskError,
    showTaskComposer,
    setShowTaskComposer,
    setTaskDraftByDay,
    taskDocumentByDay,
    setTaskDocumentByDay,
    editingTaskId,
    setEditingTaskId,
    openTaskMenuId,
    setOpenTaskMenuId,
    setViewingTaskId,
    savingTaskDayId,
    uploadingTaskDocument,
    deletingTaskId,
  } = ctx;

  const { setDraft, openEditor, closeEditor, saveNode, addVision, deleteHierarchyItem } = goalActions;

  const {
    selectedDayIndex,
    selectedDay,
    selectedDayTasks,
    weekCardProgressById,
    hierarchyProgressById,
    weekProgress,
    updateSelectedDayTaskDraft,
    closeTaskComposer,
    selectedTaskDraft,
    selectedTaskDocument,
    editingTask,
    viewingTask,
    editingTaskDocumentUrl,
    editingTaskDocumentName,
    createTaskForSelectedDay,
    updateTaskStatus,
    deleteTaskFromDay,
    openTaskEditor,
    openTaskViewer,
  } = taskActions;

  if (loading) {
    return <VisionLoadingSkeleton />;
  }

  return (
    <>
      <PageSectionSubnav
        leading={
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[1.1rem] shadow-[0_8px_16px_rgba(239,68,68,0.10)] ring-1 ${
                isDailyStage
                  ? 'bg-slate-900 text-brand-red ring-slate-900/10'
                  : 'bg-gradient-to-br from-red-50 via-white to-red-100 text-brand-red ring-red-100'
              }`}
            >
              {isDailyStage ? <Sun size={16} /> : <Sparkles size={16} />}
            </div>
            <div className="inline-flex items-center rounded-full border border-red-100 bg-red-50 px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.22em] text-brand-red">
              {heroBadgeLabel}
            </div>
          </div>
        }
        center={<VisionHeaderTabs />}
        trailing={
          <>
            {stage === 'year' && isAdmin ? (
              <SmallActionButton variant="primary" onClick={() => setShowVisionComposer((prev) => !prev)} disabled={state.yearlyGoals.length >= 5}>
                <Plus size={14} />
                Add Vision
              </SmallActionButton>
            ) : null}
            <div className="relative min-w-[118px] overflow-hidden rounded-[0.9rem] border border-slate-200/90 bg-white px-3 py-1.5 shadow-[0_8px_18px_rgba(15,23,42,0.05)]">
              <div className="absolute bottom-2 left-0 top-2 w-[2px] rounded-full bg-gradient-to-b from-brand-red via-rose-300 to-transparent" />
              {isDailyStage ? (
                <div className="flex items-center justify-between gap-3 pl-2">
                  <div>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">Week completion</div>
                    <div className="mt-0.5 text-lg font-semibold leading-none text-slate-900">{weekProgress.percent}%</div>
                  </div>
                  <div className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {selectedWeek.days.length} days
                  </div>
                </div>
              ) : (
                <div className="flex items-baseline gap-2 pl-2 whitespace-nowrap">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400">{heroStatLabel}</div>
                  <div className="text-lg font-semibold leading-none text-slate-900">{heroStatValue}</div>
                </div>
              )}
            </div>
          </>
        }
        outerClassName="mb-4"
        innerClassName="gap-2 py-1 lg:min-h-[44px]"
        centerClassName="lg:px-2"
      />
      <div className="mx-auto max-w-7xl space-y-6 pb-16">
        <style>{VISION_PROGRESS_SHIMMER_STYLE}</style>
        {showVisionComposer && isAdmin ? (
          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="flex-1">
                <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">New yearly vision</label>
                <textarea
                  value={newVisionTitle}
                  onChange={(event) => setNewVisionTitle(event.target.value)}
                  rows={2}
                  placeholder="Example: Achieve category leadership in AI operations"
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-brand-red/30"
                />
                <textarea
                  value={newVisionDetails}
                  onChange={(event) => setNewVisionDetails(event.target.value)}
                  rows={2}
                  placeholder="Add a short strategic explanation or outcome note"
                  className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 outline-none transition focus:border-brand-red/30"
                />
              </div>
              <div className="flex gap-2">
                <SmallActionButton variant="primary" onClick={addVision} disabled={!newVisionTitle.trim() || state.yearlyGoals.length >= 5}>
                  Save Vision
                </SmallActionButton>
                <SmallActionButton
                  onClick={() => {
                    setShowVisionComposer(false);
                    setNewVisionTitle('');
                    setNewVisionDetails('');
                  }}
                >
                  Cancel
                </SmallActionButton>
              </div>
            </div>
          </div>
        ) : null}

      {stage === 'year' ? (
        <VisionYearStageGrid
          visions={visions}
          hierarchyProgressById={hierarchyProgressById}
          progressLoading={progressLoading}
          isAdmin={isAdmin}
          editingId={editingId}
          draftById={draftById}
          openCardMenuId={openCardMenuId}
          isCurrentPlanningYear={isCurrentPlanningYear}
          navigate={navigate}
          openEditor={openEditor}
          deleteHierarchyItem={deleteHierarchyItem}
          setDraft={setDraft}
          saveNode={saveNode}
          closeEditor={closeEditor}
          setOpenCardMenuId={setOpenCardMenuId}
        />
      ) : null}

      {stage === 'quarter' ? (
        <VisionQuarterStageGrid
          selectedYear={selectedYear}
          hierarchyProgressById={hierarchyProgressById}
          progressLoading={progressLoading}
          isAdmin={isAdmin}
          editingId={editingId}
          draftById={draftById}
          openCardMenuId={openCardMenuId}
          isCurrentPlanningYear={isCurrentPlanningYear}
          currentQuarterTimeline={currentQuarterTimeline}
          navigate={navigate}
          openEditor={openEditor}
          deleteHierarchyItem={deleteHierarchyItem}
          setDraft={setDraft}
          saveNode={saveNode}
          closeEditor={closeEditor}
          setOpenCardMenuId={setOpenCardMenuId}
        />
      ) : null}

      {stage === 'month' ? (
        <VisionMonthStageGrid
          selectedYear={selectedYear}
          selectedQuarter={selectedQuarter}
          hierarchyProgressById={hierarchyProgressById}
          progressLoading={progressLoading}
          isAdmin={isAdmin}
          editingId={editingId}
          draftById={draftById}
          openCardMenuId={openCardMenuId}
          isCurrentPlanningYear={isCurrentPlanningYear}
          currentQuarterTimeline={currentQuarterTimeline}
          currentMonthTimeline={currentMonthTimeline}
          navigate={navigate}
          openEditor={openEditor}
          deleteHierarchyItem={deleteHierarchyItem}
          setDraft={setDraft}
          saveNode={saveNode}
          closeEditor={closeEditor}
          setOpenCardMenuId={setOpenCardMenuId}
        />
      ) : null}

      {stage === 'week' ? (
        <VisionWeekStageGrid
          selectedYear={selectedYear}
          selectedQuarter={selectedQuarter}
          selectedMonth={selectedMonth}
          selectedMonthDisplayLabel={selectedMonthDisplayLabel}
          weekCardProgressById={weekCardProgressById}
          progressLoading={progressLoading}
          isAdmin={isAdmin}
          editingId={editingId}
          draftById={draftById}
          openCardMenuId={openCardMenuId}
          isCurrentPlanningYear={isCurrentPlanningYear}
          currentQuarterTimeline={currentQuarterTimeline}
          currentMonthTimeline={currentMonthTimeline}
          currentWeekSlotIndex={currentWeekSlotIndex}
          navigate={navigate}
          openEditor={openEditor}
          deleteHierarchyItem={deleteHierarchyItem}
          setDraft={setDraft}
          saveNode={saveNode}
          closeEditor={closeEditor}
          setOpenCardMenuId={setOpenCardMenuId}
        />
      ) : null}

      {stage === 'day' ? (
        <VisionDayStagePanel
          selectedWeek={selectedWeek}
          selectedMonth={selectedMonth}
          selectedQuarter={selectedQuarter}
          selectedYear={selectedYear}
          selectedDay={selectedDay}
          selectedDayIndex={selectedDayIndex}
          activeDayId={activeDayId}
          setActiveDayId={setActiveDayId}
          today={today}
          me={me}
          isAdmin={isAdmin}
          taskError={taskError}
          selectedDayTasks={selectedDayTasks}
          assignableEmployees={assignableEmployees}
          updateTaskStatus={updateTaskStatus}
          openTaskMenuId={openTaskMenuId}
          setOpenTaskMenuId={setOpenTaskMenuId}
          openTaskEditor={openTaskEditor}
          deleteTaskFromDay={deleteTaskFromDay}
          deletingTaskId={deletingTaskId}
          openTaskViewer={openTaskViewer}
          showTaskComposer={showTaskComposer}
          setShowTaskComposer={setShowTaskComposer}
          setTaskDraftByDay={setTaskDraftByDay}
          setEditingTaskId={setEditingTaskId}
          setTaskError={setTaskError}
          editingTask={editingTask}
          closeTaskComposer={closeTaskComposer}
          selectedTaskDraft={selectedTaskDraft}
          updateSelectedDayTaskDraft={updateSelectedDayTaskDraft}
          taskAssigneeOptions={taskAssigneeOptions}
          taskPriorityOptions={taskPriorityOptions}
          taskStatusOptions={taskStatusOptions}
          setTaskDocumentByDay={setTaskDocumentByDay}
          selectedTaskDocument={selectedTaskDocument}
          editingTaskDocumentUrl={editingTaskDocumentUrl}
          editingTaskDocumentName={editingTaskDocumentName}
          savingTaskDayId={savingTaskDayId}
          uploadingTaskDocument={uploadingTaskDocument}
          createTaskForSelectedDay={createTaskForSelectedDay}
          viewingTask={viewingTask}
          setViewingTaskId={setViewingTaskId}
        />
      ) : null}
      </div>
    </>
  );
};

export default Vision;
