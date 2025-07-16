import React, { useState } from 'react';

export interface HumanLoopOptions {
  currentResponse: string;
  confidence: number;
  justification: string;
  availableActions: string[];
}

interface ConfidenceDialogProps {
  isOpen: boolean;
  options: HumanLoopOptions | null;
  onAction: (action: string, data?: any) => void;
  onClose: () => void;
}

const ConfidenceDialog: React.FC<ConfidenceDialogProps> = ({ 
  isOpen, 
  options, 
  onAction, 
  onClose 
}) => {
  const [feedbackText, setFeedbackText] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);

  if (!isOpen || !options) return null;

  const handleRefineQuery = () => {
    setShowFeedbackInput(true);
  };

  const handleSubmitFeedback = () => {
    if (feedbackText.trim()) {
      onAction('refine_query', feedbackText);
      setFeedbackText('');
      setShowFeedbackInput(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 75) return 'text-green-400';
    if (confidence >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-600 shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="text-2xl">⚠️</div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Low Confidence Response
                </h3>
                <p className={`text-lg font-semibold ${getConfidenceColor(options.confidence)}`}>
                  Confidence: {options.confidence}%
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Issue Description */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-300 mb-2">Issue Identified:</h4>
            <div className="bg-gray-700/50 p-4 rounded-lg border-l-4 border-yellow-400">
              <p className="text-gray-200">{options.justification}</p>
            </div>
          </div>

          {/* Current Response Preview */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-300 mb-2">Current Response Preview:</h4>
            <div className="bg-gray-700 p-4 rounded-lg max-h-40 overflow-y-auto">
              <p className="text-sm text-gray-300 leading-relaxed">
                {options.currentResponse.length > 500 
                  ? `${options.currentResponse.substring(0, 500)}...` 
                  : options.currentResponse
                }
              </p>
            </div>
          </div>

          {/* Feedback Input (conditional) */}
          {showFeedbackInput && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-300 mb-2">
                How should we improve the query?
              </h4>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="E.g., 'Focus more on recent trends and include pricing data' or 'Add information about major trading partners'"
                className="w-full h-24 bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none resize-none"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSubmitFeedback}
                  disabled={!feedbackText.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-white font-medium transition-colors"
                >
                  Apply Refinement
                </button>
                <button
                  onClick={() => {
                    setShowFeedbackInput(false);
                    setFeedbackText('');
                  }}
                  className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-white font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!showFeedbackInput && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-300">Choose an action to improve the response:</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button 
                  onClick={handleRefineQuery}
                  className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg text-white font-medium transition-colors text-left"
                >
                  <span className="text-xl">🔍</span>
                  <div>
                    <div className="font-semibold">Refine Query</div>
                    <div className="text-sm text-blue-200">Provide feedback to improve the search</div>
                  </div>
                </button>

                <button 
                  onClick={() => onAction('search_web')}
                  className="flex items-center gap-3 bg-green-600 hover:bg-green-700 px-4 py-3 rounded-lg text-white font-medium transition-colors text-left"
                >
                  <span className="text-xl">🌐</span>
                  <div>
                    <div className="font-semibold">Search Web</div>
                    <div className="text-sm text-green-200">Add external web search results</div>
                  </div>
                </button>

                <button 
                  onClick={() => onAction('add_context')}
                  className="flex items-center gap-3 bg-purple-600 hover:bg-purple-700 px-4 py-3 rounded-lg text-white font-medium transition-colors text-left"
                >
                  <span className="text-xl">📄</span>
                  <div>
                    <div className="font-semibold">Add Context</div>
                    <div className="text-sm text-purple-200">Upload more documents or add manual context</div>
                  </div>
                </button>

                <button 
                  onClick={() => onAction('manual_improvement')}
                  className="flex items-center gap-3 bg-orange-600 hover:bg-orange-700 px-4 py-3 rounded-lg text-white font-medium transition-colors text-left"
                >
                  <span className="text-xl">✏️</span>
                  <div>
                    <div className="font-semibold">Manual Enhancement</div>
                    <div className="text-sm text-orange-200">Provide specific improvements</div>
                  </div>
                </button>
              </div>

              {/* Accept Response Option */}
              <div className="border-t border-gray-600 pt-4">
                <button 
                  onClick={() => onAction('accept_response')}
                  className="w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 px-4 py-3 rounded-lg text-white font-medium transition-colors"
                >
                  <span className="text-xl">✅</span>
                  Accept Response Anyway
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfidenceDialog;