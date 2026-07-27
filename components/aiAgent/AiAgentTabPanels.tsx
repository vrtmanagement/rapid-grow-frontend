import React from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  DollarSign,
  ExternalLink,
  FileUp,
  Loader2,
  Sparkles,
  Users,
} from 'lucide-react';
import type { ExtractedTask } from '../../services/aiAgentApi';

type AiAgentTabPanelsProps = {
  ctx: Record<string, any>;
};

const AiAgentTabPanels: React.FC<AiAgentTabPanelsProps> = ({ ctx }) => {
  const {
    activeTab,
    setActiveTab,
    meetingText,
    setMeetingText,
    file,
    setFile,
    tasks,
    assignments,
    setAssignments,
    employees,
    projects,
    selectedProjectId,
    setSelectedProjectId,
    taskHubCount,
    selectedEmpId,
    setSelectedEmpId,
    performance,
    summary,
    followUps,
    followUpEmailStatus,
    selectedFollowUpIds,
    setSelectedFollowUpIds,
    requireApproval,
    setRequireApproval,
    pendingApprovals,
    selectedApprovalIds,
    setSelectedApprovalIds,
    capacity,
    projectPlan,
    hourlyRate,
    setHourlyRate,
    estimateCurrency,
    setEstimateCurrency,
    loading,
    runExtract,
    runAssign,
    runApproveSelected,
    runRejectSelected,
    loadCapacity,
    runProjectPlan,
    loadSummary,
    loadFollowUps,
    sendOneFollowUpEmail,
    sendSelectedFollowUpEmails,
    loadPerformance,
    runOneClickWorkflow,
    runWeeklyStandupEmail,
    loadPendingApprovals,
    updateTask,
  } = ctx;

  return (
    <>
{activeTab === 'extract' && (
  <>
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <label className="block text-sm font-medium text-slate-800">Link to project (optional)</label>
      <select
        value={selectedProjectId}
        onChange={(e) => setSelectedProjectId(e.target.value)}
        className="mb-4 w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm"
      >
        <option value="">No project — TaskHub only</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      <label className="block text-sm font-medium text-slate-800">Notes or project document text</label>
      <textarea
        value={meetingText}
        onChange={(e) => setMeetingText(e.target.value)}
        rows={6}
        placeholder="Paste a project brief, SOW, requirements doc, meeting notes, or action items..."
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
      />
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={requireApproval}
          onChange={(e) => setRequireApproval(e.target.checked)}
          className="rounded border-slate-300"
        />
        Require manager approval before TaskHub sync
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-wrap">
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold"
        />
        <button
          type="button"
          onClick={runOneClickWorkflow}
          disabled={!!loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading === 'workflow' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          Extract → Assign → Notify
        </button>
        <button
          type="button"
          onClick={runExtract}
          disabled={!!loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60"
        >
          {loading === 'extract' ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          Extract only
        </button>
        <button
          type="button"
          onClick={runAssign}
          disabled={!!loading || !tasks.length}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60"
        >
          {loading === 'assign' ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
          Assign to team
        </button>
        <button
          type="button"
          onClick={loadCapacity}
          disabled={!!loading}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60"
        >
          Check capacity
        </button>
        <label className="text-xs text-slate-600">
          Rate/hr
          <input
            type="number"
            min={1}
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            className="mt-1 block w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-slate-600">
          Currency
          <input
            type="text"
            maxLength={6}
            value={estimateCurrency}
            onChange={(e) => setEstimateCurrency(e.target.value.toUpperCase())}
            className="mt-1 block w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={runProjectPlan}
          disabled={!!loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-red/30 bg-brand-red/5 px-4 py-2 text-sm font-semibold text-brand-red disabled:opacity-60"
        >
          {loading === 'project' ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
          Document → plan & estimate
        </button>
      </div>
    </div>

    {tasks.length > 0 && (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-x-auto">
        <h2 className="text-lg font-semibold text-slate-900">Extracted tasks ({tasks.length})</h2>
        <table className="mt-4 w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-slate-500">
              <th className="py-2 pr-3">Title</th>
              <th className="py-2 pr-3">Priority</th>
              <th className="py-2 pr-3">Deadline</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, index) => (
              <tr key={`task-${index}`} className="border-b border-slate-50">
                <td className="py-2 pr-3">
                  <input
                    value={task.title}
                    onChange={(e) => updateTask(index, { title: e.target.value })}
                    className="w-full rounded border border-slate-200 px-2 py-1"
                  />
                </td>
                <td className="py-2 pr-3">
                  <select
                    value={task.priority}
                    onChange={(e) =>
                      updateTask(index, { priority: e.target.value as ExtractedTask['priority'] })
                    }
                    className="rounded border border-slate-200 px-2 py-1"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </td>
                <td className="py-2 pr-3">
                  <input
                    value={task.deadline}
                    onChange={(e) => updateTask(index, { deadline: e.target.value })}
                    placeholder="YYYY-MM-DD"
                    className="w-full rounded border border-slate-200 px-2 py-1"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    {taskHubCount > 0 && (
      <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-700">
          {taskHubCount} task(s) are now in TaskHub
          {selectedProjectId ? ' and linked to the selected project charter' : ''}.
          Progress and performance update automatically when statuses change.
        </p>
        <Link
          to="/spaces"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white"
        >
          Open TaskHub
          <ExternalLink size={14} />
        </Link>
      </div>
    )}

    {assignments.length > 0 && (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Assignments</h2>
        <ul className="mt-3 space-y-3">
          {assignments.map((row, index) => {
            const sourceTask = tasks.find((task) => task.title === row.taskTitle);
            const skills =
              row.matchedSkills?.length
                ? row.matchedSkills
                : sourceTask?.skillsNeeded || [];
            return (
            <li key={`assign-${index}`} className="rounded-lg border border-emerald-100 bg-white p-3 text-sm">
              <p className="font-medium text-slate-900">{row.taskTitle}</p>
              <p className="text-slate-600">
                → {row.assignedTo}
                {row.employeeId ? ` (${row.employeeId})` : ''}
              </p>
              {skills.length > 0 && (
                <p className="mt-1 text-xs text-emerald-800">
                  Matched skills: {skills.join(', ')}
                </p>
              )}
              {(row.workloadHours != null || row.capacityHours != null) && (
                <p className="mt-1 text-xs text-slate-500">
                  Workload: {row.workloadHours ?? '—'}h / {row.capacityHours ?? 40}h capacity
                </p>
              )}
              <p className="mt-1 text-slate-500">{row.reason}</p>
            </li>
            );
          })}
        </ul>
      </div>
    )}
  </>
)}

{activeTab === 'approval' && (
  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={loadPendingApprovals}
        disabled={!!loading}
        className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800"
      >
        Refresh pending
      </button>
      <button
        type="button"
        onClick={runApproveSelected}
        disabled={!!loading || !selectedApprovalIds.length}
        className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        Approve selected
      </button>
      <button
        type="button"
        onClick={runRejectSelected}
        disabled={!!loading || !selectedApprovalIds.length}
        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60"
      >
        Reject selected
      </button>
    </div>
    <ul className="space-y-3">
      {pendingApprovals.map((task) => (
        <li key={task.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={selectedApprovalIds.includes(task.id)}
              onChange={(e) => {
                setSelectedApprovalIds((prev) =>
                  e.target.checked ? [...prev, task.id] : prev.filter((id) => id !== task.id),
                );
              }}
            />
            <span>
              <span className="font-medium text-slate-900">{task.title}</span>
              <span className="block text-slate-600">
                → {task.assignedTo} ({task.assigneeEmpId})
              </span>
              <span className="block text-slate-500">{task.assignmentReason}</span>
            </span>
          </label>
        </li>
      ))}
    </ul>
    {!pendingApprovals.length && (
      <p className="text-sm text-slate-500">No tasks pending approval.</p>
    )}
  </div>
)}

{activeTab === 'capacity' && (
  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-700 space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Capacity planning</h2>
        <p className="mt-1 text-slate-600">Check total team availability before publishing new assignments.</p>
      </div>
      <button
        type="button"
        onClick={loadCapacity}
        disabled={!!loading}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading === 'capacity' ? <Loader2 size={16} className="animate-spin" /> : null}
        Refresh capacity
      </button>
    </div>
    {capacity ? (
      <div className="space-y-2">
        <p>
          Utilization: {String(capacity.utilizationPct)}% / Can absorb:{' '}
          {capacity.canAbsorb ? 'Yes' : 'No'}
        </p>
        <p>
          Available hours: {String(capacity.availableHours)} / {String(capacity.totalCapacityHours)}
        </p>
        {Array.isArray(capacity.recommendations) && (
          <ul className="list-disc pl-5">
            {(capacity.recommendations as string[]).map((line, i) => (
              <li key={`cap-${i}`}>{line}</li>
            ))}
          </ul>
        )}
      </div>
    ) : (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-slate-600">
        No capacity snapshot loaded yet. Click Refresh capacity to load current team workload.
      </div>
    )}
  </div>
)}

{activeTab === 'project' && (
  <div className="space-y-4">
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Project plan from document</h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload a project document or paste scope text. AI returns a delivery plan with estimated days,
          team size, and price.
        </p>
      </div>
      <label className="block text-sm font-medium text-slate-800">Project document / scope</label>
      <textarea
        value={meetingText}
        onChange={(e) => setMeetingText(e.target.value)}
        rows={6}
        placeholder="Paste requirements, SOW, proposal, or project brief..."
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full max-w-md text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold"
        />
        <label className="text-xs text-slate-600">
          Rate/hr
          <input
            type="number"
            min={1}
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            className="mt-1 block w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-slate-600">
          Currency
          <input
            type="text"
            maxLength={6}
            value={estimateCurrency}
            onChange={(e) => setEstimateCurrency(e.target.value.toUpperCase())}
            className="mt-1 block w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={runProjectPlan}
          disabled={!!loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading === 'project' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          Generate plan & estimate
        </button>
      </div>
      {file && (
        <p className="text-xs text-slate-500">
          File selected: <span className="font-medium text-slate-700">{file.name}</span>
        </p>
      )}
    </div>

    {!projectPlan && (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        No plan yet. Add text or upload a PDF/DOC above, then click{' '}
        <strong>Generate plan & estimate</strong>.
      </div>
    )}
    {projectPlan && (
      <>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{projectPlan.projectName}</h2>
            <p className="mt-2 text-sm text-slate-600">{projectPlan.description}</p>
          </div>
          {projectPlan.estimate && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <CalendarDays size={18} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Duration</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {projectPlan.estimate.estimatedDays}
                  <span className="ml-1 text-sm font-medium text-slate-500">working days</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {projectPlan.estimate.totalHours} total hours
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Users size={18} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Team</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {projectPlan.estimate.peopleNeeded}
                  <span className="ml-1 text-sm font-medium text-slate-500">people</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">Recommended team size</p>
              </div>
              <div className="rounded-xl border border-brand-red/20 bg-brand-red/5 p-4">
                <div className="flex items-center gap-2 text-brand-red">
                  <DollarSign size={18} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Price</span>
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {projectPlan.estimate.currency}{' '}
                  {projectPlan.estimate.totalPrice.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  @ {projectPlan.estimate.hourlyRate} {projectPlan.estimate.currency}/hr
                  {projectPlan.estimate.priceBreakdown
                    ? ` · ${projectPlan.estimate.priceBreakdown}`
                    : ''}
                </p>
              </div>
            </div>
          )}
          {projectPlan.estimate?.assumptions && projectPlan.estimate.assumptions.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-800">Assumptions</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-600">
                {projectPlan.estimate.assumptions.map((line, i) => (
                  <li key={`assume-${i}`}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          {projectPlan.estimate?.risks && projectPlan.estimate.risks.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-amber-800">Risks</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-600">
                {projectPlan.estimate.risks.map((line, i) => (
                  <li key={`risk-est-${i}`}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {projectPlan.milestones && projectPlan.milestones.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Milestones ({projectPlan.milestones.length})
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {projectPlan.milestones.map((milestone, i) => (
                <li
                  key={`ms-${i}`}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <span className="font-semibold text-slate-900">{milestone.name}</span>
                  {milestone.dueDate && (
                    <span className="ml-2 text-slate-500">· {milestone.dueDate}</span>
                  )}
                  {milestone.description && (
                    <p className="mt-1 text-slate-600">{milestone.description}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Tasks ({projectPlan.tasks?.length ?? 0})
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Loaded into the extract table — use Assign to team to sync to TaskHub.
          </p>
          <div className="mt-3 max-h-64 overflow-y-auto space-y-2 text-sm">
            {(projectPlan.tasks || []).map((task, i) => (
              <div
                key={`plan-task-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2"
              >
                <span className="font-medium text-slate-900">{task.title}</span>
                <span className="text-slate-500">
                  {task.priority} · {task.estimatedHours || '—'}h
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('extract')}
            className="mt-4 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white"
          >
            Go to Extract & Assign
          </button>
        </div>
      </>
    )}
  </div>
)}

{activeTab === 'summary' && (
  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
    <p className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-sm text-slate-700">
      <span className="font-semibold">Manager standup:</span> use the button below to email managers a team PDF summary.{' '}
      <span className="font-semibold">Employee performance:</span> configure automated weekly performance emails in Staff → Check-in &amp; performance email.
    </p>
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => loadSummary('daily')}
        disabled={!!loading}
        className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800"
      >
        Daily summary
      </button>
      <button
        type="button"
        onClick={() => loadSummary('weekly')}
        disabled={!!loading}
        className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        Weekly summary
      </button>
      <button
        type="button"
        onClick={runWeeklyStandupEmail}
        disabled={!!loading}
        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60"
      >
        {loading === 'standup' ? 'Sending...' : 'Email weekly PDF standup'}
      </button>
    </div>
    {summary && (
      <div className="space-y-3 text-sm text-slate-700">
        <p>
          <span className="font-semibold">Tasks:</span> {String(summary.totalTasks)} total,{' '}
          {String(summary.completedTasks)} done, {String(summary.delayedTasks)} delayed
        </p>
        <p className="whitespace-pre-wrap">{String(summary.summary || '')}</p>
        {Array.isArray(summary.risks) && summary.risks.length > 0 && (
          <div>
            <p className="font-semibold text-amber-800">Risks</p>
            <ul className="mt-1 list-disc pl-5">
              {(summary.risks as string[]).map((risk, i) => (
                <li key={`risk-${i}`}>{risk}</li>
              ))}
            </ul>
          </div>
        )}
        {Array.isArray(summary.recommendedActions) && summary.recommendedActions.length > 0 && (
          <div>
            <p className="font-semibold text-emerald-800">Recommended actions</p>
            <ul className="mt-1 list-disc pl-5">
              {(summary.recommendedActions as string[]).map((action, i) => (
                <li key={`action-${i}`}>{action}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )}
  </div>
)}

{activeTab === 'followups' && (
  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
    <p className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-sm text-slate-700">
      <span className="font-semibold">Automatic:</span> overdue follow-up emails on weekdays when ai-agent-service
      is running (default 10:00 Asia/Kolkata).{' '}
      <span className="font-semibold">Manual:</span> load list, then send per person or selected rows.
    </p>
    <button
      type="button"
      onClick={loadFollowUps}
      disabled={!!loading}
      className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60"
    >
      {loading === 'followups' ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
      Load delay follow-ups
    </button>
    <p className="text-sm text-slate-600 w-full">
      Each assignee gets their own email. Use &quot;Send email to assignee&quot; on a row, or select several and
      click Send selected.
    </p>
    <button
      type="button"
      onClick={sendSelectedFollowUpEmails}
      disabled={!!loading || !selectedFollowUpIds.length}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
    >
      {loading === 'followups-send' ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <FileUp size={16} />
      )}
      Send selected ({selectedFollowUpIds.length})
    </button>
    {followUps && (
      <p className="text-sm text-slate-600">{followUps.delayedCount ?? 0} delayed task(s)</p>
    )}
    <ul className="space-y-3">
      {(followUps?.followUps || []).map((item) => {
        const key = item.taskId || `${item.assigneeId}-${item.taskTitle}`;
        const emailStatus = followUpEmailStatus[key] || 'idle';
        const canSend = !!item.assigneeId;

        return (
          <li key={key} className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <label className="flex items-start gap-2 flex-1 min-w-[200px]">
                <input
                  type="checkbox"
                  checked={selectedFollowUpIds.includes(item.taskId)}
                  onChange={(e) => {
                    setSelectedFollowUpIds((prev) =>
                      e.target.checked
                        ? [...prev, item.taskId]
                        : prev.filter((id) => id !== item.taskId),
                    );
                  }}
                />
                <span>
                  <span className="font-medium text-slate-900">{item.taskTitle || 'Task'}</span>
                  <span className="block text-slate-600 mt-0.5">
                    Assignee: {item.assigneeName || item.assigneeId || 'Unassigned'}
                    {item.assigneeEmail ? ` · ${item.assigneeEmail}` : ''}
                    {item.delayDays ? ` · ${item.delayDays}d overdue` : ''}
                  </span>
                </span>
              </label>
              <button
                type="button"
                onClick={() => sendOneFollowUpEmail(item)}
                disabled={!canSend || emailStatus === 'sending' || !!loading}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 disabled:opacity-50 hover:bg-slate-100"
              >
                {emailStatus === 'sending'
                  ? 'Sending...'
                  : emailStatus === 'sent'
                    ? 'Email sent'
                    : emailStatus === 'failed'
                      ? 'Retry email'
                      : 'Send email to assignee'}
              </button>
            </div>
            <p className="mt-2 text-slate-600">{item.message || ''}</p>
            <p className="mt-2 text-xs uppercase tracking-wide text-brand-red">
              {item.recommendation || 'continue'}
              {item.reason ? ` · ${item.reason}` : ''}
            </p>
          </li>
        );
      })}
    </ul>
  </div>
)}

{activeTab === 'performance' && (
  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <select
        value={selectedEmpId}
        onChange={(e) => setSelectedEmpId(e.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
      >
        <option value="">Select employee</option>
        {employees.map((emp) => (
          <option key={emp.empId} value={emp.empId}>
            {emp.empName} ({emp.empId})
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={loadPerformance}
        disabled={!!loading}
        className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading === 'performance' ? 'Loading...' : 'View performance'}
      </button>
    </div>
    {performance && (
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
        <p className="font-semibold text-slate-900">
          {String(performance.employeeName || '')} — score {String(performance.performanceScore)}/100
        </p>
        <p>
          Completed: {String(performance.completedTasks)} · Pending: {String(performance.pendingTasks)} ·
          Delayed: {String(performance.delayedTasks)} · Completion:{' '}
          {String(performance.completionPercentage)}%
        </p>
        <p className="whitespace-pre-wrap italic">{String(performance.insight || '')}</p>
      </div>
    )}
  </div>
)}
    </>
  );
};

export default AiAgentTabPanels;
