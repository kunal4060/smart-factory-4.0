/**
 * Smart Factory 4.0 — Simulation Engine
 *
 * Generates realistic sensor data for factory machines, supports fault
 * injection for demos, and runs rule-based anomaly detection (z-score)
 * that powers the predictive-maintenance workflow.
 *
 * Sensors per machine: temperature (°C), vibration (mm/s), rpm, motorLoad (%)
 */

// ---------------------------------------------------------------------------
// Machine definitions
// ---------------------------------------------------------------------------
export const MACHINES = [
  {
    id: 'CNC-01', name: 'CNC Milling Center', type: 'CNC', x: 12, y: 22,
    base: { temp: 62, vib: 1.8, rpm: 3200, load: 68 },
    spread: { temp: 2.5, vib: 0.35, rpm: 45, load: 5 },
    limits: { temp: { hi: 85, hihi: 95 }, vib: { hi: 4.5, hihi: 7 }, rpm: { hi: 3800, hihi: 4200 }, load: { hi: 92, hihi: 98 } },
  },
  {
    id: 'CNC-02', name: 'CNC Turning Center', type: 'CNC', x: 32, y: 22,
    base: { temp: 58, vib: 1.5, rpm: 2800, load: 61 },
    spread: { temp: 2.2, vib: 0.3, rpm: 40, load: 4.5 },
    limits: { temp: { hi: 85, hihi: 95 }, vib: { hi: 4.5, hihi: 7 }, rpm: { hi: 3400, hihi: 3800 }, load: { hi: 92, hihi: 98 } },
  },
  {
    id: 'RBT-01', name: 'Assembly Robot Arm', type: 'ROBOT', x: 55, y: 30,
    base: { temp: 48, vib: 0.9, rpm: 0, load: 42 },
    spread: { temp: 1.8, vib: 0.2, rpm: 0, load: 6 },
    limits: { temp: { hi: 70, hihi: 80 }, vib: { hi: 3.0, hihi: 5 }, rpm: { hi: 0, hihi: 0 }, load: { hi: 88, hihi: 95 } },
  },
  {
    id: 'CNV-01', name: 'Conveyor Line A', type: 'CONVEYOR', x: 72, y: 55,
    base: { temp: 44, vib: 2.2, rpm: 1450, load: 55 },
    spread: { temp: 1.5, vib: 0.4, rpm: 25, load: 4 },
    limits: { temp: { hi: 65, hihi: 75 }, vib: { hi: 5.5, hihi: 8 }, rpm: { hi: 1700, hihi: 1900 }, load: { hi: 90, hihi: 97 } },
  },
  {
    id: 'PRS-01', name: 'Hydraulic Press', type: 'PRESS', x: 30, y: 62,
    base: { temp: 71, vib: 2.8, rpm: 0, load: 74 },
    spread: { temp: 3.0, vib: 0.5, rpm: 0, load: 5.5 },
    limits: { temp: { hi: 95, hihi: 105 }, vib: { hi: 6.0, hihi: 9 }, rpm: { hi: 0, hihi: 0 }, load: { hi: 94, hihi: 99 } },
  },
  {
    id: 'INJ-01', name: 'Injection Molder', type: 'MOLDER', x: 58, y: 68,
    base: { temp: 178, vib: 1.2, rpm: 850, load: 63 },
    spread: { temp: 4.0, vib: 0.25, rpm: 20, load: 4 },
    limits: { temp: { hi: 210, hihi: 225 }, vib: { hi: 3.5, hihi: 5.5 }, rpm: { hi: 1050, hihi: 1200 }, load: { hi: 90, hihi: 97 } },
  },
];

export const SENSOR_META = {
  temp: { label: 'Temperature', unit: '°C', decimals: 1 },
  vib: { label: 'Vibration', unit: 'mm/s', decimals: 2 },
  rpm: { label: 'Speed', unit: 'RPM', decimals: 0 },
  load: { label: 'Motor Load', unit: '%', decimals: 1 },
};

export const FAULT_TYPES = {
  bearing: {
    label: 'Bearing outer-race defect',
    recommendation: 'Replace bearing assembly during next planned stop. Inspect lubrication lines.',
    technician: 'Mechanical',
  },
  overheat: {
    label: 'Cooling system degradation',
    recommendation: 'Inspect coolant flow and heat exchanger. Clean filters.',
    technician: 'Mechanical',
  },
  overload: {
    label: 'Motor overload condition',
    recommendation: 'Reduce feed rate 15%. Check for tool wear or material jam.',
    technician: 'Electrical',
  },
  misalignment: {
    label: 'Shaft misalignment developing',
    recommendation: 'Schedule laser alignment. Check coupling condition.',
    technician: 'Mechanical',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const randn = () => {
  // Box-Muller gaussian
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------------------
// Sensor tick — one reading per machine
// ---------------------------------------------------------------------------
export function tickSensors(state) {
  const now = Date.now();
  const next = {};
  for (const m of MACHINES) {
    const s = state[m.id] || {};
    const fault = s.fault; // null | { type, progress 0..1 }
    const r = {};
    for (const key of ['temp', 'vib', 'rpm', 'load']) {
      let v = m.base[key] + randn() * m.spread[key];
      if (fault) {
        // Fault signature grows with progress: vibration + temp climb
        const p = fault.progress;
        if (key === 'vib') v += p * m.spread.vib * 14;
        if (key === 'temp') v += p * m.spread.temp * 9;
        if (key === 'load') v += p * m.spread.load * 3.5;
        if (key === 'rpm' && m.base.rpm > 0) v -= p * m.base.rpm * 0.06;
      }
      if (key === 'rpm' && m.base.rpm === 0) v = 0;
      r[key] = Math.max(0, v);
    }
    // advance fault
    let faultNext = fault;
    if (fault && fault.progress < 1) {
      faultNext = { ...fault, progress: Math.min(1, fault.progress + 0.04) };
    }
    const hist = [...(s.history || []), { t: now, ...r }].slice(-120);
    next[m.id] = { ...s, sensors: r, history: hist, fault: faultNext, updatedAt: now };
  }
  return next;
}

// ---------------------------------------------------------------------------
// Anomaly detection — z-score over rolling history
// ---------------------------------------------------------------------------
export function detectAnomalies(machineId, machineState) {
  const m = MACHINES.find((x) => x.id === machineId);
  const hist = machineState.history || [];
  if (hist.length < 10) return { score: 0, anomalies: [], probability: 0 };

  const anomalies = [];
  let score = 0;
  for (const key of ['temp', 'vib', 'load']) {
    const vals = hist.map((h) => h[key]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length) || 1e-6;
    const cur = machineState.sensors[key];
    const z = (cur - mean) / sd;
    // trend: last-5 mean vs first-5 mean of window
    const recent = vals.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const older = vals.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const trend = sd > 0 ? (recent - older) / sd : 0;

    const lim = m.limits[key];
    let level = null;
    if (cur >= lim.hihi) level = 'critical';
    else if (cur >= lim.hi) level = 'high';
    else if (z > 3) level = 'medium';

    if (level) {
      anomalies.push({ sensor: key, z: +z.toFixed(2), trend: +trend.toFixed(2), level, value: cur });
      score += level === 'critical' ? 45 : level === 'high' ? 28 : 12;
    } else if (z > 2) {
      score += 4;
    }
    // rising trend adds risk even before thresholds
    if (trend > 1.5) score += 8;
  }
  const probability = clamp(Math.round(score), 0, 98);
  return { score, anomalies, probability };
}

// ---------------------------------------------------------------------------
// Health score 0–100 + status derivation
// ---------------------------------------------------------------------------
export function healthOf(machineId, machineState, detection) {
  if (machineState.maintenance) return { score: 100, status: 'maintenance' };
  const p = detection.probability;
  const score = clamp(100 - p, 0, 100);
  let status = 'running';
  if (p >= 75) status = 'critical';
  else if (p >= 45) status = 'warning';
  else if (p >= 20) status = 'watch';
  return { score: Math.round(score), status };
}

export function rulHours(probability) {
  // rough remaining-useful-life estimate
  if (probability < 20) return null;
  const h = Math.max(2, Math.round(120 - probability * 1.35));
  return h;
}

export function pickFaultType(anomalies) {
  const sensors = anomalies.map((a) => a.sensor);
  if (sensors.includes('vib')) return 'bearing';
  if (sensors.includes('temp')) return 'overheat';
  if (sensors.includes('load')) return 'overload';
  return 'misalignment';
}
