export const CONFIDENCE_THRESHOLD = 75;
export const MAX_CHUNK_SIZE = 1000; // Characters

export const AGENT_DESCRIPTIONS = {
  documentProcessing: "Processes uploaded files (.txt, .pdf), splitting them into manageable chunks to create a local knowledge base.",
  queryRefinement: "Analyzes the initial query for ambiguity and refines it for better search precision.",
  contextualPreAnalysis: "Identifies key entities and concepts in the refined query to inform the retrieval strategy.",
  dynamicRetrieval: "Searches the local knowledge base and/or the web to find the most relevant information to answer the query.",
  responseGeneration: "Synthesizes information from all retrieved sources to formulate an initial draft response.",
  sufficiencyEvaluation: "Evaluates the draft response for completeness, accuracy, and confidence.",
  finalOutput: "Formats and presents the final, validated response to the user, including sources."
};