
import { GoogleGenAI, Type, GenerateContentResponse, Content } from "@google/genai";
import { Source, DocumentChunk, ChatTurn } from '../types';
import { MAX_CHUNK_SIZE } from "../constants";
import * as pdfjsLib from 'pdfjs-dist';

// Set the workerSrc for pdfjs-dist. This is required for it to work in a browser environment.
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs`;

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const toGeminiHistory = (history: ChatTurn[]): Content[] => {
  return history.map(turn => ({
    role: turn.role,
    parts: [{ text: turn.text }],
  }));
};


class GeminiService {
  async refineQuery(originalQuery: string, chatHistory: ChatTurn[]): Promise<string> {
    try {
      const systemInstruction = "You are a Query Understanding & Expansion Agent. Given a conversation history and the user's latest query, your goal is to rephrase the latest query into a standalone, precise, and comprehensive query for an advanced search system. The refined query should incorporate context from the history. Return ONLY the rephrased query, without any preamble or explanation.";
      
      const history = toGeminiHistory(chatHistory.slice(0, -1)); // History without the latest query
      const fullPrompt = `Conversation History:\n${history.map(h => `${h.role}: ${h.parts[0].text}`).join('\n')}\n\nLatest User Query: "${originalQuery}"`;

      const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: fullPrompt,
          config: {
              systemInstruction: systemInstruction,
              temperature: 0.2,
              thinkingConfig: { thinkingBudget: 0 }
          }
      });

      return response.text.trim();
    } catch (error) {
      console.error("Error in refineQuery:", error);
      throw new Error("Failed to refine query.");
    }
  }

  chunkText(text: string, fileName: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let idCounter = 0;
    for (let i = 0; i < text.length; i += MAX_CHUNK_SIZE) {
        const content = text.substring(i, i + MAX_CHUNK_SIZE);
        chunks.push({
            id: `${fileName}-${idCounter++}`,
            content,
            sourceFile: fileName,
        });
    }
    return chunks;
  }
  
  async extractTextFromFile(file: File): Promise<string | null> {
    if (file.type === 'application/pdf') {
        const fileReader = new FileReader();
        return new Promise((resolve, reject) => {
            fileReader.onload = async (event) => {
                if (!event.target?.result) {
                    return reject(new Error("Failed to read file."));
                }
                try {
                    const typedArray = new Uint8Array(event.target.result as ArrayBuffer);
                    const pdf = await pdfjsLib.getDocument(typedArray).promise;
                    let fullText = '';

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        
                        const sortedItems = [...textContent.items].sort((a, b) => {
                            const aIsTextItem = 'str' in a && 'transform' in a;
                            const bIsTextItem = 'str' in b && 'transform' in b;
                            
                            if (aIsTextItem && bIsTextItem) {
                                if (a.transform[5] > b.transform[5]) return -1; // Y-coordinate (top-down)
                                if (a.transform[5] < b.transform[5]) return 1;
                                if (a.transform[4] < b.transform[4]) return -1; // X-coordinate (left-to-right)
                                if (a.transform[4] > b.transform[4]) return 1;
                                return 0;
                            }
                            return aIsTextItem ? -1 : (bIsTextItem ? 1 : 0);
                        });

                        let lastY = -1;
                        let pageText = '';
                        for (const item of sortedItems) {
                          if ('str' in item && 'transform' in item) {
                            if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
                                pageText += '\n';
                            }
                            pageText += item.str + ' ';
                            lastY = item.transform[5];
                          }
                        }
                        fullText += pageText + '\n\n';
                    }
                    resolve(fullText);
                } catch (error) {
                    console.error("Error processing PDF:", error);
                    reject(new Error("Could not parse PDF file. It may be corrupted or encrypted."));
                }
            };
            fileReader.onerror = () => reject(new Error("Error reading file."));
            fileReader.readAsArrayBuffer(file);
        });
    } else if (file.type === 'text/plain') {
        const fileReader = new FileReader();
        return new Promise((resolve, reject) => {
            fileReader.onload = (event) => {
                if (event.target?.result) {
                    resolve(event.target.result as string);
                } else {
                    reject(new Error("Failed to read text file."));
                }
            };
            fileReader.onerror = () => reject(new Error("Error reading file."));
            // Explicitly read as UTF-8 to handle all languages and special characters
            fileReader.readAsText(file, 'UTF-8');
        });
    } else {
        // Unsupported file type
        return Promise.resolve(null);
    }
  }


  async findRelevantChunks(query: string, chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    if (chunks.length === 0) return [];
    try {
        const systemInstruction = `You are a semantic search engine. Your task is to find the most relevant document chunks to answer the user's query. The user will provide a query and a list of document chunks in JSON format. Respond with a JSON array containing ONLY the IDs of the relevant chunks. If no chunks are relevant, return an empty array. Do not add any explanation.`;

        const chunksString = JSON.stringify(chunks.map(({ id, content }) => ({ id, content: content.substring(0, 200) + "..." })));
        const prompt = `Query: "${query}"\n\nDocument Chunks: ${chunksString}`;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                relevantChunkIds: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "An array of IDs of the document chunks that are relevant to the query."
                }
            },
            required: ["relevantChunkIds"]
        };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema,
            }
        });

        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);
        const relevantIds: string[] = parsedJson.relevantChunkIds || [];
        
        const relevantChunks = chunks.filter(chunk => relevantIds.includes(chunk.id));
        return relevantChunks;

    } catch (error) {
        console.error("Error in findRelevantChunks:", error);
        // Fallback to simple keyword search
        const queryKeywords = query.toLowerCase().split(/\s+/);
        return chunks.filter(chunk => queryKeywords.some(keyword => chunk.content.toLowerCase().includes(keyword)));
    }
  }

  async generateResponse(query: string, chatHistory: ChatTurn[], internalContext: string, useWebSearch: boolean): Promise<{ text: string, sources: Source[] }> {
    try {
        let systemInstruction = "You are a helpful and conversational Response Generation Agent. You synthesize information from the conversation history and various sources to formulate a comprehensive, well-structured, and accurate answer. Answer the user's latest query based on the full conversation context. Use markdown for formatting.";

        if (internalContext) {
          systemInstruction += `\n\nFirst, prioritize the following internal context provided from the user's documents:\n<internal_context>\n${internalContext}\n</internal_context>`;
        }
        if (useWebSearch) {
          systemInstruction += "\n\nYou should also use Google Search to find up-to-date information if the internal context and conversation history are insufficient.";
        } else {
          systemInstruction += "\n\nBase your answer ONLY on the provided internal context and conversation history. Do not use external knowledge unless it's to clarify concepts from the context.";
        }

        const history = toGeminiHistory(chatHistory.slice(0, -1));

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [...history, { role: 'user', parts: [{ text: query }]}],
            config: {
                tools: useWebSearch ? [{ googleSearch: {} }] : [],
                systemInstruction: systemInstruction,
            },
        });

        const text = response.text;
        let sources: Source[] = [];
        if (useWebSearch) {
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            sources = groundingChunks
                .map(chunk => chunk.web)
                .filter(web => web?.uri && web.title)
                .map(web => ({ uri: web!.uri!, title: web!.title! }))
                .filter((source, index, self) => 
                    index === self.findIndex((s) => s.uri === source.uri)
                );
        }
            
        return { text, sources };
    } catch (error) {
        console.error("Error in generateResponse:", error);
        throw new Error("Failed to generate response.");
    }
  }

  async evaluateResponse(originalQuery: string, generatedResponse: string, chatHistory: ChatTurn[]): Promise<{ confidenceScore: number, justification: string }> {
      try {
          const systemInstruction = "You are a Sufficiency & Confidence Evaluation Agent. Your task is to critically evaluate a generated response based on the user's original query and the conversation history. Assess for completeness (Does it answer the latest query in context?), accuracy, and coherence. Provide a confidence score from 0 to 100 and a brief justification. Respond in the requested JSON format.";
          
          const responseSchema = {
              type: Type.OBJECT,
              properties: {
                  confidenceScore: {
                      type: Type.INTEGER,
                      description: "A score from 0 to 100 representing confidence in the response's quality."
                  },
                  justification: {
                      type: Type.STRING,
                      description: "A brief, one-sentence justification for the score."
                  }
              },
              required: ["confidenceScore", "justification"]
          };

          const historyText = chatHistory.map(turn => `${turn.role}: ${turn.text}`).join('\n');
          const prompt = `Conversation History:\n${historyText}\n\nGenerated Response to last query: "${generatedResponse.substring(0, 2000)}..."\n\nPlease evaluate.`;

          const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: prompt,
              config: {
                  systemInstruction,
                  responseMimeType: "application/json",
                  responseSchema: responseSchema,
              }
          });

          const jsonText = response.text.trim();
          const parsedJson = JSON.parse(jsonText);

          return {
              confidenceScore: parsedJson.confidenceScore || 0,
              justification: parsedJson.justification || "No justification provided."
          };

      } catch (error) {
          console.error("Error in evaluateResponse:", error);
          return {
              confidenceScore: 30,
              justification: "Evaluation failed due to a technical error."
          };
      }
  }

  async refineQueryWithFeedback(
    originalQuery: string, 
    chatHistory: ChatTurn[], 
    humanFeedback: string,
    confidenceIssue: string
  ): Promise<string> {
    try {
      const systemInstruction = `You are a Query Understanding & Expansion Agent with human feedback integration. Given a conversation history, the user's original query, human feedback about a low-confidence response, and the identified issue, create an improved, more specific query that addresses the concerns raised.

Original issue with the response: ${confidenceIssue}
Human feedback: ${humanFeedback}

Your goal is to refine the query to be more targeted and likely to produce a higher-confidence response. Return ONLY the refined query, without any preamble or explanation.`;
      
      const history = toGeminiHistory(chatHistory.slice(0, -1));
      const fullPrompt = `Conversation History:\n${history.map(h => `${h.role}: ${h.parts[0].text}`).join('\n')}\n\nOriginal User Query: "${originalQuery}"\n\nHuman Feedback: "${humanFeedback}"\n\nConfidence Issue: "${confidenceIssue}"`;

      const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: fullPrompt,
          config: {
              systemInstruction: systemInstruction,
              temperature: 0.2,
              thinkingConfig: { thinkingBudget: 0 }
          }
      });

      return response.text.trim();
    } catch (error) {
      console.error("Error in refineQueryWithFeedback:", error);
      throw new Error("Failed to refine query with feedback.");
    }
  }

  async enhanceResponseWithWebSearch(
    originalResponse: string,
    query: string,
    chatHistory: ChatTurn[],
    internalContext: string
  ): Promise<{ text: string, sources: Source[] }> {
    try {
      const systemInstruction = `You are a Response Enhancement Agent. You have an existing response that had low confidence. Your task is to enhance it by incorporating additional web search results while maintaining coherence with the original response and conversation context.

Original Response (to be enhanced):
${originalResponse}

Instructions:
- Use web search to find additional relevant information
- Integrate new findings with the existing response
- Maintain conversation context and flow
- Provide a comprehensive, well-structured answer
- Use markdown for formatting`;

      if (internalContext) {
        systemInstruction + `\n\nInternal Context from Documents:\n${internalContext}`;
      }

      const history = toGeminiHistory(chatHistory.slice(0, -1));

      const response: GenerateContentResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [...history, { role: 'user', parts: [{ text: query }]}],
          config: {
              tools: [{ googleSearch: {} }],
              systemInstruction: systemInstruction,
          },
      });

      const text = response.text;
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources: Source[] = groundingChunks
          .map(chunk => chunk.web)
          .filter(web => web?.uri && web.title)
          .map(web => ({ uri: web!.uri!, title: web!.title! }))
          .filter((source, index, self) => 
              index === self.findIndex((s) => s.uri === source.uri)
          );
          
      return { text, sources };
    } catch (error) {
      console.error("Error in enhanceResponseWithWebSearch:", error);
      throw new Error("Failed to enhance response with web search.");
    }
  }

  async synthesizeResponses(response1: string, response2: string): Promise<string> {
    try {
      const systemInstruction = `You are a Response Synthesis Agent. Combine two responses into a single, comprehensive answer that:
- Removes redundancy while preserving all unique information
- Maintains logical flow and coherence
- Integrates information seamlessly
- Uses markdown formatting for better readability
- Prioritizes accuracy and completeness`;

      const prompt = `Response 1:\n${response1}\n\nResponse 2:\n${response2}\n\nPlease synthesize these into a single, comprehensive response.`;

      const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
              systemInstruction: systemInstruction,
              temperature: 0.3,
          }
      });

      return response.text.trim();
    } catch (error) {
      console.error("Error in synthesizeResponses:", error);
      throw new Error("Failed to synthesize responses.");
    }
  }
}

export const geminiService = new GeminiService();
