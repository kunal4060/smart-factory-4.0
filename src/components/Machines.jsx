import { Wrench } from 'lucide-react';
import { LineChart, Line, ReferenceLine, ResponsiveContainer } from 'recharts';
import { MACHINES, SENSOR_META, rulHours } from '../simulation/engine';
import { Panel, SensorRow, StatusChip, useMachineHealth } from './ui';

const SENSOR_KEYS = ['temp', 'vib', 'rpm', 'load'];

function VibrationSpark({ history, hi }) {
  const data = (history || []).slice(-60).map((h) => ({ v: h.vib }));
  return (
    <ResponsiveContainer width="100%" height={64}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke="#9aa3af"
          strokeWidth={1}
          dot={false}
          isAnimationActive={false}
        />
        {hi > 0 && <ReferenceLine y={hi} stroke="#ec8629" strokeDasharray="4 3" />}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function Machines({ machineState, selectedMachine, onSelectMachine, onSimulateFault }) {
  const health = useMachineHealth(machineState);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {MACHINES.map((m) => {
        const st = machineState[m.id] || {};
        const h = health[m.id] || { detection: { probability: 0 }, health: { score: 0, status: 'running' } };
        const { score, status } = h.health;
        const rul = rulHours(h.detection.probability);
        const selected = selectedMachine === m.id;
        const blocked = !!(st.fault || st.maintenance);

        return (
          <Panel
            key={m.id}
            className={selected ? '!border-sf-info cursor-pointer' : 'cursor-pointer'}
          >
            {/* Header */}
            <div onClick={() => onSelectMachine && onSelectMachine(m.id)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[14px] font-semibold text-sf-text">{m.name}</div>
                  <div className="mt-0.5">
                    <span className="font-mono tnum text-[11px] text-sf-muted">{m.id}</span>
                    <span className="text-[11px] text-sf-faint ml-2">{m.type}</span>
                  </div>
                </div>
                <StatusChip status={status} flash={status === 'critical'} />
              </div>

              {/* Health + RUL */}
              <div className="flex items-center gap-3 mt-3">
                <span className="font-mono tnum text-[13px] text-sf-text">
                  Health {score}
                </span>
                {rul != null && (
                  <span className="inline-flex items-center rounded-full border border-sf-border bg-sf-panel2 px-2.5 py-0.5 text-[12px] font-mono tnum text-sf-muted">
                    RUL ~{rul}h
                  </span>
                )}
              </div>
            </div>

            {/* Sensors */}
            <div className="mt-2">
              {SENSOR_KEYS.map((key) => {
                const meta = SENSOR_META[key];
                if (key === 'rpm' && m.base.rpm === 0) {
                  return (
                    <SensorRow
                      key={key}
                      label={meta.label}
                      value="—"
                      unit=""
                      hi={m.limits[key].hi}
                      hihi={m.limits[key].hihi}
                    />
                  );
                }
                const v = st.sensors ? st.sensors[key] : 0;
                return (
                  <SensorRow
                    key={key}
                    label={meta.label}
                    value={v}
                    unit={meta.unit}
                    decimals={meta.decimals}
                    hi={m.limits[key].hi}
                    hihi={m.limits[key].hihi}
                  />
                );
              })}
            </div>

            {/* Vibration history */}
            <div className="mt-3">
              <div className="text-[11px] text-sf-muted mb-1">Vibration history</div>
              <VibrationSpark history={st.history} hi={m.limits.vib.hi} />
            </div>

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-sf-border">
              {st.maintenance ? (
                <span className="inline-flex items-center rounded-full border border-sf-border bg-sf-panel2 px-2.5 py-0.5 text-[12px] font-medium text-sf-info">
                  Under maintenance
                </span>
              ) : (
                <button
                  onClick={() => onSimulateFault && onSimulateFault(m.id)}
                  disabled={blocked}
                  className="flex items-center gap-2 text-[12px] px-3 py-1.5 rounded border border-sf-border bg-sf-panel2 text-sf-text hover:bg-sf-border disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Wrench size={13} />
                  Simulate Fault
                </button>
              )}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
