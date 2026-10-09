/** Shared UI primitives — grayscale-first industrial styling (ISA-101). */
import { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { detectAnomalies, healthOf } from '../simulation/engine';

export function Panel({ title, right, children, className = '' }) {
  return (
    <div className={`bg-sf-panel border border-sf-border rounded-md ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-sf-border">
          <h3 className="text-[13px] font-medium text-sf-text">{title}</h3>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function PanelHeader({ title, right }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-sf-border">
      <h2 className="text-[13px] font-medium text-sf-text">{title}</h2>
      {right}
    </div>
  );
}

/* Unified status chip: machine statuses + alert lifecycle states.
   Color is reserved for status only; label defaults to the status key. */
const STATUS_STYLES = {
  running: 'text-sf-muted border-sf-border',
  watch: 'text-sf-medium border-sf-medium/40',
  warning: 'text-sf-high border-sf-high/40',
  critical: 'text-sf-critical border-sf-critical/40',
  maintenance: 'text-sf-info border-sf-info/40',
  active: 'text-sf-critical border-sf-critical/40',
  acknowledged: 'text-sf-info border-sf-info/40',
  resolved: 'text-sf-muted border-sf-border',
  default: 'text-sf-muted border-sf-border',
};

export function StatusChip({ status, label, flash = false, className = '' }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.default;
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border bg-sf-panel2 ${style} ${flash ? 'sf-alarm-flash' : ''} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label || status}
    </span>
  );
}

export function KpiCard({ label, value, unit, timestamp, sparkData, status }) {
  const borderCls =
    status === 'critical'
      ? 'border-l-2 border-l-sf-critical'
      : status === 'warning'
        ? 'border-l-2 border-l-sf-high'
        : status === 'info'
          ? 'border-l-2 border-l-sf-info'
          : '';
  const age = timestamp > 0 ? Math.max(0, Math.round((Date.now() - timestamp) / 1000)) : 0;
  return (
    <div className={`bg-sf-panel border border-sf-border rounded-md p-3 ${borderCls}`}>
      <div className="text-[12px] text-sf-muted mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="font-mono tnum text-[24px] font-semibold text-sf-text">{value}</span>
        {unit && <span className="text-[12px] text-sf-faint">{unit}</span>}
      </div>
      <div className="flex items-end justify-between mt-1">
        <span className="text-[11px] text-sf-faint">updated {age}s ago</span>
        {sparkData && sparkData.length > 1 && (
          <ResponsiveContainer width={60} height={28}>
            <LineChart data={sparkData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <Line type="monotone" dataKey="v" stroke="#9aa3af" strokeWidth={1} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export function SensorRow({ label, value, unit, decimals = 1, hi, hihi }) {
  const numeric = typeof value === 'number';
  const display = numeric ? value.toFixed(decimals) : value;
  const cls =
    numeric && hihi > 0 && value >= hihi
      ? 'text-sf-critical'
      : numeric && hi > 0 && value >= hi
        ? 'text-sf-high'
        : 'text-sf-text';
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-sf-border/60 last:border-0">
      <div>
        <div className="text-[13px] text-sf-muted">{label}</div>
        {hi > 0 && (
          <div className="text-[10px] font-mono tnum text-sf-faint">
            hi {hi} / hihi {hihi}
          </div>
        )}
      </div>
      <div className={`font-mono tnum text-[14px] ${cls}`}>
        {display}
        {unit && <span className="text-[11px] text-sf-faint ml-1">{unit}</span>}
      </div>
    </div>
  );
}

/* Per-machine { detection, health } keyed by machine id. */
export function useMachineHealth(machineState) {
  return useMemo(() => {
    const out = {};
    for (const id of Object.keys(machineState)) {
      const st = machineState[id];
      const detection = detectAnomalies(id, st);
      out[id] = { detection, health: healthOf(id, st, detection) };
    }
    return out;
  }, [machineState]);
}
