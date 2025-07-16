
# Agentic RAG Workflow Visualizer

This project is an interactive web application that provides a visual prototype of an advanced **Agentic AI Workflow using Retrieval-Augmented Generation (RAG)**. It demonstrates how a series of specialized AI "agents" can collaborate as a **conversational partner** to understand a user's query, dynamically retrieve information, evaluate findings, and generate comprehensive, source-backed responses.

This application now supports **context-aware conversations**, allowing you to ask follow-up questions and get more tailored answers.

![Agentic RAG Workflow Screenshot](https://storage.googleapis.com/agentops-images/agentic-rag-screenshot.png)
*(A screenshot of the application in action)*

## Table of Contents

- [Core Concept](#core-concept)
- [How to Use the Application](#how-to-use-the-application)
- [Conversational Context](#conversational-context)
- [Vector Database & Custom Data](#vector-database--custom-data)
- [The Agent Workflow](#the-agent-workflow)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Disclaimer](#disclaimer)

## Core Concept

Traditional RAG models retrieve documents and generate an answer in a single shot. This "Agentic RAG" model takes it a step further by breaking the process down into distinct tasks, each handled by a specialized AI agent. This creates a more robust, intelligent, and transparent system capable of self-correction and dynamic information seeking. By incorporating **conversational memory**, the system can now handle follow-up questions, making the interaction feel more natural and powerful.

## How to Use the Application

Using the visualizer is simple and intuitive.

1.  **(Optional) Create a Local Knowledge Base:**
    *   Before starting a chat, you can use the **"Local Knowledge Base"** section to upload your own documents (`.txt` or `.pdf`).
    *   Once processed, this knowledge base will be available for the entire chat session.

2.  **Start the Conversation:**
    *   Type your question into the input box at the bottom.
    *   Alternatively, click one of the **sample queries** to start the workflow immediately.

3.  **Ask Follow-up Questions:**
    *   Once the first response is generated, the agents will remember the context. You can now ask clarifying questions like "Can you explain the second point in more detail?" or "Who was the author of that document?".

4.  **Observe the Workflow:**
    *   **Workflow Status (Right Panel):** Watch as each agent progresses through its tasks for every message you send.
    *   **Execution Log (Right Panel):** See a real-time log of the steps each agent is taking.

5.  **View the Chat:**
    *   Your conversation is displayed in the main chat window.
    *   Each model response includes any sources it used, whether from your uploaded documents or the web.

6.  **Start a New Chat:**
    *   Click the **"New Chat"** button in the header at any time to clear the conversation and start a new topic.

## Conversational Context

The application now maintains a session-based chat history. Here's how it enhances the workflow:

- **Query Refinement:** The `Query Refinement Agent` now uses the conversation history to understand ambiguous follow-up questions (e.g., "what about them?") and transforms them into standalone, detailed queries.
- **Contextual Generation:** The `Response Generation Agent` considers the entire conversation to provide answers that are relevant to the current topic, avoiding repetition.
- **Smarter Evaluation:** The `Sufficiency Evaluation Agent` checks if the response appropriately answers the user's *latest* message within the context of the conversation.

## Vector Database & Custom Data

A key feature of this prototype is the ability to create your own ad-hoc knowledge base from local files.

-   **Multi-Language Support:** The document processor is designed to handle different languages by explicitly using the **UTF-8 Unicode standard** for text files.
-   **File Upload:** You can upload one or more plain text (`.txt`) or PDF (`.pdf`) files.
-   **Intelligent Content Extraction:** For PDFs, the system uses an advanced parser to extract text while attempting to preserve the document's original layout.
-   **In-Memory "Vector" Database:** The `Document Processing Agent` splits the text into chunks and stores them in memory for the duration of your session.
-   **Simulated Semantic Search:** The `Dynamic Retrieval Agent` uses an LLM-powered function to perform a "semantic search" over your document chunks, finding the most relevant information.

## The Agent Workflow

The application visualizes the following sequence of agents for each of your messages:

0.  **Document Processing Agent:** (Optional, run once) Processes user-uploaded documents (`.txt`, `.pdf`).
1.  **Query Refinement Agent:** Analyzes the latest query **in the context of the chat history**.
2.  **Contextual Pre-Analysis Agent:** Identifies key concepts to inform retrieval.
3.  **Dynamic Retrieval Agent:** Intelligently decides where to search: your local knowledge base or the web.
4.  **Response Generation Agent:** Synthesizes information from all sources **and the conversation history** to formulate a draft answer.
5.  **Sufficiency Evaluation Agent:** Critically assesses the draft response for accuracy and coherence **within the current context**.
6.  **Final Output Agent:** Formats and presents the validated response and its sources.

## Key Features

- **Conversational AI:** Engage in natural, back-and-forth conversations with context awareness.
- **Local Knowledge Base:** Upload your own `.txt` and `.pdf` documents to be used as a primary information source.
- **Hybrid Retrieval Strategy:** The system intelligently queries your local data first, then searches the web if necessary.
- **Interactive Visualization:** See the status and output of each agent in real-time.
- **Real-time Logging:** A detailed execution log provides transparency into the workflow's decision-making process.

## Technology Stack

- **Frontend:** React, TypeScript, Tailwind CSS
- **PDF Parsing:** Mozilla's `pdf.js`
- **AI / SDK:** Google Gemini API (`@google/genai`)
- **Module Loading:** ES Modules via `esm.sh` for a buildless development experience.

## Disclaimer

This application is a **conceptual prototype**. The interactions between agents, the simulated vector database, and the underlying API calls have been simplified to clearly illustrate the agentic workflow concept.
