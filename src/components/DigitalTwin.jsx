/**
 * DigitalTwin.jsx — Floor-plan SVG schematic with per-machine status,
 * plus a faceplate panel for the selected machine.
 * Props: { machineState, alerts, selectedMachine, onSelectMachine, onViewDetails }
 */
import { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { X } from 'lucide-react';
import { MACHINES, SENSOR_META, detectAnomalies, healthOf } from '../simulation/engine';
import { Panel, PanelHeader, StatusChip } from './ui';

const FILL = {
  running: '#3a4149',
  watch: '#f5e11b',
  warning: '#ec8629',
  critical: '#e22028',
  maintenance: '#4da3ff',
};

const CHIP_MAP = {
  critical: { status: 'active', label: 'Critical' },
  warning: { status: 'default', label: 'Warning', className: 'text-sf-high' },
  watch: { status: 'default', label: 'Watch', className: 'text-sf-medium' },
  maintenance: { status: 'default', label: 'Maintenance', className: 'text-sf-info' },
  running: { status: 'resolved', label: 'Running' },
};

function machineStatus(machineState, id) {
  const st = machineState[id];
  if (!st?.sensors) return 'running';
  if (st.maintenance) return 'maintenance';
  const d = detectAnomalies(id, st);
  return healthOf(id, st, d).status;
}

function alertFor(id, alerts) {
  return (alerts || []).find(
    (a) =>
      (a.machineId === id || a.machine === id) &&
      !(a.acknowledged || a.ack || a.resolved) &&
      (a.severity === 'critical' || a.severity === 'Critical'),
  );
}

/** SVG shape per machine type, centered on m.x / m.y */
function MachineShape({ m, status, flashing }) {
  const fill = FILL[status] || FILL.running;
  const cls = flashing ? 'sf-alarm-flash' : undefined;
  const common = { fill, className: cls, style: { cursor: 'pointer' } };
  switch (m.type) {
    case 'CNC':
      return <rect x={m.x - 5} y={m.y - 3.5} width={10} height={7} rx={1} {...common} />;
    case 'ROBOT':
      return <circle cx={m.x} cy={m.y} r={3.5} {...common} />;
    case 'CONVEYOR':
      return <rect x={m.x - 7} y={m.y - 2} width={14} height={4} rx={1} {...common} />;
    case 'PRESS':
      return <rect x={m.x - 4} y={m.y - 4} width={8} height={8} rx={1} {...common} />;
    case 'MOLDER':
      return <rect x={m.x - 4.5} y={m.y - 3} width={9} height={6} rx={1} {...common} />;
    default:
      return <rect x={m.x - 4} y={m.y - 3} width={8} height={6} rx={1} {...common} />;
  }
}

function FloorPlan({ machineState, alerts, selectedMachine, onSelectMachine }) {
  return (
    <svg
      viewBox="0 0 100 72"
      className="w-full h-auto bg-sf-panel border border-sf-border rounded"
      role="img"
      aria-label="Factory floor plan"
    >
      {/* floor outline */}
      <rect x={1} y={1} width={98} height={70} fill="none" stroke="#2a2f36" strokeWidth={0.3} />
      {/* aisle grid */}
      {[18, 36, 54].map((y) => (
        <line key={y} x1={1} y1={y} x2={99} y2={y} stroke="#2a2f36" strokeWidth={0.15} strokeDasharray="1.5 1.5" />
      ))}
      {MACHINES.map((m) => {
        const status = machineStatus(machineState, m.id);
        const flashing = !!alertFor(m.id, alerts);
        const isSel = selectedMachine === m.id;
        return (
          <g key={m.id} onClick={() => onSelectMachine(m.id)} style={{ cursor: 'pointer' }}>
            {isSel && (
              <rect
                x={m.x - 8}
                y={m.y - 8}
                width={16}
                height={16}
                fill="none"
                stroke="#e6e9ee"
                strokeWidth={0.3}
                strokeDasharray="1 1"
                rx={1}
              />
            )}
            <MachineShape m={m} status={status} flashing={flashing} />
            {/* id label + status dot */}
            <text
              x={m.x}
              y={m.y + 6.5}
              textAnchor="middle"
              fill="#9aa3af"
              fontSize={2.2}
              fontFamily="'JetBrains Mono', monospace"
            >
              {m.id}
            </text>
            <circle cx={m.x} cy={m.y + 8.2} r={0.9} fill={FILL[status]} />
          </g>
        );
      })}
    </svg>
  );
}

function Faceplate({ machineState, selectedMachine, onSelectMachine, onViewDetails }) {
  const m = MACHINES.find((x) => x.id === selectedMachine);
  const st = m ? machineState[m.id] : null;
  const status = m ? machineStatus(machineState, m.id) : 'running';
  const chip = CHIP_MAP[status];
  const vibData = useMemo(
    () =>
      (st?.history || []).slice(-60).map((h, i) => ({ i, vib: Math.round(h.vib * 100) / 100 })),
    [st],
  );

  if (!m) return null;

  return (
    <Panel className="w-80 shrink-0">
      <PanelHeader
        title="Faceplate"
        right={
          <button
            type="button"
            onClick={() => onSelectMachine(null)}
            className="text-sf-faint hover:text-sf-muted"
            aria-label="Close faceplate"
          >
            <X size={14} />
          </button>
        }
      />
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[13px] font-medium text-sf-text">{m.name}</div>
            <div className="text-[11px] font-mono tnum text-sf-faint">{m.id}</div>
          </div>
          <StatusChip {...chip} />
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {Object.entries(SENSOR_META).map(([key, meta]) => {
            const v = st?.sensors?.[key];
            return (
              <div key={key} className="bg-sf-panel2 border border-sf-border rounded px-2 py-1.5">
                <div className="text-[10px] text-sf-faint">{meta.label}</div>
                <div className="text-[13px] font-mono tnum text-sf-text">
                  {v == null ? '--' : v.toFixed(meta.decimals)}{' '}
                  <span className="text-[10px] text-sf-faint">{meta.unit}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-[11px] text-sf-faint mb-1">Vibration trend</div>
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={vibData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#2a2f36" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="i" hide />
            <YAxis
              tick={{ fill: '#9aa3af', fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}
              axisLine={false}
              tickLine={false}
              width={30}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1b1f23', border: '1px solid #2a2f36', fontSize: 12 }}
              labelStyle={{ color: '#9aa3af' }}
              formatter={(v) => [<span className="font-mono tnum">{v} mm/s</span>, '']}
            />
            <Line type="monotone" dataKey="vib" stroke="#9aa3af" strokeWidth={1.25} dot={false} />
          </LineChart>
        </ResponsiveContainer>

        <button
          type="button"
          onClick={() => onViewDetails(m.id)}
          className="mt-3 w-full px-3 py-1.5 text-[12px] font-medium bg-sf-panel2 border border-sf-border rounded text-sf-text hover:border-sf-faint transition-colors"
        >
          Open in Machines
        </button>
      </div>
    </Panel>
  );
}

export default function DigitalTwin({
  machineState,
  alerts,
  selectedMachine,
  onSelectMachine,
  onViewDetails,
}) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-1 min-w-0">
        <FloorPlan
          machineState={machineState}
          alerts={alerts}
          selectedMachine={selectedMachine}
          onSelectMachine={onSelectMachine}
        />
      </div>
      {selectedMachine && (
        <Faceplate
          machineState={machineState}
          selectedMachine={selectedMachine}
          onSelectMachine={onSelectMachine}
          onViewDetails={onViewDetails}
        />
      )}
    </div>
  );
}
