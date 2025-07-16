
import React, { useEffect, useRef } from 'react';
import { TerminalIcon } from './icons';

interface LogPanelProps {
  logs: string[];
}

const LogPanel: React.FC<LogPanelProps> = ({ logs }) => {
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

  return (
    <div className="bg-gray-900/80 rounded-xl border border-gray-700 shadow-lg flex flex-col flex-grow min-h-0">
      <div className="flex items-center gap-3 p-4 border-b border-gray-700 flex-shrink-0">
        <TerminalIcon />
        <h2 className="text-xl font-bold text-gray-300">Execution Log</h2>
      </div>
      <div ref={logContainerRef} className="p-4 font-mono text-xs text-gray-400 overflow-y-auto flex-grow">
        {logs.map((log, index) => (
          <p key={index} className="animate-fade-in whitespace-pre-wrap">
            <span className="text-gray-500 mr-2">{'>'}</span>
            {log}
          </p>
        ))}
         {logs.length === 0 && <p className="text-gray-500">Workflow logs will appear here...</p>}
      </div>
    </div>
  );
};

export default LogPanel;
