import { useState } from 'react';
import {
  LineChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  YAxis,
} from 'recharts';
import {
  Wrench,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Bell,
  Eye,
  CalendarPlus,
  Check,
} from 'lucide-react';
import {
  MACHINES,
  SENSOR_META,
  FAULT_TYPES,
  rulHours,
} from '../simulation/engine';
import { Panel, StatusChip } from './ui';
import ScheduleMaintenanceModal from './ScheduleMaintenanceModal';

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2 };

const SEVERITY_PILL = {
  critical: 'bg-sf-critical/15 text-sf-critical border-sf-critical/50',
  high: 'bg-sf-high/15 text-sf-high border-sf-high/50',
  medium: 'bg-sf-medium/15 text-sf-medium border-sf-medium/50',
};

const LEVEL_TEXT = {
  critical: 'text-sf-critical',
  high: 'text-sf-high',
  medium: 'text-sf-medium',
};

function machineById(id) {
  return MACHINES.find((m) => m.id === id);
}

function timeAgo(ts) {
  if (!ts) return '—';
  const mins = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function formatScheduled(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function EvidenceRow({ item, history, limits }) {
  const meta = SENSOR_META[item.sensor] || { label: item.sensor, unit: '' };
  const data = (history || []).map((h) => ({ v: h[item.sensor] }));
  const hiLimit = limits && limits[item.sensor] ? limits[item.sensor].hi : null;
  const zText = `z=${item.z >= 0 ? '+' : ''}${Number(item.z).toFixed(2)}`;
  const trendText =
    item.trend != null
      ? ` trend ${item.trend >= 0 ? '+' : ''}${Number(item.trend).toFixed(2)}σ`
      : '';

  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-sf-border last:border-0">
      <div className="w-28 shrink-0 text-[12px] text-sf-muted">{meta.label}</div>
      <div
        className={`font-mono tnum text-[13px] w-28 shrink-0 ${
          LEVEL_TEXT[item.level] || 'text-sf-text'
        }`}
      >
        {Number(item.value).toFixed(1)} {meta.unit}
      </div>
      <div className="font-mono tnum text-[11px] text-sf-faint w-36 shrink-0">
        {zText}
        {trendText}
      </div>
      <div className="flex-1 h-8 min-w-0">
        {data.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <YAxis hide domain={['auto', 'auto']} />
              {hiLimit != null && hiLimit > 0 && (
                <ReferenceLine
                  y={hiLimit}
                  stroke="#5c6570"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
              )}
              <Line
                type="monotone"
                dataKey="v"
                stroke="#9aa3af"
                strokeWidth={1}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-[11px] text-sf-faint">No history</div>
        )}
      </div>
    </div>
  );
}

function AlertCard({
  alert,
  machineState,
  onAcknowledge,
  onResolve,
  onViewDetails,
  onSchedule,
}) {
  const machine = machineById(alert.machineId);
  const state = (machineState && machineState[alert.machineId]) || {};
  const rul = rulHours(alert.probability);
  const isCriticalUnack =
    alert.severity === 'critical' && alert.status === 'active';
  const faultLabel =
    (FAULT_TYPES[alert.faultType] && FAULT_TYPES[alert.faultType].label) ||
    alert.faultType;

  return (
    <Panel
      className={`p-4 ${isCriticalUnack ? 'border-l-2 border-l-sf-critical' : ''}`}
    >
      {/* Top row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono tnum text-[13px] font-semibold text-sf-text">
          {alert.machineId}
        </span>
        <span className="text-[13px] text-sf-muted">
          {machine ? machine.name : ''}
        </span>
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border ${
            SEVERITY_PILL[alert.severity]
          } ${isCriticalUnack ? 'sf-alarm-flash' : ''}`}
        >
          {alert.severity}
        </span>
        {alert.status === 'acknowledged' && <StatusChip status="acknowledged" />}
        <span className="ml-auto font-mono tnum text-[11px] text-sf-faint">
          {timeAgo(alert.createdAt)}
        </span>
      </div>

      {/* Second row: fault + probability + RUL */}
      <div className="mt-3 flex items-center gap-4">
        <div className="text-[13px] text-sf-text">{faultLabel}</div>
        <div className="font-mono tnum text-[28px] leading-none text-sf-text">
          {Math.round(alert.probability)}
          <span className="text-[16px] text-sf-muted">%</span>
        </div>
        {rul != null && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono tnum border bg-sf-panel2 text-sf-muted border-sf-border">
            RUL ~{rul}h
          </span>
        )}
      </div>

      {/* Evidence */}
      <div className="mt-3 border-t border-sf-border pt-1">
        {(alert.evidence || []).map((e, i) => (
          <EvidenceRow
            key={`${e.sensor}-${i}`}
            item={e}
            history={state.history}
            limits={machine ? machine.limits : null}
          />
        ))}
      </div>

      {/* Recommendation */}
      {alert.recommendation && (
        <div className="mt-3 flex items-start gap-2">
          <Wrench size={14} className="text-sf-faint mt-0.5 shrink-0" />
          <p className="text-[13px] text-sf-muted">{alert.recommendation}</p>
        </div>
      )}

      {/* CTA row */}
      <div className="mt-3 pt-3 border-t border-sf-border flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onViewDetails(alert.machineId)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] text-sf-muted hover:text-sf-text hover:bg-sf-panel2 border border-transparent"
        >
          <Eye size={14} />
          View Details
        </button>
        <button
          type="button"
          onClick={() => onSchedule(alert)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] text-sf-text bg-sf-panel2 border border-sf-border hover:bg-sf-border"
        >
          <CalendarPlus size={14} />
          Schedule Maintenance
        </button>
        {alert.status === 'active' && (
          <button
            type="button"
            onClick={() => onAcknowledge(alert.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] text-sf-text bg-sf-panel2 border border-sf-border hover:bg-sf-border"
          >
            <Check size={14} />
            Acknowledge
          </button>
        )}
        {alert.status === 'acknowledged' && (
          <button
            type="button"
            onClick={() => onResolve(alert.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] text-sf-text bg-sf-panel2 border border-sf-border hover:bg-sf-border"
          >
            <CheckCircle2 size={14} />
            Resolve
          </button>
        )}
      </div>
    </Panel>
  );
}

function WorkOrderQueue({ workOrders, onCompleteWorkOrder }) {
  const scheduled = (workOrders || []).filter((o) => o.status === 'scheduled');
  const done = (workOrders || []).filter((o) => o.status === 'done');

  return (
    <Panel className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList size={15} className="text-sf-muted" />
        <h3 className="text-[13px] font-semibold text-sf-text">Work Orders</h3>
        <span className="font-mono tnum text-[11px] px-1.5 py-0.5 rounded bg-sf-panel2 border border-sf-border text-sf-muted">
          {scheduled.length}
        </span>
      </div>

      {scheduled.length === 0 && done.length === 0 && (
        <p className="text-[12px] text-sf-faint">No work orders yet.</p>
      )}

      <div className="space-y-3">
        {scheduled.map((order) => (
          <div
            key={order.id}
            className="border border-sf-border rounded-md p-3 bg-sf-panel2"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono tnum text-[12px] font-semibold text-sf-text">
                {order.id}
              </span>
              <span className="font-mono tnum text-[12px] text-sf-muted">
                {order.machineId}
              </span>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border ${
                  SEVERITY_PILL[order.priority] || SEVERITY_PILL.medium
                }`}
              >
                {order.priority}
              </span>
            </div>
            <div className="mt-1 text-[12px] text-sf-text">
              {(FAULT_TYPES[order.faultType] &&
                FAULT_TYPES[order.faultType].label) ||
                order.faultType}
            </div>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-sf-muted flex-wrap">
              <span>{order.technician}</span>
              <span className="font-mono tnum">{formatScheduled(order.scheduledAt)}</span>
            </div>
            {order.notes && (
              <div className="mt-1 text-[11px] text-sf-faint truncate">
                {order.notes}
              </div>
            )}
            <button
              type="button"
              onClick={() => onCompleteWorkOrder(order.id)}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] text-sf-text bg-sf-panel border border-sf-border hover:bg-sf-border"
            >
              <CheckCircle2 size={14} />
              Complete Maintenance
            </button>
          </div>
        ))}

        {done.map((order) => (
          <div
            key={order.id}
            className="border border-sf-border rounded-md p-3 opacity-70"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono tnum text-[12px] font-semibold text-sf-muted">
                {order.id}
              </span>
              <span className="font-mono tnum text-[12px] text-sf-faint">
                {order.machineId}
              </span>
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-sf-muted">
                <CheckCircle2 size={13} />
                Completed
              </span>
            </div>
            <div className="mt-1 text-[12px] text-sf-faint">
              {(FAULT_TYPES[order.faultType] &&
                FAULT_TYPES[order.faultType].label) ||
                order.faultType}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export default function Maintenance({
  alerts,
  workOrders,
  machineState,
  onAcknowledge,
  onResolve,
  onViewDetails,
  onScheduleWorkOrder,
  onCompleteWorkOrder,
}) {
  const [scheduling, setScheduling] = useState(null);
  const [showResolved, setShowResolved] = useState(false);

  const open = (alerts || []).filter((a) => a.status !== 'resolved');
  const resolved = (alerts || []).filter((a) => a.status === 'resolved');

  const sorted = [...open].sort((a, b) => {
    const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (sev !== 0) return sev;
    const statusRank = (s) => (s === 'active' ? 0 : 1);
    return statusRank(a.status) - statusRank(b.status);
  });

  const handleConfirmSchedule = (orderData) => {
    onScheduleWorkOrder(orderData);
    setScheduling(null);
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Alert queue — 2fr */}
      <div className="col-span-2">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={15} className="text-sf-muted" />
          <h2 className="text-[14px] font-semibold text-sf-text">Alerts</h2>
          <span className="font-mono tnum text-[11px] px-1.5 py-0.5 rounded bg-sf-panel2 border border-sf-border text-sf-muted">
            {open.length}
          </span>
        </div>

        {sorted.length === 0 ? (
          <Panel className="p-8 flex flex-col items-center gap-2 text-center">
            <CheckCircle2 size={28} className="text-sf-faint" />
            <p className="text-[13px] text-sf-muted">
              No active alerts — all systems nominal.
            </p>
          </Panel>
        ) : (
          <div className="space-y-3">
            {sorted.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                machineState={machineState}
                onAcknowledge={onAcknowledge}
                onResolve={onResolve}
                onViewDetails={onViewDetails}
                onSchedule={setScheduling}
              />
            ))}
          </div>
        )}

        {/* Resolved — collapsed section */}
        {resolved.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowResolved((v) => !v)}
              className="inline-flex items-center gap-1.5 text-[12px] text-sf-faint hover:text-sf-muted"
            >
              {showResolved ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Resolved
              <span className="font-mono tnum text-[11px] px-1.5 py-0.5 rounded bg-sf-panel2 border border-sf-border">
                {resolved.length}
              </span>
            </button>
            {showResolved && (
              <div className="mt-2 space-y-2">
                {resolved.map((alert) => {
                  const machine = machineById(alert.machineId);
                  return (
                    <Panel key={alert.id} className="p-3 opacity-70">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono tnum text-[12px] font-semibold text-sf-muted">
                          {alert.machineId}
                        </span>
                        <span className="text-[12px] text-sf-faint">
                          {machine ? machine.name : ''}
                        </span>
                        <StatusChip status="resolved" />
                        <span className="ml-auto font-mono tnum text-[11px] text-sf-faint">
                          {timeAgo(alert.createdAt)}
                        </span>
                      </div>
                      <div className="mt-1 text-[12px] text-sf-faint">
                        {(FAULT_TYPES[alert.faultType] &&
                          FAULT_TYPES[alert.faultType].label) ||
                          alert.faultType}
                      </div>
                    </Panel>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Work order queue — 1fr */}
      <div className="col-span-1">
        <WorkOrderQueue
          workOrders={workOrders}
          onCompleteWorkOrder={onCompleteWorkOrder}
        />
      </div>

      {scheduling && (
        <ScheduleMaintenanceModal
          alert={scheduling}
          onClose={() => setScheduling(null)}
          onConfirm={handleConfirmSchedule}
        />
      )}
    </div>
  );
}
