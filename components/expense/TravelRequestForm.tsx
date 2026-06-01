import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, Info, Loader2, MapPin } from 'lucide-react';
import { createTravelRequest } from './expenseApi';
import ExpenseSideDrawer from './ExpenseSideDrawer';

interface TravelRequestFormProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const PURPOSE_OPTIONS = [
  'Client Meeting',
  'Conference / Event',
  'Internal Training',
  'Site Visit',
];

const TRAVEL_MODES = ['Flight', 'Train', 'Bus', 'Car', 'Cab'];
const DEFAULT_PER_DIEM_DAILY_RATE = 1500;

const fieldClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-red/40 focus:ring-2 focus:ring-brand-red/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300';

const TravelRequestForm: React.FC<TravelRequestFormProps> = ({ open, onClose, onSaved }) => {
  const [tripTitle, setTripTitle] = useState('');
  const [purposeType, setPurposeType] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelModes, setTravelModes] = useState<string[]>([]);
  const [accommodationRequired, setAccommodationRequired] = useState(false);
  const [hotelPreferences, setHotelPreferences] = useState('');
  const [flightBudget, setFlightBudget] = useState('');
  const [accommodationBudget, setAccommodationBudget] = useState('');
  const [localTransportBudget, setLocalTransportBudget] = useState('');
  const [perDiemBudget, setPerDiemBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPerDiemInfo, setShowPerDiemInfo] = useState(false);
  const perDiemInfoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setTripTitle('');
    setPurposeType('');
    setFromLocation('');
    setToLocation('');
    setStartDate('');
    setEndDate('');
    setTravelModes([]);
    setAccommodationRequired(false);
    setHotelPreferences('');
    setFlightBudget('');
    setAccommodationBudget('');
    setLocalTransportBudget('');
    setPerDiemBudget('');
    setNotes('');
    setError(null);
    setShowPerDiemInfo(false);
  }, [open]);

  useEffect(() => {
    if (!showPerDiemInfo) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (perDiemInfoRef.current && !perDiemInfoRef.current.contains(event.target as Node)) {
        setShowPerDiemInfo(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPerDiemInfo]);

  const tripDurationDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
    const diffMs = end.getTime() - start.getTime();
    return Math.floor(diffMs / 86400000) + 1;
  }, [startDate, endDate]);

  const perDiemCalculated = useMemo(() => {
    return tripDurationDays * DEFAULT_PER_DIEM_DAILY_RATE;
  }, [tripDurationDays]);

  useEffect(() => {
    setPerDiemBudget(String(perDiemCalculated));
  }, [perDiemCalculated]);

  const totalEstimate = useMemo(() => {
    return [flightBudget, accommodationBudget, localTransportBudget, perDiemBudget].reduce(
      (sum, value) => sum + (Number(value) || 0),
      0,
    );
  }, [flightBudget, accommodationBudget, localTransportBudget, perDiemBudget]);

  const toggleTravelMode = (mode: string) => {
    setTravelModes((prev) => (prev.includes(mode) ? prev.filter((item) => item !== mode) : [...prev, mode]));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const metaNotes = {
        purposeType,
        travelModes,
        accommodationRequired,
        hotelPreferences: accommodationRequired ? hotelPreferences : '',
        budgetBreakdown: {
          flightTravel: Number(flightBudget) || 0,
          accommodation: Number(accommodationBudget) || 0,
          localTransport: Number(localTransportBudget) || 0,
          perDiem: Number(perDiemBudget) || 0,
        },
        additionalNotes: notes,
      };

      await createTravelRequest({
        purpose: tripTitle.trim(),
        fromLocation,
        toLocation,
        startDate,
        endDate,
        estimatedCost: totalEstimate,
        notes: JSON.stringify(metaNotes),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create travel request');
    } finally {
      setLoading(false);
    }
  };

  const budgetRow = (label: string, value: string, onChange: (next: string) => void) => (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
      <div className="flex w-36 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
        <span className="flex items-center border-r border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">
          ₹
        </span>
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border-0 bg-white px-2 py-2 text-sm outline-none dark:bg-slate-900"
        />
      </div>
    </div>
  );

  return (
    <ExpenseSideDrawer
      open={open}
      onClose={onClose}
      title="New Travel Request"
      subtitle="Submit a request for upcoming business travel"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Submit Request
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</div>
        )}

        <label className="block">
          <span className={labelClass}>
            Trip Title <span className="text-brand-red">*</span>
          </span>
          <input
            value={tripTitle}
            onChange={(e) => setTripTitle(e.target.value)}
            placeholder="e.g., Annual Sales Summit Q3"
            className={fieldClass}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>
              From <span className="text-brand-red">*</span>
            </span>
            <div className="relative">
              <MapPin size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
                placeholder="Origin city"
                className={`${fieldClass} pl-9`}
              />
            </div>
          </label>
          <label className="block">
            <span className={labelClass}>
              To <span className="text-brand-red">*</span>
            </span>
            <div className="relative">
              <MapPin size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
                placeholder="Destination city"
                className={`${fieldClass} pl-9`}
              />
            </div>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>
              Departure <span className="text-brand-red">*</span>
            </span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={fieldClass} />
          </label>
          <label className="block">
            <span className={labelClass}>
              Return <span className="text-brand-red">*</span>
            </span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={fieldClass} />
          </label>
        </div>

        <div>
          <span className={labelClass}>Travel Modes</span>
          <div className="flex flex-wrap gap-3">
            {TRAVEL_MODES.map((mode) => (
              <label key={mode} className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={travelModes.includes(mode)}
                  onChange={() => toggleTravelMode(mode)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-red focus:ring-brand-red/20"
                />
                {mode}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Accommodation Required</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Need a hotel booking?</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={accommodationRequired}
              onClick={() => setAccommodationRequired((prev) => !prev)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${accommodationRequired ? 'bg-brand-red' : 'bg-slate-200 dark:bg-slate-700'}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${accommodationRequired ? 'left-[22px]' : 'left-0.5'}`}
              />
            </button>
          </div>
          {accommodationRequired && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-950/50">
              <p className="mb-2 text-sm font-medium text-slate-800 dark:text-slate-100">Hotel Preferences</p>
              <input
                value={hotelPreferences}
                onChange={(e) => setHotelPreferences(e.target.value)}
                placeholder="Any specific hotel or location..."
                className={fieldClass}
              />
            </div>
          )}
        </div>

        <label className="block">
          <span className={labelClass}>Purpose</span>
          <select value={purposeType} onChange={(e) => setPurposeType(e.target.value)} className={fieldClass}>
            <option value="">Select purpose</option>
            {PURPOSE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-900/40">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <Calculator size={16} className="text-brand-red" />
            Budget Estimate
          </div>
          <div className="space-y-3">
            {budgetRow('Flight/Travel', flightBudget, setFlightBudget)}
            {budgetRow('Accommodation', accommodationBudget, setAccommodationBudget)}
            {budgetRow('Local Transport', localTransportBudget, setLocalTransportBudget)}
            <div ref={perDiemInfoRef} className="relative">
              <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-100/90 px-3 py-2.5 dark:bg-slate-800/60">
                <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                  Per Diem Allowance
                  <button
                    type="button"
                    onClick={() => setShowPerDiemInfo((prev) => !prev)}
                    className="rounded-full text-slate-400 transition hover:text-slate-600"
                    aria-label="Per diem calculation details"
                  >
                    <Info size={14} />
                  </button>
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  ₹ {perDiemCalculated.toLocaleString('en-IN')}
                </span>
              </div>
              {showPerDiemInfo && (
                <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Calculation</p>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span>Daily Rate:</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        ₹{DEFAULT_PER_DIEM_DAILY_RATE.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Duration:</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {tripDurationDays} {tripDurationDays === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm dark:border-slate-700">
                    <span className="font-semibold text-slate-900 dark:text-white">Total:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ₹{perDiemCalculated.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-white px-4 py-3 dark:bg-slate-950">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Total Request</span>
            <span className="text-lg font-bold text-brand-red">₹ {totalEstimate.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <label className="block">
          <span className={labelClass}>Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Additional details for approvers..."
            className={fieldClass}
          />
        </label>
      </div>
    </ExpenseSideDrawer>
  );
};

export default TravelRequestForm;
