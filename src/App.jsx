import { useEffect, useRef, useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Machines from './components/Machines';
import Maintenance from './components/Maintenance';
import Analytics from './components/Analytics';
import DigitalTwin from './components/DigitalTwin';
import Assistant from './components/Assistant';
import {
  MACHINES,
  FAULT_TYPES,
  tickSensors,
  detectAnomalies,
  pickFaultType,
} from './simulation/engine';

// Seed with enough ticks that histories/sparklines are meaningful on load.
function seedState() {
  let s = {};
  for (let i = 0; i < 40; i++) s = tickSensors(s);
  return s;
}

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [machineState, setMachineState] = useState(seedState);
  const [alerts, setAlerts] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);

  const stateRef = useRef(machineState);
  const alertsRef = useRef(alerts);
  const workOrdersRef = useRef(workOrders);
  const alertSeq = useRef(1);
  const woSeq = useRef(1042);

  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);
  useEffect(() => {
    workOrdersRef.current = workOrders;
  }, [workOrders]);

  // 2s simulation tick + anomaly scan → alert generation
  useEffect(() => {
    const id = setInterval(() => {
      const next = tickSensors(stateRef.current);
      stateRef.current = next;
      setMachineState(next);

      const fresh = [];
      for (const m of MACHINES) {
        const st = next[m.id];
        if (!st || st.maintenance) continue;
        const det = detectAnomalies(m.id, st);
        if (det.probability >= 45 && det.anomalies.length > 0) {
          const dup = alertsRef.current.some(
            (a) => a.machineId === m.id && a.status === 'active',
          );
          if (dup) continue;
          const faultType = pickFaultType(det.anomalies);
          fresh.push({
            id: `AL-${String(alertSeq.current++).padStart(3, '0')}`,
            machineId: m.id,
            severity:
              det.probability >= 75 ? 'critical' : det.probability >= 60 ? 'high' : 'medium',
            faultType,
            probability: det.probability,
            evidence: det.anomalies,
            recommendation: FAULT_TYPES[faultType].recommendation,
            status: 'active',
            createdAt: Date.now(),
          });
        }
      }
      if (fresh.length > 0) setAlerts((prev) => [...fresh, ...prev]);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const simulateFault = (machineId) => {
    const pool = MACHINES.filter((m) => {
      const st = stateRef.current[m.id];
      const ok = !st?.fault && !st?.maintenance;
      return machineId ? ok && m.id === machineId : ok;
    });
    if (pool.length === 0) return;
    const target = pool[Math.floor(Math.random() * pool.length)];
    const types = Object.keys(FAULT_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    const next = {
      ...stateRef.current,
      [target.id]: { ...stateRef.current[target.id], fault: { type, progress: 0 } },
    };
    stateRef.current = next;
    setMachineState(next);
  };

  const scheduleWorkOrder = (orderData) => {
    const wo = {
      id: `WO-${woSeq.current++}`,
      ...orderData,
      status: 'scheduled',
      createdAt: Date.now(),
    };
    setWorkOrders((prev) => [wo, ...prev]);
    const st = stateRef.current[orderData.machineId];
    const next = {
      ...stateRef.current,
      [orderData.machineId]: { ...st, maintenance: true },
    };
    stateRef.current = next;
    setMachineState(next);
    setAlerts((prev) =>
      prev.map((a) =>
        a.machineId === orderData.machineId && a.status === 'active'
          ? { ...a, status: 'acknowledged' }
          : a,
      ),
    );
  };

  const completeWorkOrder = (orderId) => {
    const wo = workOrdersRef.current.find((w) => w.id === orderId);
    setWorkOrders((prev) =>
      prev.map((w) => (w.id === orderId ? { ...w, status: 'done' } : w)),
    );
    if (wo) {
      const st = stateRef.current[wo.machineId];
      const next = {
        ...stateRef.current,
        [wo.machineId]: { ...st, fault: null, maintenance: false },
      };
      stateRef.current = next;
      setMachineState(next);
      setAlerts((prev) =>
        prev.map((a) =>
          a.machineId === wo.machineId && a.status !== 'resolved'
            ? { ...a, status: 'resolved' }
            : a,
        ),
      );
    }
  };

  const acknowledgeAlert = (id) =>
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'acknowledged' } : a)),
    );
  const resolveAlert = (id) =>
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'resolved' } : a)),
    );

  const viewDetails = (machineId) => {
    setSelectedMachine(machineId);
    setActiveView('machines');
  };

  const navigate = (view) => setActiveView(view);
  const activeAlerts = alerts.filter((a) => a.status === 'active').length;

  return (
    <Layout
      activeView={activeView}
      onNavigate={navigate}
      alertCount={activeAlerts}
    >
      {activeView === 'dashboard' && (
        <Dashboard
          machineState={machineState}
          alerts={alerts}
          onSimulateFault={() => simulateFault()}
          onNavigate={navigate}
        />
      )}
      {activeView === 'machines' && (
        <Machines
          machineState={machineState}
          selectedMachine={selectedMachine}
          onSelectMachine={setSelectedMachine}
          onSimulateFault={simulateFault}
        />
      )}
      {activeView === 'maintenance' && (
        <Maintenance
          alerts={alerts}
          workOrders={workOrders}
          machineState={machineState}
          onAcknowledge={acknowledgeAlert}
          onResolve={resolveAlert}
          onViewDetails={viewDetails}
          onScheduleWorkOrder={scheduleWorkOrder}
          onCompleteWorkOrder={completeWorkOrder}
        />
      )}
      {activeView === 'analytics' && <Analytics machineState={machineState} />}
      {activeView === 'twin' && (
        <DigitalTwin
          machineState={machineState}
          alerts={alerts}
          selectedMachine={selectedMachine}
          onSelectMachine={setSelectedMachine}
          onViewDetails={viewDetails}
        />
      )}
      {activeView === 'assistant' && (
        <Assistant machineState={machineState} alerts={alerts} workOrders={workOrders} />
      )}
    </Layout>
  );
}
