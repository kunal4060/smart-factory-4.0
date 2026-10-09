/**
 * Assistant.jsx — Keyword-driven factory copilot (no API).
 * Props: { machineState, alerts, workOrders }
 */
import { useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { MACHINES, SENSOR_META, detectAnomalies, healthOf } from '../simulation/engine';
import { Panel, PanelHeader } from './ui';

const SUGGESTIONS = ['Fleet status', 'Any alerts?', 'Hottest machine', 'Help'];

/** Wrap numeric tokens in mono spans. */
function withMono(text) {
  const parts = String(text).split(/(\d+(?:\.\d+)?\s?(?:%|°C|mm\/s|RPM|kW|hrs?|min|units\/hr)?)/g);
  return parts.map((p, i) =>
    /^\d/.test(p) ? (
      <span key={i} className="font-mono tnum">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

function fmtSensor(key, value) {
  const meta = SENSOR_META[key];
  return `${value.toFixed(meta.decimals)} ${meta.unit}`;
}

function machineSummary(machineState, id) {
  const m = MACHINES.find((x) => x.id === id);
  const st = machineState[id];
  if (!m || !st?.sensors) return `${id}: no live data.`;
  const d = detectAnomalies(id, st);
  const h = healthOf(id, st, d);
  const status = st.maintenance ? 'maintenance' : h.status;
  const s = st.sensors;
  return `${id} (${m.name}) is ${status.toUpperCase()}, health ${h.score}%. ` +
    `Temperature ${fmtSensor('temp', s.temp)}, vibration ${fmtSensor('vib', s.vib)}, ` +
    `speed ${fmtSensor('rpm', s.rpm)}, load ${fmtSensor('load', s.load)}.`;
}

function answer(query, machineState, alerts, workOrders) {
  const q = query.toLowerCase();

  if (/(^|\s)(hi|hello|hey)\b/.test(q)) {
    return "Hello. I'm the factory assistant — ask me about machine status, sensors, alerts, or maintenance. Try 'help' for what I can do.";
  }
  if (q.includes('help') || q.includes('what can you')) {
    return 'I can answer: machine status (e.g. "status of CNC-01"), "fleet status", "hottest machine", "highest vibration", "any alerts", "work orders", "lowest health machine".';
  }

  // Direct machine-id mention takes priority
  const byId = MACHINES.find((m) => q.includes(m.id.toLowerCase()));
  if (byId) return machineSummary(machineState, byId.id);

  if (q.includes('temp')) {
    const rows = MACHINES.map((m) => ({ id: m.id, temp: machineState[m.id]?.sensors?.temp ?? -Infinity }));
    rows.sort((a, b) => b.temp - a.temp);
    const top = rows[0];
    const base = MACHINES.find((m) => m.id === top.id).limits.temp;
    return `Hottest machine: ${top.id} at ${fmtSensor('temp', top.temp)} ` +
      `(warning ${base.hi} °C / critical ${base.hihi} °C).`;
  }

  if (q.includes('vibration') || q.includes('vib')) {
    const rows = MACHINES.map((m) => ({ id: m.id, vib: machineState[m.id]?.sensors?.vib ?? -Infinity }));
    rows.sort((a, b) => b.vib - a.vib);
    const top = rows[0];
    const base = MACHINES.find((m) => m.id === top.id).limits.vib;
    return `Highest vibration: ${top.id} at ${fmtSensor('vib', top.vib)} ` +
      `(warning ${base.hi} mm/s / critical ${base.hihi} mm/s).`;
  }

  if (q.includes('alert')) {
    const active = (alerts || []).filter((a) => !(a.acknowledged || a.ack || a.resolved));
    if (!active.length) return 'No active alerts. All machines within normal thresholds.';
    const sevRank = { critical: 0, high: 1, medium: 2, warning: 3 };
    const sorted = [...active].sort(
      (a, b) => (sevRank[a.severity] ?? 9) - (sevRank[b.severity] ?? 9),
    );
    const top = sorted[0];
    const who = top.machineId || top.machine || 'unknown machine';
    return `${active.length} active alert${active.length === 1 ? '' : 's'}. ` +
      `Top severity: ${String(top.severity || 'n/a').toUpperCase()} on ${who} — ${top.message || top.title || 'no detail'}.`;
  }

  if (q.includes('work order') || q.includes('maintenance')) {
    const list = workOrders || [];
    if (!list.length) return 'No open work orders. Nothing scheduled for maintenance.';
    const lines = list.slice(0, 5).map((w) => {
      const id = w.id || w.key || 'WO';
      const machine = w.machineId || w.machine || 'unassigned';
      const type = w.type || w.faultType || 'general';
      const status = w.status || 'open';
      return `- ${id}: ${machine} — ${type} (${status})`;
    });
    return `${list.length} work order${list.length === 1 ? '' : 's'}:\n${lines.join('\n')}`;
  }

  if (q.includes('health')) {
    const rows = MACHINES.map((m) => {
      const st = machineState[m.id];
      const d = st?.sensors ? detectAnomalies(m.id, st) : { probability: 0 };
      const h = st?.sensors ? healthOf(m.id, st, d) : { score: 0 };
      return { id: m.id, score: h.score };
    });
    rows.sort((a, b) => a.score - b.score);
    const worst = rows[0];
    return `Lowest health: ${worst.id} at ${worst.score}%. All machines: ` +
      rows.map((r) => `${r.id} ${r.score}%`).join(', ') + '.';
  }

  if (q.includes('fleet') || q.includes('status') || q.includes('summary') || q.includes('overview')) {
    const counts = { running: 0, watch: 0, warning: 0, critical: 0, maintenance: 0 };
    for (const m of MACHINES) {
      const st = machineState[m.id];
      let status = 'running';
      if (st?.maintenance) status = 'maintenance';
      else if (st?.sensors) status = healthOf(m.id, st, detectAnomalies(m.id, st)).status;
      counts[status] = (counts[status] || 0) + 1;
    }
    const activeAlerts = (alerts || []).filter((a) => !(a.acknowledged || a.ack || a.resolved)).length;
    return `Fleet of ${MACHINES.length} machines: ${counts.running} running, ${counts.watch} watch, ` +
      `${counts.warning} warning, ${counts.critical} critical, ${counts.maintenance} in maintenance. ` +
      `${activeAlerts} active alert${activeAlerts === 1 ? '' : 's'}.`;
  }

  return "I can answer about machine status, sensors, alerts, and maintenance. Try 'status of CNC-01' or 'help'.";
}

export default function Assistant({ machineState, alerts, workOrders }) {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: "Factory assistant online. Ask me about machines, sensors, alerts, or maintenance — or tap a suggestion below.",
    },
  ]);
  const [input, setInput] = useState('');
  const boxRef = useRef(null);

  const botAnswer = useMemo(
    () => (q) => answer(q, machineState, alerts, workOrders),
    [machineState, alerts, workOrders],
  );

  const send = (text) => {
    const clean = String(text || '').trim();
    if (!clean) return;
    const reply = botAnswer(clean);
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: clean },
      { role: 'bot', text: reply },
    ]);
    setInput('');
    requestAnimationFrame(() => {
      const el = boxRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  return (
    <Panel className="max-w-2xl">
      <PanelHeader title="Factory Assistant" />
      <div ref={boxRef} className="h-[420px] overflow-y-auto p-3 space-y-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded text-[13px] whitespace-pre-line leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-sf-panel border border-sf-border text-sf-text'
                  : 'bg-sf-panel2 border border-sf-border text-sf-muted'
              }`}
            >
              {withMono(msg.text)}
            </div>
          </div>
        ))}
      </div>

      <div className="px-3 pb-2 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => send(s)}
            className="px-2 py-1 text-[11px] border border-sf-border rounded text-sf-muted hover:text-sf-text hover:bg-sf-panel2 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 p-3 border-t border-sf-border">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send(input);
          }}
          placeholder="Ask about a machine, sensor, alert..."
          className="flex-1 bg-sf-bg border border-sf-border rounded px-3 py-2 text-[13px] text-sf-text placeholder:text-sf-faint focus:outline-none focus:border-sf-faint"
        />
        <button
          type="button"
          onClick={() => send(input)}
          className="px-3 py-2 bg-sf-panel2 border border-sf-border rounded text-sf-text hover:border-sf-faint transition-colors"
          aria-label="Send message"
        >
          <Send size={14} />
        </button>
      </div>
    </Panel>
  );
}
