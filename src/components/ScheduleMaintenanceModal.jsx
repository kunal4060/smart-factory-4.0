import { useState } from 'react';
import { Wrench, X } from 'lucide-react';
import { MACHINES, FAULT_TYPES } from '../simulation/engine';
import { Panel } from './ui';

function toLocalInputValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export default function ScheduleMaintenanceModal({ alert, onClose, onConfirm }) {
  const machine = MACHINES.find((m) => m.id === alert.machineId);
  const faultType = (FAULT_TYPES[alert.faultType] && FAULT_TYPES[alert.faultType].label) || alert.faultType;
  const defaultTech =
    (FAULT_TYPES[alert.faultType] && FAULT_TYPES[alert.faultType].technician) ||
    'Mechanical';

  const [priority, setPriority] = useState(alert.severity || 'medium');
  const [technician, setTechnician] = useState(defaultTech);
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 4);
    return toLocalInputValue(d);
  });
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    onConfirm({
      machineId: alert.machineId,
      faultType: alert.faultType,
      priority,
      technician,
      scheduledAt,
      notes: notes.trim(),
    });
    onClose();
  };

  const inputClass =
    'w-full px-2.5 py-1.5 rounded bg-sf-bg border border-sf-border text-[13px] text-sf-text focus:outline-none focus:border-sf-info';
  const labelClass = 'block text-[12px] text-sf-muted mb-1';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Schedule Maintenance"
    >
      <Panel
        className="w-[480px] max-w-[calc(100vw-2rem)] p-5"
        // Panel renders a div; stop overlay click from closing when interacting inside
      >
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-[15px] font-semibold text-sf-text">
              Schedule Maintenance
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="ml-auto text-sf-faint hover:text-sf-muted"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Locked rows */}
          <div className="border border-sf-border rounded-md bg-sf-panel2 p-3 mb-4 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-sf-faint w-28 shrink-0">Asset</span>
              <span className="font-mono tnum text-[13px] font-semibold text-sf-text">
                {alert.machineId}
              </span>
              <span className="text-[13px] text-sf-muted">
                {machine ? machine.name : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-sf-faint w-28 shrink-0">
                Predicted fault
              </span>
              <span className="text-[13px] text-sf-text">{faultType}</span>
            </div>
          </div>

          {/* Editable fields */}
          <div className="space-y-3">
            <div>
              <label className={labelClass} htmlFor="sm-priority">
                Priority
              </label>
              <select
                id="sm-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={inputClass}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="sm-technician">
                Technician
              </label>
              <select
                id="sm-technician"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                className={inputClass}
              >
                <option value="Mechanical">Mechanical</option>
                <option value="Electrical">Electrical</option>
                <option value="Automation">Automation</option>
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="sm-scheduled">
                Scheduled at
              </label>
              <input
                id="sm-scheduled"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className={`${inputClass} font-mono tnum`}
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="sm-notes">
                Notes
              </label>
              <textarea
                id="sm-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Work scope, parts, access constraints…"
                className={`${inputClass} resize-y placeholder:text-sf-faint`}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-5 pt-4 border-t border-sf-border flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded text-[13px] text-sf-muted hover:text-sf-text border border-transparent"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!scheduledAt}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-[13px] text-sf-text bg-sf-panel2 border border-sf-border hover:bg-sf-border disabled:opacity-50"
            >
              <Wrench size={14} />
              Confirm Work Order
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
