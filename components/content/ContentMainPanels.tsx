import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BellRing, CalendarDays, Check, ChevronLeft, ChevronRight, Hash, Link2, Plus } from 'lucide-react';
import { ContentDraftMode } from '../../services/contentApi';

type ContentMainPanelsProps = {
  ctx: any;
};

const ContentMainPanels: React.FC<ContentMainPanelsProps> = ({ ctx }) => {
  const {
    activeTab,
    isDayPage,
    monthCursor,
    monthContentCount,
    openCreatePage,
    setMonthCursor,
    WEEK_DAYS,
    WEEK_DAY_HEADER_CLASS,
    monthDays,
    toDateKey,
    countsByDate,
    selectedDate,
    todayKey,
    navigate,
    CalendarDayCounters,
    hasServerDraftContent,
    savedDrafts,
    deletingDraftMode,
    setDeletingDraftMode,
    apiDeleteContentDraft,
    CONTENT_CREATE_DRAFT_STORAGE_PREFIX,
    setSavedDrafts,
    setToast,
    TYPE_LABEL,
    TYPE_ICON_META,
    selectedType,
    selectedTypeItems,
    selectedDayItems,
    selectedDayGroups,
    isTypeDetailPage,
    isItemDetailPage,
    selectedItem,
    loading,
    TYPE_ACCENT,
    renderContentCard,
    linkOptions,
    tagOptions,
    newLinkValue,
    setNewLinkValue,
    addAutoLink,
    removeAutoLink,
    newTagValue,
    setNewTagValue,
    addAutoTag,
    removeAutoTag,
    momentFromDate,
    setMomentFromDate,
    momentToDate,
    setMomentToDate,
    momentTopic,
    setMomentTopic,
    momentText,
    setMomentText,
    showScheduleForm,
    setShowScheduleForm,
    scheduleAutosaveStatus,
    autoResizeTextarea,
    handleMomentSave,
    editingMomentId,
    resetMomentForm,
    scheduleItems,
    isReminderTypeDetail,
    isReminderItemDetail,
    selectedReminderType,
    reminderCategoryLabel,
    selectedReminderItem,
    selectedReminderTypeItems,
    activeReminderItems,
    selectedScheduleItemId,
    selectedScheduleItem,
    isScheduleItemDetail,
    ScheduleDatePicker,
  } = ctx;

  return (
    <>
      {activeTab === 'calendar' && !isDayPage && (
      <div className="w-full max-w-full rounded-[1.8rem] border border-white/70 bg-white shadow-[0_22px_56px_rgba(15,23,42,0.08)]">
        <div className="px-4 py-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Monthly Board</p>
            <h3 className="mt-1 text-[1.7rem] font-semibold tracking-[-0.02em] text-slate-900">{monthCursor.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="rounded-[1rem] border border-slate-200 bg-slate-50/80 px-3.5 py-1.5 text-[13px] text-slate-600">
              {monthContentCount} items scheduled this month
            </div>
            <button
              type="button"
              onClick={() => openCreatePage()}
              className="inline-flex items-center gap-2 rounded-[1rem] bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3.5 py-2.5 text-sm font-medium text-white shadow-[0_16px_30px_rgba(139,92,246,0.22)] transition hover:translate-y-[-1px]"
            >
              <Plus size={16} /> Add Content
            </button>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMonthCursor((prev: Date) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            className="inline-flex items-center gap-2 rounded-[1rem] border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-700"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-700">
            {monthCursor.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          </div>
          <button
            type="button"
            onClick={() => setMonthCursor((prev: Date) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            className="inline-flex items-center gap-2 rounded-[1rem] border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-violet-200 hover:text-violet-700"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2.5">
          {WEEK_DAYS.map((day: string, dayIndex: number) => (
            <div key={day} className={`rounded-[1rem] px-2.5 py-2 text-center text-[11px] font-medium uppercase tracking-[0.12em] ${WEEK_DAY_HEADER_CLASS[dayIndex]}`}>
              {day}
            </div>
          ))}
          {monthDays.map((day: Date | null, idx: number) => {
            if (!day) return <div key={`empty-${idx}`} className="h-[138px] rounded-[1.35rem] border border-dashed border-slate-200 bg-white/40" />;
            const dateKey = toDateKey(day);
            const counts = countsByDate.get(dateKey);
            const hasAny = !!counts && (Object.values(counts) as number[]).some((val) => val > 0);
            const active = selectedDate === dateKey;
            const dayColumnIndex = idx % 7;
            const isWeekend = dayColumnIndex === 5 || dayColumnIndex === 6;
            const isToday = dateKey === todayKey;
            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => navigate(`/content/day/${dateKey}`)}
                className={`group relative h-[138px] overflow-hidden rounded-[1.45rem] border p-3.5 text-left transition-all duration-200 ${
                  active
                    ? 'border-violet-300 bg-gradient-to-br from-violet-50 to-white shadow-[0_18px_40px_rgba(139,92,246,0.12)]'
                    : isWeekend
                    ? 'border-rose-100 bg-gradient-to-br from-rose-50/40 to-white hover:border-rose-200 hover:shadow-[0_12px_28px_rgba(244,63,94,0.08)]'
                    : 'border-slate-200 bg-white hover:border-violet-200 hover:shadow-[0_12px_28px_rgba(15,23,42,0.06)]'
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-[13px] font-semibold ${active ? 'bg-violet-600 text-white' : isToday ? 'border border-brand-red/20 bg-white text-brand-red shadow-[0_8px_20px_rgba(236,72,71,0.10)]' : 'bg-slate-100 text-slate-700'}`}>
                    {String(day.getDate()).padStart(2, '0')}
                  </span>
                  {isToday ? <span className="rounded-full border border-brand-red/20 bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-brand-red shadow-[0_8px_20px_rgba(236,72,71,0.10)]">Today</span> : null}
                </div>
                {hasAny ? (
                  <CalendarDayCounters counts={counts} />
                ) : (
                  <div className="mt-7 text-[11px] text-slate-300">No scheduled items</div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      </div>
      )}

      {activeTab === 'calendar' ? (
        isDayPage ? (
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-white/70 bg-white/90 px-5 py-2 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                    <Link to="/content" className="inline-flex items-center gap-2 transition hover:text-slate-700">
                      <ArrowRight size={12} className="rotate-180" />
                      Calendar
                    </Link>
                    {isTypeDetailPage ? (
                      <>
                        <span>/</span>
                        <Link to={`/content/day/${selectedDate}`} className="inline-flex items-center gap-2 transition hover:text-slate-700">
                          {selectedDate}
                        </Link>
                        {isItemDetailPage ? (
                          <>
                            <span>/</span>
                            <Link to={`/content/day/${selectedDate}/type/${selectedType}`} className="inline-flex items-center gap-2 transition hover:text-slate-700">
                              {TYPE_LABEL[selectedType]}
                            </Link>
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                  <h3 className="mt-1.5 text-[1.28rem] font-semibold text-slate-900">
                    {isItemDetailPage
                      ? (selectedItem?.title || 'Content details')
                      : isTypeDetailPage
                      ? `${TYPE_LABEL[selectedType]} scheduled for ${selectedDate}`
                      : `Content scheduled for ${selectedDate}`}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {isItemDetailPage
                      ? `Focused view for this ${TYPE_LABEL[selectedType].toLowerCase()} content item.`
                      : isTypeDetailPage
                      ? `${selectedTypeItems.length} ${TYPE_LABEL[selectedType].toLowerCase()} item${selectedTypeItems.length === 1 ? '' : 's'} ready to review, update, or publish.`
                      : `${selectedDayItems.length} item${selectedDayItems.length === 1 ? '' : 's'} ready to review, update, or publish.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openCreatePage(selectedDate)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-medium text-white shadow-[0_18px_36px_rgba(139,92,246,0.25)]"
                >
                  <Plus size={16} /> Add Content
                </button>
              </div>
            </div>
            {loading ? (
              <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 text-slate-500 shadow-sm">Loading...</div>
            ) : isTypeDetailPage ? (
              isItemDetailPage ? (
                selectedItem ? (
                  <div className="w-full">
                    {renderContentCard(selectedItem, { expanded: true })}
                  </div>
                ) : (
                  <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center shadow-sm">
                    <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${selectedType ? TYPE_ICON_META[selectedType].className : 'bg-violet-50 text-violet-600'}`}>
                      {selectedType ? React.createElement(TYPE_ICON_META[selectedType].icon, { size: 22 }) : <CalendarDays size={22} />}
                    </div>
                    <h4 className="mt-4 text-lg font-semibold text-slate-900">Content item not found</h4>
                    <p className="mt-2 text-sm text-slate-500">Go back to the type view to choose another scheduled item.</p>
                    <div className="mt-5 flex items-center justify-center gap-3">
                      <Link to={`/content/day/${selectedDate}/type/${selectedType}`} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300">
                        <ArrowRight size={14} className="rotate-180" /> Back To Type
                      </Link>
                    </div>
                  </div>
                )
              ) : selectedTypeItems.length > 0 ? (
                <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                  {selectedTypeItems.map((item: any) => renderContentCard(item, { clickable: true }))}
                </div>
              ) : (
                <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center shadow-sm">
                  <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${selectedType ? TYPE_ICON_META[selectedType].className : 'bg-violet-50 text-violet-600'}`}>
                    {selectedType ? React.createElement(TYPE_ICON_META[selectedType].icon, { size: 22 }) : <CalendarDays size={22} />}
                  </div>
                  <h4 className="mt-4 text-lg font-semibold text-slate-900">No {selectedType ? TYPE_LABEL[selectedType].toLowerCase() : 'content'} scheduled for this day</h4>
                  <p className="mt-2 text-sm text-slate-500">Go back to the day summary or create a new item for this content type.</p>
                  <div className="mt-5 flex items-center justify-center gap-3">
                    <Link to={`/content/day/${selectedDate}`} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300">
                      <ArrowRight size={14} className="rotate-180" /> Back To Day
                    </Link>
                    <button
                      type="button"
                      onClick={() => openCreatePage(selectedDate)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-medium text-white shadow-[0_18px_36px_rgba(139,92,246,0.24)]"
                    >
                      <Plus size={16} /> Add Content
                    </button>
                  </div>
                </div>
              )
            ) : selectedDayItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {selectedDayGroups.map((group: any) => {
                  const meta = TYPE_ICON_META[group.type];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={group.type}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/content/day/${selectedDate}/type/${group.type}`)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          navigate(`/content/day/${selectedDate}/type/${group.type}`);
                        }
                      }}
                      className="group relative aspect-[1.16/1] w-full overflow-hidden rounded-[2rem] border border-white/80 bg-white/95 p-3.5 text-left shadow-[0_22px_56px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_28px_64px_rgba(15,23,42,0.12)]"
                    >
                      <div className={`pointer-events-none absolute inset-x-0 top-0 h-[70px] bg-gradient-to-r ${TYPE_ACCENT[group.type].tone}`} />
                      <div className="relative flex h-full flex-col">
                        <div className="flex items-start justify-between gap-4">
                          <div className="inline-flex items-center gap-2">
                            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 ${meta.className} shadow-[0_10px_24px_rgba(255,255,255,0.45)]`}>
                              <Icon size={17} />
                            </div>
                            <span className={`inline-flex rounded-full px-3.5 py-1.5 text-[15px] font-semibold ${TYPE_ACCENT[group.type].badge}`}>{TYPE_LABEL[group.type]}</span>
                          </div>
                          <span className={`inline-flex h-10 min-w-[46px] items-center justify-center rounded-[1rem] border bg-white px-2.5 text-[1.1rem] font-semibold ${TYPE_ACCENT[group.type].counter}`}>
                            {group.count}
                          </span>
                        </div>
                        <div className="mt-7 max-h-[184px] space-y-3 overflow-y-auto pr-1">
                          {group.items.map((item: any, index: number) => (
                            <button
                              key={item.contentId}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(`/content/day/${selectedDate}/type/${group.type}/item/${encodeURIComponent(item.contentId)}`);
                              }}
                              className={`flex w-full items-center gap-3 rounded-[1.1rem] border border-white/80 bg-gradient-to-r px-3.5 py-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.05)] ring-1 transition hover:-translate-y-[1px] hover:border-slate-200 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)] ${TYPE_ACCENT[group.type].previewRow}`}
                            >
                              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${TYPE_ACCENT[group.type].previewIndex}`}>
                                {index + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-slate-700">
                                  {item.title || 'Untitled content'}
                                </div>
                                <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">
                                  Scheduled item
                                </div>
                              </div>
                              <span className={`h-2 w-2 rounded-full ${TYPE_ACCENT[group.type].previewDot}`} />
                            </button>
                          ))}
                        </div>
                        <div className="mt-auto flex items-center justify-between gap-4 pt-6">
                          <p className="text-[15px] text-slate-500">
                            {group.count} item{group.count === 1 ? '' : 's'} scheduled
                          </p>
                          <div className="inline-flex items-center gap-2 text-sm font-medium text-brand-red/80 transition group-hover:text-brand-red">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-red/60" />
                            Show all
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                  <CalendarDays size={22} />
                </div>
                <h4 className="mt-4 text-lg font-semibold text-slate-900">Nothing scheduled for this day yet</h4>
                <p className="mt-2 text-sm text-slate-500">Create a content item to start building the day&apos;s publishing plan.</p>
                <button
                  type="button"
                  onClick={() => openCreatePage(selectedDate)}
                  className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-medium text-white shadow-[0_18px_36px_rgba(139,92,246,0.24)]"
                >
                  <Plus size={16} /> Add Content
                </button>
              </div>
            )}
          </div>
        ) : null
      ) : activeTab === 'auto-add' ? (
        <div className="rounded-[2rem] border border-white/70 bg-white/90 px-5 py-3.5 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-[1.2rem] font-semibold text-slate-900">Auto add library</h3>
            </div>
            <div className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50/70 px-3.5 py-1.5 text-[13px] text-fuchsia-700">
              {linkOptions.length + tagOptions.length} reusable assets
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:justify-items-center">
            <div className="w-full max-w-[640px] rounded-[1.7rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-4 py-2.5 shadow-sm xl:w-[590px] xl:max-w-[590px]">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-[0.95rem] bg-violet-100 text-violet-700"><Link2 size={14} /></div>
                <div className="min-w-0">
                  <h4 className="text-[0.95rem] font-semibold leading-none text-slate-900">Links</h4>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <input value={newLinkValue} onChange={(e) => setNewLinkValue(e.target.value)} placeholder="https://..." className="min-w-0 w-[calc(100%-72px)] max-w-[500px] rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[14px] outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100" />
                <button type="button" onClick={addAutoLink} className="min-w-[62px] rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-[12px] font-medium text-white shadow-[0_16px_30px_rgba(139,92,246,0.22)]">Add</button>
              </div>
              <div className="mt-3.5 space-y-2">
                {linkOptions.map((entry: string) => (
                  <div key={entry} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm">
                    <span className="truncate text-[13px] text-slate-700">{entry}</span>
                    <button type="button" onClick={() => removeAutoLink(entry)} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-100">Remove</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full max-w-[640px] rounded-[1.7rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-4 py-2.5 shadow-sm xl:w-[590px] xl:max-w-[590px]">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-[0.95rem] bg-fuchsia-100 text-fuchsia-700"><Hash size={14} /></div>
                <div className="min-w-0">
                  <h4 className="text-[0.95rem] font-semibold leading-none text-slate-900">Hashtags</h4>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <input value={newTagValue} onChange={(e) => setNewTagValue(e.target.value)} placeholder="#tag" className="min-w-0 w-[calc(100%-72px)] max-w-[500px] rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[14px] outline-none transition focus:border-fuchsia-300 focus:ring-4 focus:ring-fuchsia-100" />
                <button type="button" onClick={addAutoTag} className="min-w-[62px] rounded-2xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-4 py-2 text-[12px] font-medium text-white shadow-[0_16px_30px_rgba(217,70,239,0.22)]">Add</button>
              </div>
              <div className="mt-3.5 space-y-2">
                {tagOptions.map((entry: string) => (
                  <div key={entry} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm">
                    <span className="truncate text-[13px] text-slate-700">{entry}</span>
                    <button type="button" onClick={() => removeAutoTag(entry)} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-100">Remove</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'content-schedule' ? (
        <div className="space-y-4">
          <div className="rounded-[2rem] border border-white/70 bg-white/90 px-5 py-3 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
              <button
                type="button"
                onClick={() => navigate('/content?tab=content-schedule')}
                className="transition hover:text-slate-700"
              >
                Content Schedule
              </button>
              {showScheduleForm || isScheduleItemDetail ? <span>/</span> : null}
              {showScheduleForm ? (
                <span className="text-amber-700">{editingMomentId ? 'Edit Schedule' : 'Add Schedule'}</span>
              ) : null}
              {!showScheduleForm && isScheduleItemDetail ? (
                <span className="text-amber-700">Schedule Detail</span>
              ) : null}
            </div>
          </div>
          {showScheduleForm ? (
            <div className="rounded-[2rem] border border-white/70 bg-white/90 px-5 py-4 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
              <div className="mb-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleForm(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300"
                >
                  <ArrowRight size={14} className="rotate-180" />
                  Back
                </button>
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  scheduleAutosaveStatus === 'error'
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : scheduleAutosaveStatus === 'saved'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : scheduleAutosaveStatus === 'saving'
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}>
                  {scheduleAutosaveStatus === 'saving'
                    ? 'Auto-saving...'
                    : scheduleAutosaveStatus === 'saved'
                    ? 'Draft auto-saved'
                    : scheduleAutosaveStatus === 'error'
                    ? 'Autosave failed'
                    : 'Autosave on'}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-semibold text-slate-700">From date</label>
                  <ScheduleDatePicker value={momentFromDate} onChange={setMomentFromDate} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-semibold text-slate-700">To date</label>
                  <ScheduleDatePicker value={momentToDate} onChange={setMomentToDate} />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-semibold text-slate-700">Topic</label>
                  <input
                    type="text"
                    value={momentTopic}
                    onChange={(event) => setMomentTopic(event.target.value)}
                    placeholder="Enter topic"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-[13px] font-semibold text-slate-700">Description / Moment</label>
                  <textarea
                    value={momentText}
                    onChange={(event) => setMomentText(event.target.value)}
                    onInput={(event) => autoResizeTextarea(event.currentTarget)}
                    placeholder="Write moment details (e.g. today send 3 mails and create 2 contents)"
                    rows={1}
                    className="min-h-[400px] w-full resize-none overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleMomentSave}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-[0_16px_30px_rgba(245,158,11,0.25)]"
                >
                  <Check size={15} /> {editingMomentId ? 'Update Schedule' : 'Save Schedule'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleForm(false);
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowScheduleForm(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-[0_16px_30px_rgba(245,158,11,0.25)]"
              >
                <Plus size={15} /> Add Schedule
              </button>
            </div>
          )}

          {!showScheduleForm && scheduleItems.length === 0 ? (
            <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white/80 px-6 py-10 text-center shadow-sm">
              <h4 className="text-lg font-semibold text-slate-900">No schedule here</h4>
              <p className="mt-2 text-sm text-slate-500">Click Add Schedule to create one.</p>
            </div>
          ) : !showScheduleForm && isScheduleItemDetail ? (
            selectedScheduleItem ? (
              <div className="w-full">
                {renderContentCard(selectedScheduleItem, { expanded: true })}
              </div>
            ) : (
              <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white/80 px-6 py-10 text-center shadow-sm">
                <h4 className="text-lg font-semibold text-slate-900">Schedule item not found</h4>
                <p className="mt-2 text-sm text-slate-500">Go back to schedule list and select another card.</p>
              </div>
            )
          ) : !showScheduleForm ? (
            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 2xl:grid-cols-3">
              {scheduleItems.map((item: any) =>
                renderContentCard(item, {
                  clickable: true,
                  clickHref: `/content?tab=content-schedule&scheduleItem=${encodeURIComponent(item.contentId)}`,
                })
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-[2rem] border border-white/70 bg-white/90 px-5 py-4 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                  <span>Reminder Workflow</span>
                  {isReminderTypeDetail ? (
                    <>
                      <span>/</span>
                      <button
                        type="button"
                        onClick={() => navigate(`/content?tab=${encodeURIComponent(activeTab)}`)}
                        className="transition hover:text-slate-700"
                      >
                        {activeTab === 'follow-ee' ? 'EE follow-ups' : 'EGA follow-ups'}
                      </button>
                    </>
                  ) : null}
                  {isReminderItemDetail ? (
                    <>
                      <span>/</span>
                      <button
                        type="button"
                        onClick={() => navigate(`/content?tab=${encodeURIComponent(activeTab)}&reminderType=${encodeURIComponent(selectedReminderType)}`)}
                        className="transition hover:text-slate-700"
                      >
                        {reminderCategoryLabel}
                      </button>
                    </>
                  ) : null}
                </div>
                <h3 className="mt-1 text-2xl font-semibold text-slate-900">
                  {isReminderItemDetail
                    ? (selectedReminderItem?.title || 'Reminder details')
                    : isReminderTypeDetail
                    ? `${reminderCategoryLabel} reminders`
                    : activeTab === 'follow-ee'
                    ? 'EE follow-ups'
                    : 'EGA follow-ups'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => openCreatePage(selectedDate)}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-medium text-white shadow-[0_18px_36px_rgba(139,92,246,0.25)]"
              >
                <Plus size={16} /> Add Reminder
              </button>
            </div>
          </div>
          {loading ? (
            <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 text-slate-500 shadow-sm">Loading...</div>
          ) : activeReminderItems.length === 0 ? (
            <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <BellRing size={22} />
              </div>
              <h4 className="mt-4 text-lg font-semibold text-slate-900">No reminders in this stream</h4>
              <p className="mt-2 text-sm text-slate-500">Add a reminder to create a polished follow-up queue for your team.</p>
            </div>
          ) : isReminderItemDetail ? (
            selectedReminderItem ? (
              <div className="w-full">
                {renderContentCard(selectedReminderItem, { expanded: true })}
              </div>
            ) : (
              <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center shadow-sm">
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${selectedReminderType ? TYPE_ICON_META[selectedReminderType].className : 'bg-emerald-50 text-emerald-600'}`}>
                  {selectedReminderType ? React.createElement(TYPE_ICON_META[selectedReminderType].icon, { size: 22 }) : <BellRing size={22} />}
                </div>
                <h4 className="mt-4 text-lg font-semibold text-slate-900">Reminder item not found</h4>
                <p className="mt-2 text-sm text-slate-500">Go back to the reminder type view to choose another item.</p>
              </div>
            )
          ) : isReminderTypeDetail ? (
            selectedReminderTypeItems.length > 0 ? (
              <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                {selectedReminderTypeItems.map((item: any) =>
                  renderContentCard(item, {
                    clickable: true,
                    clickHref: `/content?tab=${encodeURIComponent(activeTab)}&reminderType=${encodeURIComponent(selectedReminderType)}&reminderItem=${encodeURIComponent(item.contentId)}`,
                  })
                )}
              </div>
            ) : (
              <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white/80 px-6 py-12 text-center shadow-sm">
                <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${selectedReminderType ? TYPE_ICON_META[selectedReminderType].className : 'bg-emerald-50 text-emerald-600'}`}>
                  {selectedReminderType ? React.createElement(TYPE_ICON_META[selectedReminderType].icon, { size: 22 }) : <BellRing size={22} />}
                </div>
                <h4 className="mt-4 text-lg font-semibold text-slate-900">No reminders in this type</h4>
                <p className="mt-2 text-sm text-slate-500">Go back to the reminder overview or add a new reminder for this content type.</p>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 2xl:grid-cols-3">
              {activeReminderItems.map((item: any) =>
                renderContentCard(item, {
                  clickable: true,
                  clickHref: `/content?tab=${encodeURIComponent(activeTab)}&reminderType=${encodeURIComponent(item.type)}&reminderItem=${encodeURIComponent(item.contentId)}`,
                })
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ContentMainPanels;
