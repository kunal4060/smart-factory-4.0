/**
 * Analytics.jsx — Fleet-level KPI trends derived from machine histories.
 * Props: { machineState }
 */
import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  AreaChart,
  BarChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { MACHINES } from '../simulation/engine';
import { Panel, PanelHeader } from './ui';

const TICK_MINUTES = 2 / 60; // 2s cadence
const RANGES = [30, 60, 120];

const TOOLTIP_STYLE = {
  backgroundColor: '#1b1f23',
  border: '1px solid #2a2f36',
  fontSize: 12,
};
const TICK_STYLE = { fill: '#9aa3af', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" };

/** Build per-reading fleet series over the last `range` points. */
function buildSeries(machineState, range) {
  const len = Math.max(
    0,
    ...MACHINES.map((m) => (machineState[m.id]?.history || []).length),
  );
  const n = Math.min(range, len);
  const points = [];
  let downtime = 0;
  for (let i = n - 1; i >= 0; i--) {
    let output = 0;
    let energy = 0;
    let loadSum = 0;
    let vibSum = 0;
    let machines = 0;
    let anyMaint = false;
    for (const m of MACHINES) {
      const st = machineState[m.id];
      const h = (st?.history || []).slice(-n);
      const r = h[n - 1 - i];
      if (!r) continue;
      machines += 1;
      output += r.rpm > 0 ? (r.rpm / 60) * 0.5 : r.load * 0.8;
      energy += (r.load / 100) * 15;
      loadSum += r.load;
      vibSum += r.vib;
      if (st?.maintenance) anyMaint = true;
    }
    if (anyMaint) downtime += TICK_MINUTES;
    const avgLoad = machines ? loadSum / machines : 0;
    const avgVib = machines ? vibSum / machines : 0;
    const idx = n - 1 - i;
    points.push({
      i: idx,
      label: idx === n - 1 ? 'now' : `-${n - 1 - idx}`,
      output: Math.round(output * 10) / 10,
      efficiency: Math.round((84 + (avgLoad / 100) * 6) * 10) / 10,
      defects: Math.round((0.4 + Math.min(2.1, avgVib * 0.4)) * 100) / 100,
      energy: Math.round(energy * 10) / 10,
      downtime: Math.round(downtime * 100) / 100,
    });
  }
  return points;
}

function Axes({ unit }) {
  return (
    <>
      <CartesianGrid stroke="#2a2f36" strokeDasharray="3 3" vertical={false} />
      <XAxis
        dataKey="label"
        tick={TICK_STYLE}
        axisLine={{ stroke: '#2a2f36' }}
        tickLine={false}
        minTickGap={40}
      />
      <YAxis
        tick={TICK_STYLE}
        axisLine={false}
        tickLine={false}
        width={48}
        domain={['auto', 'auto']}
        tickFormatter={(v) => (unit ? `${v}${unit}` : v)}
      />
      <Tooltip
        contentStyle={TOOLTIP_STYLE}
        labelStyle={{ color: '#9aa3af' }}
        formatter={(v) => [<span className="font-mono tnum">{v}</span>, '']}
      />
    </>
  );
}

function OutputChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid stroke="#2a2f36" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={TICK_STYLE}
          axisLine={{ stroke: '#2a2f36' }}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          tick={TICK_STYLE}
          axisLine={false}
          tickLine={false}
          width={48}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={{ color: '#9aa3af' }}
          formatter={(v) => [<span className="font-mono tnum">{v} units/hr</span>, '']}
        />
        <ReferenceLine
          y={120}
          stroke="#4da3ff"
          strokeDasharray="4 4"
          label={{
            value: 'target 120',
            fill: '#4da3ff',
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            position: 'insideTopRight',
          }}
        />
        <Area
          type="monotone"
          dataKey="output"
          name="Output (units/hr)"
          stroke="#9aa3af"
          strokeWidth={1.5}
          fill="#2a2f36"
          fillOpacity={0.25}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function EfficiencyChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <Axes unit="%" />
        <ReferenceLine y={85} stroke="#ec8629" strokeDasharray="4 4" />
        <Line
          type="monotone"
          dataKey="efficiency"
          name="Efficiency (%)"
          stroke="#9aa3af"
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function DefectChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <Axes unit="%" />
        <ReferenceLine y={2.0} stroke="#ec8629" strokeDasharray="4 4" />
        <Bar dataKey="defects" name="Defect rate (%)" fill="#5c6570" maxBarSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EnergyChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid stroke="#2a2f36" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={TICK_STYLE}
          axisLine={{ stroke: '#2a2f36' }}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          tick={TICK_STYLE}
          axisLine={false}
          tickLine={false}
          width={48}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={{ color: '#9aa3af' }}
          formatter={(v) => [<span className="font-mono tnum">{v} kW</span>, '']}
        />
        <ReferenceLine y={55} stroke="#ec8629" strokeDasharray="4 4" />
        <Area
          type="monotone"
          dataKey="energy"
          name="Energy (kW)"
          stroke="#9aa3af"
          strokeWidth={1.5}
          fill="#2a2f36"
          fillOpacity={0.25}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function Analytics({ machineState }) {
  const [range, setRange] = useState(120);
  const data = useMemo(() => buildSeries(machineState, range), [machineState, range]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[12px] text-sf-faint">Time range</span>
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={`px-2.5 py-1 text-[12px] font-mono tnum border rounded transition-colors ${
              range === r
                ? 'bg-sf-panel2 border-sf-border text-sf-text'
                : 'bg-transparent border-transparent text-sf-faint hover:text-sf-muted'
            }`}
          >
            {r} readings
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Panel>
          <PanelHeader title="Production Output" />
          <div className="p-2">
            <OutputChart data={data} />
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Efficiency" />
          <div className="p-2">
            <EfficiencyChart data={data} />
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Defect Rate" />
          <div className="p-2">
            <DefectChart data={data} />
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Energy Consumption" />
          <div className="p-2">
            <EnergyChart data={data} />
          </div>
        </Panel>
      </div>
    </div>
  );
}
