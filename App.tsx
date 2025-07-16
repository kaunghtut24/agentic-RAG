
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AgentState, AgentStatus, Source, DocumentChunk, ChatTurn, WorkflowState, HumanLoopOptions } from './types';
import { geminiService } from './services/geminiService';
import QueryInput from './components/QueryInput';
import WorkflowDiagram from './components/WorkflowDiagram';
import ResultsDisplay from './components/ResultsDisplay';
import LogPanel from './components/LogPanel';
import FileUploader from './components/FileUploader';
import ConfidenceDialog from './components/ConfidenceDialog';
import { AGENT_DESCRIPTIONS, CONFIDENCE_THRESHOLD } from './constants';
import { AppTitle, DatabaseIcon, PlusCircleIcon } from './components/icons';


const initialAgents: Record<string, AgentState> = {
  documentProcessing: { id: 'documentProcessing', name: '0. Document Processing', status: AgentStatus.Idle, output: null, description: AGENT_DESCRIPTIONS.documentProcessing },
  queryRefinement: { id: 'queryRefinement', name: '1. Query Refinement', status: AgentStatus.Idle, output: null, description: AGENT_DESCRIPTIONS.queryRefinement },
  contextualPreAnalysis: { id: 'contextualPreAnalysis', name: '2. Contextual Pre-Analysis', status: AgentStatus.Idle, output: null, description: AGENT_DESCRIPTIONS.contextualPreAnalysis },
  dynamicRetrieval: { id: 'dynamicRetrieval', name: '3. Dynamic Retrieval', status: AgentStatus.Idle, output: null, description: AGENT_DESCRIPTIONS.dynamicRetrieval },
  responseGeneration: { id: 'responseGeneration', name: '4. Response Generation', status: AgentStatus.Idle, output: null, description: AGENT_DESCRIPTIONS.responseGeneration },
  sufficiencyEvaluation: { id: 'sufficiencyEvaluation', name: '5. Sufficiency Evaluation', status: AgentStatus.Idle, output: null, description: AGENT_DESCRIPTIONS.sufficiencyEvaluation },
  finalOutput: { id: 'finalOutput', name: '6. Final Output', status: AgentStatus.Idle, output: null, description: AGENT_DESCRIPTIONS.finalOutput },
};

const App: React.FC = () => {
  // Initialize state with sessionStorage data if available
  const [agents, setAgents] = useState<Record<string, AgentState>>(() => {
    const saved = sessionStorage.getItem('agentic-rag-agents');
    return saved ? JSON.parse(saved) : initialAgents;
  });
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isIndexing, setIsIndexing] = useState<boolean>(false);
  
  const [logs, setLogs] = useState<string[]>(() => {
    const saved = sessionStorage.getItem('agentic-rag-logs');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>(() => {
    const saved = sessionStorage.getItem('agentic-rag-chat-history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [documentChunks, setDocumentChunks] = useState<DocumentChunk[]>(() => {
    const saved = sessionStorage.getItem('agentic-rag-document-chunks');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [workflowState, setWorkflowState] = useState<WorkflowState>(() => {
    const saved = sessionStorage.getItem('agentic-rag-workflow-state');
    return saved ? JSON.parse(saved) : 'idle';
  });
  
  const [humanLoopOptions, setHumanLoopOptions] = useState<HumanLoopOptions | null>(() => {
    const saved = sessionStorage.getItem('agentic-rag-human-loop-options');
    return saved ? JSON.parse(saved) : null;
  });
  
  const originalDocProcessingAgent = useMemo(() => agents.documentProcessing, [agents.documentProcessing]);

  // Save to sessionStorage whenever state changes
  useEffect(() => {
    sessionStorage.setItem('agentic-rag-agents', JSON.stringify(agents));
  }, [agents]);

  useEffect(() => {
    sessionStorage.setItem('agentic-rag-logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    sessionStorage.setItem('agentic-rag-chat-history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    sessionStorage.setItem('agentic-rag-document-chunks', JSON.stringify(documentChunks));
  }, [documentChunks]);

  useEffect(() => {
    sessionStorage.setItem('agentic-rag-workflow-state', JSON.stringify(workflowState));
  }, [workflowState]);

  useEffect(() => {
    sessionStorage.setItem('agentic-rag-human-loop-options', JSON.stringify(humanLoopOptions));
  }, [humanLoopOptions]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const updateAgent = (agentId: string, status: AgentStatus, output: string | null = null) => {
    setAgents(prev => ({
      ...prev,
      [agentId]: { ...prev[agentId], status, output: output ?? prev[agentId].output },
    }));
  };

  const resetAgentsState = () => {
    const newAgents = { ...initialAgents };
    // Preserve the status of the document processing agent
    newAgents.documentProcessing = originalDocProcessingAgent;
    setAgents(newAgents);
  };
  
  const handleNewChat = () => {
    resetAgentsState();
    setLogs([]);
    setChatHistory([]);
    setIsLoading(false);
    setWorkflowState('idle');
    setHumanLoopOptions(null);
    
    // Clear sessionStorage when starting a new chat
    sessionStorage.removeItem('agentic-rag-agents');
    sessionStorage.removeItem('agentic-rag-logs');
    sessionStorage.removeItem('agentic-rag-chat-history');
    sessionStorage.removeItem('agentic-rag-document-chunks');
    sessionStorage.removeItem('agentic-rag-workflow-state');
    sessionStorage.removeItem('agentic-rag-human-loop-options');
  };

  const handleHumanLoopAction = useCallback(async (action: string, data?: any) => {
    if (!humanLoopOptions) return;

    addLog(`Human action: ${action}`);
    setWorkflowState('running');
    setIsLoading(true);

    try {
      let finalResponse = humanLoopOptions.currentResponse;
      let finalSources: Source[] = [];
      let finalChunks: DocumentChunk[] = [];
      let needsAnotherRound = false;

      switch (action) {
        case 'refine_query':
          addLog("Refining query based on human feedback...");
          updateAgent('queryRefinement', AgentStatus.Running);
          
          const newRefinedQuery = await geminiService.refineQueryWithFeedback(
            humanLoopOptions.originalQuery,
            humanLoopOptions.chatHistory,
            data,
            humanLoopOptions.justification
          );
          
          updateAgent('queryRefinement', AgentStatus.Completed, `Refined Query: ${newRefinedQuery}`);
          addLog(`Query refined to: "${newRefinedQuery}"`);

          // Re-run retrieval and generation with new query
          addLog("Re-running retrieval with refined query...");
          updateAgent('dynamicRetrieval', AgentStatus.Running);
          
          let newInternalChunks: DocumentChunk[] = [];
          if (documentChunks.length > 0) {
            newInternalChunks = await geminiService.findRelevantChunks(newRefinedQuery, documentChunks);
          }
          
          const newInternalContext = newInternalChunks.map(c => `Source File: ${c.sourceFile}\nContent: ${c.content}`).join('\n---\n');
          const useWebForRefined = newInternalChunks.length === 0;
          
          updateAgent('dynamicRetrieval', AgentStatus.Completed, `Retrieved ${newInternalChunks.length} chunks, web search: ${useWebForRefined}`);
          
          addLog("Generating new response...");
          updateAgent('responseGeneration', AgentStatus.Running);
          
          const refinedResult = await geminiService.generateResponse(
            newRefinedQuery, 
            humanLoopOptions.chatHistory, 
            newInternalContext, 
            useWebForRefined
          );
          
          finalResponse = refinedResult.text;
          finalSources = refinedResult.sources;
          finalChunks = newInternalChunks;
          
          updateAgent('responseGeneration', AgentStatus.Completed, 'Enhanced response generated.');
          break;

        case 'search_web':
          addLog("Enhancing response with web search...");
          updateAgent('dynamicRetrieval', AgentStatus.Running);
          updateAgent('responseGeneration', AgentStatus.Running);
          
          const webEnhancedResult = await geminiService.enhanceResponseWithWebSearch(
            humanLoopOptions.currentResponse,
            humanLoopOptions.refinedQuery,
            humanLoopOptions.chatHistory,
            humanLoopOptions.internalContext
          );
          
          finalResponse = webEnhancedResult.text;
          finalSources = webEnhancedResult.sources;
          
          // Parse internal chunks from existing context
          const existingChunks = humanLoopOptions.internalContext ? 
            documentChunks.filter(chunk => humanLoopOptions.internalContext.includes(chunk.content.substring(0, 100))) : [];
          finalChunks = existingChunks;
          
          updateAgent('dynamicRetrieval', AgentStatus.Completed, `Web search completed, found ${finalSources.length} sources.`);
          updateAgent('responseGeneration', AgentStatus.Completed, 'Response enhanced with web search.');
          break;

        case 'accept_response':
          addLog("Accepting current response as requested by user.");
          // Use current response as-is
          const existingChunksForAccept = humanLoopOptions.internalContext ? 
            documentChunks.filter(chunk => humanLoopOptions.internalContext.includes(chunk.content.substring(0, 100))) : [];
          finalChunks = existingChunksForAccept;
          break;

        case 'add_context':
          addLog("Context addition feature would be implemented here.");
          // For now, just accept the current response
          // In a full implementation, this would open a file upload dialog
          break;

        case 'manual_improvement':
          addLog("Manual improvement feature would be implemented here.");
          // For now, just accept the current response
          // In a full implementation, this would open a text editor
          break;

        default:
          addLog(`Unknown action: ${action}`);
          break;
      }

      // Skip re-evaluation if user explicitly accepted the response
      if (action === 'accept_response') {
        addLog("Skipping re-evaluation as user accepted the current response.");
      } else {
        // Step 5: Re-evaluate the enhanced response
        addLog("Agent 5 [Sufficiency Evaluation] re-evaluating enhanced response...");
        updateAgent('sufficiencyEvaluation', AgentStatus.Running);
        
        const reEvaluation = await geminiService.evaluateResponse(
          humanLoopOptions.originalQuery, 
          finalResponse, 
          humanLoopOptions.chatHistory
        );
        
        const reEvaluationOutput = `Re-evaluation Confidence: ${reEvaluation.confidenceScore}%. Justification: ${reEvaluation.justification}`;
        updateAgent('sufficiencyEvaluation', AgentStatus.Completed, reEvaluationOutput);
        addLog(`Agent 5 [Sufficiency Evaluation] re-evaluation completed. New confidence: ${reEvaluation.confidenceScore}%.`);

        // Check if confidence is now acceptable
        if (reEvaluation.confidenceScore < CONFIDENCE_THRESHOLD) {
          addLog(`Re-evaluation confidence still below ${CONFIDENCE_THRESHOLD}%. Offering another round of human intervention...`);
          
          // Set flag to show dialog again
          needsAnotherRound = true;
          
          // Update options for another round
          setHumanLoopOptions({
            currentResponse: finalResponse,
            confidence: reEvaluation.confidenceScore,
            justification: reEvaluation.justification,
            availableActions: ['refine_query', 'add_context', 'search_web', 'accept_response', 'manual_improvement'],
            originalQuery: humanLoopOptions.originalQuery,
            refinedQuery: humanLoopOptions.refinedQuery,
            internalContext: humanLoopOptions.internalContext,
            chatHistory: humanLoopOptions.chatHistory
          });
          
          setWorkflowState('awaiting_human_input');
          setIsLoading(false);
          return; // Pause workflow again for second round of human input
        } else {
          addLog(`Re-evaluation confidence is now acceptable (${reEvaluation.confidenceScore}% >= ${CONFIDENCE_THRESHOLD}%). Proceeding to final output.`);
        }
      }

      // Step 6: Final Output
      addLog("Agent 6 [Final Output] preparing enhanced response...");
      updateAgent('finalOutput', AgentStatus.Running);
      
      const modelResponse: ChatTurn = {
        role: 'model',
        text: finalResponse,
        sources: finalSources,
        retrievedChunks: finalChunks,
        id: `model-${Date.now()}`
      };
      
      setChatHistory(prev => [...prev, modelResponse]);
      updateAgent('finalOutput', AgentStatus.Completed, 'Enhanced response delivered.');
      addLog("Human-in-the-loop workflow completed successfully.");
      setWorkflowState('completed');
      setHumanLoopOptions(null);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      addLog(`Human-in-the-loop action failed: ${errorMessage}`);
      setWorkflowState('failed');
      setIsLoading(false);
      setHumanLoopOptions(null);
    }
  }, [humanLoopOptions, documentChunks]);

  const handleCloseConfidenceDialog = () => {
    setHumanLoopOptions(null);
    setWorkflowState('idle');
    setIsLoading(false);
  };

  const handleProcessFiles = useCallback(async (files: FileList) => {
    if (isLoading || isIndexing) return;
    setIsIndexing(true);
    updateAgent('documentProcessing', AgentStatus.Running, `Processing ${files.length} file(s)...`);
    addLog(`Agent 0 [Document Processing] starting for ${files.length} file(s)...`);
    
    const processingPromises = Array.from(files).map(async file => {
      try {
        addLog(`Extracting text from: ${file.name}`);
        const text = await geminiService.extractTextFromFile(file);

        if (text === null) {
          addLog(`Skipping unsupported file type: ${file.name} (${file.type})`);
          return [];
        }
        
        const chunks = geminiService.chunkText(text, file.name);
        addLog(`Processed ${file.name}, created ${chunks.length} chunks.`);
        return chunks;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        addLog(`Failed to process file ${file.name}: ${errorMessage}`);
        throw new Error(`Failed to process ${file.name}.`);
      }
    });

    try {
        const chunkArrays = await Promise.all(processingPromises);
        const allChunks = chunkArrays.flat();
        
        setDocumentChunks(allChunks);
        const output = `Successfully processed ${files.length} file(s) into ${allChunks.length} chunks.`;
        updateAgent('documentProcessing', AgentStatus.Completed, output);
        addLog(`Agent 0 [Document Processing] completed.`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during file processing.";
        updateAgent('documentProcessing', AgentStatus.Failed, errorMessage);
        addLog(`Agent 0 [Document Processing] failed: ${errorMessage}`);
        setDocumentChunks([]);
    } finally {
        setIsIndexing(false);
    }
  }, [isLoading, isIndexing]);

  const handleRunWorkflow = useCallback(async (userQuery: string) => {
    if (isLoading || isIndexing) return;

    setIsLoading(true);
    resetAgentsState();

    const newUserTurn: ChatTurn = { role: 'user', text: userQuery, id: `user-${Date.now()}` };
    const currentChatHistory = [...chatHistory, newUserTurn];
    setChatHistory(currentChatHistory);
    
    addLog(`Workflow started for query: "${userQuery}"`);

    try {
      // Step 1: Query Refinement
      addLog("Agent 1 [Query Refinement] starting...");
      updateAgent('queryRefinement', AgentStatus.Running);
      const refinedQuery = await geminiService.refineQuery(userQuery, currentChatHistory);
      updateAgent('queryRefinement', AgentStatus.Completed, `Refined Query: ${refinedQuery}`);
      addLog(`Agent 1 [Query Refinement] completed. New query: "${refinedQuery}"`);

      // Step 2: Contextual Pre-Analysis (Simulated)
      addLog("Agent 2 [Contextual Pre-Analysis] starting...");
      updateAgent('contextualPreAnalysis', AgentStatus.Running);
      await new Promise(resolve => setTimeout(resolve, 500));
      const preAnalysisOutput = "Identified key entities to guide retrieval.";
      updateAgent('contextualPreAnalysis', AgentStatus.Completed, preAnalysisOutput);
      addLog("Agent 2 [Contextual Pre-Analysis] completed.");
      
      // Step 3: Dynamic Retrieval
      addLog("Agent 3 [Dynamic Retrieval] starting...");
      updateAgent('dynamicRetrieval', AgentStatus.Running);
      
      let internalContextChunks: DocumentChunk[] = [];
      if (documentChunks.length > 0) {
        addLog("Searching local knowledge base...");
        internalContextChunks = await geminiService.findRelevantChunks(refinedQuery, documentChunks);
        if(internalContextChunks.length > 0) {
            addLog(`Found ${internalContextChunks.length} relevant chunk(s) in your documents.`);
        } else {
            addLog(`No relevant information found in your documents for this query.`);
        }
      }

      const useWebSearch = internalContextChunks.length === 0;
      const internalContextString = internalContextChunks.map(c => `Source File: ${c.sourceFile}\nContent: ${c.content}`).join('\n---\n');
      
      let retrievalSummary = '';
      if (internalContextChunks.length > 0) {
          retrievalSummary += `Retrieved ${internalContextChunks.length} internal chunk(s). `;
      }
      if (useWebSearch) {
          retrievalSummary += 'External web search initiated.';
          addLog("Internal context insufficient, proceeding with web search.");
      } else {
          retrievalSummary += 'Skipping external web search.';
      }

      // Step 4: Response Generation
      addLog("Agent 4 [Response Generation] starting...");
      updateAgent('responseGeneration', AgentStatus.Running);

      const generationResult = await geminiService.generateResponse(refinedQuery, currentChatHistory, internalContextString, useWebSearch);
      const generatedResponse = generationResult.text;
      const fetchedSources = generationResult.sources;
      
      if(useWebSearch) {
          retrievalSummary += ` Found ${fetchedSources.length} web source(s).`;
      }
      updateAgent('dynamicRetrieval', AgentStatus.Completed, retrievalSummary);
      addLog(`Agent 3 [Dynamic Retrieval] completed.`);

      updateAgent('responseGeneration', AgentStatus.Completed, 'Initial response draft generated.');
      addLog("Agent 4 [Response Generation] completed.");

      // Step 5: Sufficiency Evaluation
      addLog("Agent 5 [Sufficiency Evaluation] starting...");
      updateAgent('sufficiencyEvaluation', AgentStatus.Running);
      const evaluation = await geminiService.evaluateResponse(userQuery, generatedResponse, currentChatHistory);
      const evaluationOutput = `Confidence: ${evaluation.confidenceScore}%. Justification: ${evaluation.justification}`;
      updateAgent('sufficiencyEvaluation', AgentStatus.Completed, evaluationOutput);
      addLog(`Agent 5 [Sufficiency Evaluation] completed. Confidence: ${evaluation.confidenceScore}%.`);
      
      if (evaluation.confidenceScore < CONFIDENCE_THRESHOLD) {
          addLog(`Confidence below ${CONFIDENCE_THRESHOLD}%. Initiating human-in-the-loop process...`);
          
          // Pause workflow and present options to user
          setWorkflowState('awaiting_human_input');
          setHumanLoopOptions({
            currentResponse: generatedResponse,
            confidence: evaluation.confidenceScore,
            justification: evaluation.justification,
            availableActions: ['refine_query', 'add_context', 'search_web', 'accept_response', 'manual_improvement'],
            originalQuery: userQuery,
            refinedQuery: refinedQuery,
            internalContext: internalContextString,
            chatHistory: currentChatHistory
          });
          
          // Don't proceed to final output - wait for human input
          setIsLoading(false);
          return;
      } else {
          addLog(`Confidence is high. Proceeding to final output.`);
      }

      // Step 6: Final Output
      addLog("Agent 6 [Final Output] preparing response...");
      updateAgent('finalOutput', AgentStatus.Running);
      
      const modelResponse: ChatTurn = {
          role: 'model',
          text: generatedResponse,
          sources: fetchedSources,
          retrievedChunks: internalContextChunks,
          id: `model-${Date.now()}`
      };
      setChatHistory(prev => [...prev, modelResponse]);

      updateAgent('finalOutput', AgentStatus.Completed, 'Response formatted and delivered.');
      addLog("Workflow finished successfully.");
      setWorkflowState('completed');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      addLog(`Workflow failed: ${errorMessage}`);
      const errorTurn: ChatTurn = { role: 'model', text: `Sorry, an error occurred: ${errorMessage}`, id: `error-${Date.now()}`};
      setChatHistory(prev => [...prev, errorTurn]);
      setAgents(prev => {
          const newAgents = { ...prev };
          for (const key in newAgents) {
              if (newAgents[key].status === AgentStatus.Running) {
                  newAgents[key].status = AgentStatus.Failed;
                  newAgents[key].output = errorMessage;
              }
          }
          return newAgents;
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isIndexing, documentChunks, chatHistory, originalDocProcessingAgent]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <header className="w-full max-w-7xl mb-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
           <AppTitle />
           <div className="text-left">
              <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
                Agentic RAG Workflow
              </h1>
              <p className="text-md text-gray-400">
                A conversational agent prototype.
              </p>
           </div>
        </div>
        <button
            onClick={handleNewChat}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 font-semibold rounded-lg hover:bg-gray-600 transition duration-200"
            title="Start a new chat session"
        >
            <PlusCircleIcon />
            New Chat
        </button>
      </header>

      <main className="w-full max-w-7xl flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            <div className="lg:col-span-2 order-2 lg:order-1 flex flex-col gap-8">
                {chatHistory.length > 0 ? (
                    <ResultsDisplay chatHistory={chatHistory} />
                ) : (
                    <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700 shadow-lg">
                        <div className="flex items-center gap-3 mb-4">
                            <DatabaseIcon className="text-blue-400 h-8 w-8" />
                            <h2 className="text-2xl font-bold text-gray-300">Local Knowledge Base</h2>
                        </div>
                        <p className="text-sm text-gray-400 mb-4">Upload your own documents (.txt, .pdf) to create a temporary, in-memory knowledge base for the agents to use.</p>
                        <FileUploader onProcess={handleProcessFiles} isProcessing={isIndexing || isLoading} />
                        {agents.documentProcessing.status === AgentStatus.Completed && !isIndexing && (
                            <div className="mt-4 text-sm text-green-400">
                                <p>✅ Knowledge base is ready with {documentChunks.length} document chunks.</p>
                            </div>
                        )}
                    </div>
                )}
                 <QueryInput onSubmit={handleRunWorkflow} isLoading={isLoading || isIndexing} isConversationStarted={chatHistory.length > 0} />
            </div>
            <div className="lg:col-span-1 order-1 lg:order-2 flex flex-col gap-8">
                 <WorkflowDiagram agents={Object.values(agents)} />
                 <LogPanel logs={logs} />
            </div>
        </div>
      </main>
       <footer className="w-full max-w-7xl text-center mt-12 text-gray-500 text-sm">
        <p>This is a conceptual prototype. Agent actions and API calls are simplified for demonstration.</p>
      </footer>

      {/* Human-in-the-Loop Confidence Dialog */}
      <ConfidenceDialog
        isOpen={workflowState === 'awaiting_human_input'}
        options={humanLoopOptions}
        onAction={handleHumanLoopAction}
        onClose={handleCloseConfidenceDialog}
      />
    </div>
  );
};

export default App;
