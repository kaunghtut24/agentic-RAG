
import React, { useState } from 'react';
import { SparklesIcon, ArrowRightIcon } from './icons';

interface QueryInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
  isConversationStarted: boolean;
}

const QueryInput: React.FC<QueryInputProps> = ({ onSubmit, isLoading, isConversationStarted }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSubmit(query.trim());
      setQuery(''); // Clear input after submission
    }
  };
  
  const sampleQueries = [
    "What is agentic RAG and how does it differ from traditional RAG?",
    "Explain the role of a 'Sufficiency Evaluation Agent' in an AI workflow.",
    "Who won the most recent F1 world championship?",
  ];

  const handleSampleQuery = (sample: string) => {
    setQuery(sample);
     if (sample.trim() && !isLoading) {
      onSubmit(sample.trim());
      setQuery('');
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-gray-800/50 rounded-xl p-4 shadow-lg border border-gray-700">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-shrink-0 text-blue-400">
          <SparklesIcon />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isConversationStarted ? "Ask a follow-up question..." : "Ask a question to start the workflow..."}
          className="w-full bg-gray-700 text-gray-200 placeholder-gray-400 px-4 py-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition duration-200"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition duration-200"
        >
          {isLoading ? 'Running...' : 'Send'}
          {!isLoading && <ArrowRightIcon />}
        </button>
      </form>
      {!isConversationStarted && (
        <div className="mt-4 flex flex-wrap justify-center gap-2 animate-fade-in">
            {sampleQueries.map((q, i) => (
                <button key={i} onClick={() => handleSampleQuery(q)} disabled={isLoading} className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-full transition duration-200 disabled:opacity-50">
                    {q}
                </button>
            ))}
        </div>
      )}
    </div>
  );
};

export default QueryInput;
