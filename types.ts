import { Part } from "@google/genai";

export enum AgentStatus {
  Idle = 'idle',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Skipped = 'skipped'
}

export interface AgentState {
  id: string;
  name: string;
  status: AgentStatus;
  output: string | null;
  description: string;
}

export interface Source {
  uri: string;
  title: string;
}

export interface DocumentChunk {
  id:string;
  content: string;
  sourceFile: string;
}

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
  sources?: Source[];
  retrievedChunks?: DocumentChunk[];
  id: string;
}

export type WorkflowState = 'idle' | 'running' | 'awaiting_human_input' | 'completed' | 'failed';

export interface HumanLoopOptions {
  currentResponse: string;
  confidence: number;
  justification: string;
  availableActions: string[];
  originalQuery: string;
  refinedQuery: string;
  internalContext: string;
  chatHistory: ChatTurn[];
}
