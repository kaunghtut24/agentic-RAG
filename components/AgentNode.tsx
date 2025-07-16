
import React from 'react';
import { AgentState, AgentStatus } from '../types';
import { CheckCircleIcon, XCircleIcon, ClockIcon, PlayCircleIcon, CircleDotIcon } from './icons';

interface AgentNodeProps {
  agent: AgentState;
}

const statusStyles: { [key in AgentStatus]: { icon: React.ReactNode; bg: string; text: string } } = {
  [AgentStatus.Idle]: { icon: <ClockIcon />, bg: 'bg-gray-600/30 border-gray-600', text: 'text-gray-400' },
  [AgentStatus.Running]: { icon: <PlayCircleIcon className="animate-pulse-fast" />, bg: 'bg-blue-900/50 border-blue-500', text: 'text-blue-300' },
  [AgentStatus.Completed]: { icon: <CheckCircleIcon />, bg: 'bg-green-900/50 border-green-500', text: 'text-green-300' },
  [AgentStatus.Failed]: { icon: <XCircleIcon />, bg: 'bg-red-900/50 border-red-500', text: 'text-red-400' },
  [AgentStatus.Skipped]: { icon: <CircleDotIcon />, bg: 'bg-yellow-900/50 border-yellow-600', text: 'text-yellow-400' },
};

const AgentNode: React.FC<AgentNodeProps> = ({ agent }) => {
  const { icon, bg, text } = statusStyles[agent.status];

  return (
    <div className={`w-full max-w-md p-4 rounded-lg border transition-all duration-300 shadow-md ${bg} animate-fade-in`}>
      <div className="flex items-center gap-4">
        <div className={`flex-shrink-0 text-2xl ${text}`}>{icon}</div>
        <div className="flex-grow">
          <h3 className={`font-bold ${text}`}>{agent.name}</h3>
          <p className="text-sm text-gray-400">{agent.description}</p>
          {agent.output && (
            <div className="mt-2 text-xs p-2 bg-gray-900/50 rounded-md text-gray-300 font-mono break-words">
              <span className="font-semibold text-gray-400">Output: </span>{agent.output}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentNode;
