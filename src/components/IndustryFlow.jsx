/**
 * IndustryFlow.jsx — Industry 4.0 data-flow strip (self-contained, no props).
 * Intended for embedding at the bottom of the Dashboard.
 */
import {
  Radio,
  Cpu,
  Database,
  Cloud,
  BrainCircuit,
  GitBranch,
  Bot,
  ArrowRight,
} from 'lucide-react';
import { Panel, PanelHeader } from './ui';

const NODES = [
  { icon: Radio, label: 'Sensors', caption: '2s cadence' },
  { icon: Cpu, label: 'IoT Gateway', caption: 'MQTT' },
  { icon: Database, label: 'Data Collection', caption: '120-pt buffer' },
  { icon: Cloud, label: 'Cloud', caption: 'simulated' },
  { icon: BrainCircuit, label: 'AI Analytics', caption: 'z-score' },
  { icon: GitBranch, label: 'Decisions', caption: 'work orders' },
  { icon: Bot, label: 'Automation', caption: 'closed loop' },
];

export default function IndustryFlow() {
  return (
    <Panel>
      <PanelHeader title="Industry 4.0 Data Flow" />
      <div className="p-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {NODES.map((n, i) => {
            const Icon = n.icon;
            return (
              <div key={n.label} className="flex items-center gap-2 shrink-0">
                <div className="bg-sf-panel2 border border-sf-border rounded p-3 text-center w-32">
                  <Icon size={20} className="mx-auto text-sf-muted" strokeWidth={1.5} />
                  <div className="mt-2 text-[12px] font-medium text-sf-text">{n.label}</div>
                  <div className="mt-0.5 text-[10px] font-mono tnum text-sf-faint">
                    {n.caption}
                  </div>
                </div>
                {i < NODES.length - 1 && (
                  <ArrowRight size={16} className="text-sf-faint shrink-0" strokeWidth={1.5} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}
