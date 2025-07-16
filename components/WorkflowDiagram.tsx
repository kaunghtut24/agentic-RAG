
import React from 'react';
import { AgentState } from '../types';
import AgentNode from './AgentNode';
import { ArrowDownIcon } from './icons';

interface WorkflowDiagramProps {
  agents: AgentState[];
}

const WorkflowDiagram: React.FC<WorkflowDiagramProps> = ({ agents }) => {
  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 shadow-lg h-full">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-300">Workflow Status</h2>
      <div className="flex flex-col items-center space-y-2">
        {agents.map((agent, index) => (
          <React.Fragment key={agent.id}>
            <AgentNode agent={agent} />
            {index < agents.length - 1 && (
              <div className="text-gray-600 my-1">
                <ArrowDownIcon />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default WorkflowDiagram;
