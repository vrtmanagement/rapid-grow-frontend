import React from 'react';
import type { SpacesViewController } from '../../hooks/spaces/useSpacesViewController';
import SpacesTaskConfirmModals from './SpacesTaskConfirmModals';
import SpacesTaskEditDrawer from './SpacesTaskEditDrawer';

type SpacesTaskModalsProps = Pick<
  SpacesViewController,
  | 'activeCommentTask'
  | 'setCommentTaskId'
  | 'setCommentDraft'
  | 'commentDraft'
  | 'me'
  | 'editingCommentId'
  | 'setEditingCommentId'
  | 'editCommentDraft'
  | 'setEditCommentDraft'
  | 'API_BASE'
  | 'getAuthHeaders'
  | 'setTasks'
  | 'setError'
  | 'mode'
  | 'modalStatus'
  | 'setModalStatus'
  | 'handleAddComment'
  | 'submittingComment'
  | 'columnToDelete'
  | 'setColumnToDelete'
  | 'setColumns'
  | 'sortedTasks'
  | 'commentToDeleteId'
  | 'setCommentToDeleteId'
  | 'deleteTaskModal'
  | 'setDeleteTaskModal'
  | 'bulkDeleteTaskModalOpen'
  | 'setBulkDeleteTaskModalOpen'
  | 'selectedTaskCount'
  | 'bulkSaving'
  | 'deleteSelectedTasks'
  | 'rejectTaskModal'
  | 'setRejectTaskModal'
  | 'rejectFeedbackDraft'
  | 'setRejectFeedbackDraft'
  | 'rejectingTask'
  | 'confirmRejectTask'
  | 'editingTask'
  | 'editingTaskMode'
  | 'editingTaskDraft'
  | 'setEditingTaskDraft'
  | 'assignableEmployees'
  | 'forceDownloadDocument'
  | 'patchTask'
  | 'deleteTask'
  | 'setEditingTask'
  | 'projectSelectOptions'
  | 'projectsLoading'
  | 'priorityOptions'
  | 'statusOptions'
  | 'weeklyTaskGroups'
  | 'getDayDisplay'
>;

const SpacesTaskModals: React.FC<SpacesTaskModalsProps> = (props) => {
  return (
    <>
      <SpacesTaskConfirmModals
        activeCommentTask={props.activeCommentTask}
        setCommentTaskId={props.setCommentTaskId}
        setCommentDraft={props.setCommentDraft}
        commentDraft={props.commentDraft}
        me={props.me}
        editingCommentId={props.editingCommentId}
        setEditingCommentId={props.setEditingCommentId}
        editCommentDraft={props.editCommentDraft}
        setEditCommentDraft={props.setEditCommentDraft}
        API_BASE={props.API_BASE}
        getAuthHeaders={props.getAuthHeaders}
        setTasks={props.setTasks}
        setError={props.setError}
        mode={props.mode}
        modalStatus={props.modalStatus}
        setModalStatus={props.setModalStatus}
        handleAddComment={props.handleAddComment}
        submittingComment={props.submittingComment}
        columnToDelete={props.columnToDelete}
        setColumnToDelete={props.setColumnToDelete}
        setColumns={props.setColumns}
        sortedTasks={props.sortedTasks}
        commentToDeleteId={props.commentToDeleteId}
        setCommentToDeleteId={props.setCommentToDeleteId}
        deleteTaskModal={props.deleteTaskModal}
        setDeleteTaskModal={props.setDeleteTaskModal}
        bulkDeleteTaskModalOpen={props.bulkDeleteTaskModalOpen}
        setBulkDeleteTaskModalOpen={props.setBulkDeleteTaskModalOpen}
        selectedTaskCount={props.selectedTaskCount}
        bulkSaving={props.bulkSaving}
        deleteSelectedTasks={props.deleteSelectedTasks}
        rejectTaskModal={props.rejectTaskModal}
        setRejectTaskModal={props.setRejectTaskModal}
        rejectFeedbackDraft={props.rejectFeedbackDraft}
        setRejectFeedbackDraft={props.setRejectFeedbackDraft}
        rejectingTask={props.rejectingTask}
        confirmRejectTask={props.confirmRejectTask}
        deleteTask={props.deleteTask}
      />
      <SpacesTaskEditDrawer
        me={props.me}
        API_BASE={props.API_BASE}
        setError={props.setError}
        mode={props.mode}
        editingTask={props.editingTask}
        editingTaskMode={props.editingTaskMode}
        editingTaskDraft={props.editingTaskDraft}
        setEditingTaskDraft={props.setEditingTaskDraft}
        assignableEmployees={props.assignableEmployees}
        forceDownloadDocument={props.forceDownloadDocument}
        patchTask={props.patchTask}
        setEditingTask={props.setEditingTask}
        projectSelectOptions={props.projectSelectOptions}
        projectsLoading={props.projectsLoading}
        priorityOptions={props.priorityOptions}
        statusOptions={props.statusOptions}
        weeklyTaskGroups={props.weeklyTaskGroups}
        getDayDisplay={props.getDayDisplay}
      />
    </>
  );
};

export default SpacesTaskModals;
