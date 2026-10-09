import { Wrench } from 'lucide-react';
import { MACHINES, SENSOR_META } from '../simulation/engine';
import { KpiCard, Panel, StatusChip, useMachineHealth } from './ui';
import IndustryFlow from './IndustryFlow';

const HEALTH_FILL = {
  critical: 'bg-sf-critical',
  warning: 'bg-sf-high',
  watch: 'bg-sf-medium',
};

function worstSensorLabel(machine, state) {
  if (!state || !state.sensors) return null;
  const lim = machine.limits;
  let worst = null;
  let worstRatio = 0;
  for (const key of ['temp', 'vib', 'rpm', 'load']) {
    const { hi, hihi } = lim[key];
    if (!hihi) continue;
    const v = state.sensors[key];
    const ratio = v / hihi;
    if (ratio > worstRatio) {
      worstRatio = ratio;
      worst = { key, value: v };
    }
  }
  if (!worst) return null;
  const meta = SENSOR_META[worst.key];
  return { text: `${meta.label} ${worst.value.toFixed(meta.decimals)} ${meta.unit}`, overHi: worstRatio >= 1 };
}

export default function Dashboard({ machineState, alerts, onSimulateFault, onNavigate }) {
  const health = useMachineHealth(machineState);

  const ids = MACHINES.map((m) => m.id);
  const onlineCount = ids.filter(
    (id) => health[id] && health[id].health.status !== 'maintenance'
  ).length;
  const avgHealth =
    ids.length > 0
      ? Math.round(
          ids.reduce((sum, id) => sum + (health[id] ? health[id].health.score : 0), 0) / ids.length
        )
      : 0;
  const activeAlerts = alerts ? alerts.length : 0;
  const avgLoad =
    ids.length > 0
      ? ids.reduce((sum, id) => sum + (machineState[id] && machineState[id].sensors ? machineState[id].sensors.load : 0), 0) / ids.length
      : 0;
  const estEnergy = ids
    .reduce(
      (sum, id) =>
        sum + (machineState[id] && machineState[id].sensors ? (machineState[id].sensors.load / 100) * 15 : 0),
      0
    )
    .toFixed(1);

  const allBlocked = ids.every(
    (id) =>
      (machineState[id] && machineState[id].fault) ||
      (machineState[id] && machineState[id].maintenance)
  );

  const sinceSec = (st) => {
    if (!st || !st.updatedAt) return 0;
    return Math.max(0, Math.round((Date.now() - st.updatedAt) / 1000));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-semibold text-sf-text">Factory Overview</h2>
          <div className="text-[11px] text-sf-faint font-mono tnum">
            {new Date().toLocaleString()}
          </div>
        </div>
        <button
          onClick={onSimulateFault}
          disabled={allBlocked}
          className="flex items-center gap-2 text-[13px] px-3 py-1.5 rounded border border-sf-border bg-sf-panel2 text-sf-text hover:bg-sf-border disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Wrench size={14} />
          Simulate Fault
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <KpiCard
          label="Machines Online"
          value={onlineCount}
          unit={`/ ${ids.length}`}
          timestamp={0}
        />
        <KpiCard label="Avg Health" value={avgHealth} unit="%" timestamp={0} />
        <KpiCard
          label="Active Alerts"
          value={activeAlerts}
          unit=""
          timestamp={0}
          status={activeAlerts > 0 ? 'critical' : null}
        />
        <KpiCard label="Avg Motor Load" value={avgLoad.toFixed(1)} unit="%" timestamp={0} />
        <KpiCard label="Est. Energy" value={estEnergy} unit="kW" timestamp={0} />
      </div>

      {/* Machine status grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {MACHINES.map((m) => {
          const st = machineState[m.id] || {};
          const h = health[m.id] || { health: { score: 0, status: 'running' } };
          const { score, status } = h.health;
          const worst = worstSensorLabel(m, st);
          const fillCls = HEALTH_FILL[status] || 'bg-sf-muted';
          return (
            <Panel
              key={m.id}
              title={m.name}
              right={<StatusChip status={status} flash={status === 'critical'} />}
              className="cursor-pointer hover:border-sf-muted"
            >
              <div onClick={() => onNavigate && onNavigate('machines')} className="space-y-3">
                <div className="font-mono tnum text-[11px] text-sf-muted">{m.id}</div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-sf-muted">Health</span>
                    <span className="font-mono tnum text-[13px] text-sf-text">{score}</span>
                  </div>
                  <div className="h-1.5 bg-sf-border rounded-full overflow-hidden">
                    <div className={`h-full ${fillCls}`} style={{ width: `${score}%` }} />
                  </div>
                </div>
                {worst && (
                  <div
                    className={`font-mono tnum text-[12px] ${
                      worst.overHi ? 'text-sf-high' : 'text-sf-muted'
                    }`}
                  >
                    {worst.text}
                  </div>
                )}
              </div>
            </Panel>
          );
        })}
      </div>

      {/* Material flow */}
      <IndustryFlow />
    </div>
  );
}
