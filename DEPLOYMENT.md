
# Deployment Guide

This document provides instructions on how to set up and run the Agentic RAG Workflow application for both local development and for a production-ready cloud deployment.

## Overview

The application is a static frontend built with React and TypeScript. It communicates directly with the Google Gemini API. The key challenge in deploying such an application is managing the `API_KEY` securely. Exposing an API key on the client-side is a major security risk.

This guide is structured into two parts:
1.  **Local Development:** For running the application on your own machine for testing and development.
2.  **Cloud Deployment:** A secure, production-ready guide for deploying the application using **Firebase Hosting** and **Google Cloud Functions**.

---

## Prerequisites

Before you begin, ensure you have the following:

- **Node.js:** (v18 or later) installed on your system.
- **Google Gemini API Key:** You can obtain one from [Google AI Studio](https://aistudio.google.com/app/apikey).
- **Google Cloud Project:** A Google Cloud account with a project created. Firebase will be linked to this project.
- **Firebase CLI:** The command-line tool for Firebase. Install it globally:
  ```bash
  npm install -g firebase-tools
  ```

---

## Part 1: Local Development Setup

This setup uses a simple workaround to provide the API key to the frontend without modifying the core application code.

### Step 1: Clone the Repository

If you haven't already, clone the project to your local machine.

```bash
git clone <your-repository-url>
cd <repository-directory>
```

### Step 2: Create an Environment File

The application code expects the API key to be at `process.env.API_KEY`. In a browser environment, `process.env` does not exist. For local testing, we can simulate it.

1.  In the root of the project, create a new file named `env.js`.
2.  Add the following code to `env.js`, replacing `YOUR_GEMINI_API_KEY` with your actual key:

    ```javascript
    // env.js
    window.process = {
      env: {
        API_KEY: 'YOUR_GEMINI_API_KEY'
      }
    };
    ```

    **Note:** This file should NOT be committed to version control. Add `env.js` to your `.gitignore` file.

### Step 3: Include the Environment File

To make the key available to the application, you need to load this `env.js` file.

1.  Open the `index.html` file.
2.  Add a script tag for `env.js` **before** the existing `importmap` script tag. This is crucial so that `window.process` is defined before any other script tries to access it.

    ```html
    <!-- index.html -->
    ...
    </script>
    <!-- ADD THIS LINE FOR LOCAL DEVELOPMENT -->
    <script src="env.js"></script>
    
    <script type="importmap">
    {
    ...
    ```

### Step 4: Run the Application

Since this is a static site without a build step, you just need a simple local web server.

1.  If you have Node.js, you can use the `serve` package:
    ```bash
    # Install serve if you don't have it
    npm install -g serve
    
    # Run the server from the project root
    serve .
    ```
2.  Alternatively, if you have Python 3 installed:
    ```bash
    python3 -m http.server
    ```

3.  Open your browser and navigate to the URL provided by the server (e.g., `http://localhost:3000` or `http://localhost:8000`). The application should now be running.

---

## Part 2: Cloud Deployment (Secure & Recommended)

Deploying the app as-is would expose your Gemini API key to anyone who inspects the site's code. **This is a severe security risk.**

The recommended approach is to use a backend function as a proxy. The frontend will call this function, and the function, running securely on the server, will call the Gemini API with the key. We will use **Firebase Hosting** for our static files and **Google Cloud Functions** for our secure proxy.

### Step 1: Initialize Firebase

1.  Log in to Firebase using your Google account:
    ```bash
    firebase login
    ```
2.  Navigate to your project's root directory and initialize Firebase.
    ```bash
    firebase init
    ```
3.  Choose the following options when prompted:
    - **Which Firebase features do you want to set up?** -> Select `Hosting` and `Functions`.
    - **Project Setup** -> `Use an existing project` and select your Google Cloud project.
    - **Functions Setup**:
        - `Language` -> `TypeScript`.
        - `Use TSLint?` -> `Yes` (or ESLint if offered).
        - `Install dependencies now?` -> `Yes`.
    - **Hosting Setup**:
        - `What do you want to use as your public directory?` -> `.` (enter a single period for the root directory).
        - `Configure as a single-page app?` -> `Yes`.
        - `Set up automatic builds and deploys with GitHub?` -> `No` (for now).

This will create a `functions` directory, a `firebase.json` file, and a `.firebaserc` file.

### Step 2: Securely Set Your API Key

Store your Gemini API key in the Firebase environment configuration. This is secure and won't be exposed on the client side.

```bash
firebase functions:config:set gemini.key="YOUR_GEMINI_API_KEY"
```

### Step 3: Create the Cloud Function Proxy

Replace the contents of `functions/src/index.ts` with the following code. This creates an HTTP endpoint that forwards requests to the Gemini API.

```typescript
// functions/src/index.ts

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {GoogleGenAI} from "@google/genai";
import {defineString} from "firebase-functions/params";

// Load the API Key securely from Firebase environment config
const geminiApiKey = defineString("GEMINI_KEY");

export const geminiProxy = onRequest(
    {cors: true}, // Enable CORS for requests from your web app
    async (request, response) => {
      if (request.method !== "POST") {
        response.status(405).send("Method Not Allowed");
        return;
      }

      try {
        const ai = new GoogleGenAI({apiKey: geminiApiKey.value()});

        // The request body from our frontend will match the Gemini SDK's format
        const {model, contents, config} = request.body;

        logger.info(`Proxying request to model: ${model}`, {structuredData: true});

        const result = await ai.models.generateContent({
          model,
          contents,
          config,
        });

        // Forward the successful response from Gemini back to the client
        response.json(result);
      } catch (error) {
        logger.error("Error calling Gemini API:", error);
        if (error instanceof Error) {
            response.status(500).json({ error: error.message });
        } else {
            response.status(500).json({ error: "An unknown error occurred" });
        }
      }
    });
```
*Note: This example covers `generateContent`. You would expand it with additional checks and logic for other service calls like `generateImages` if needed.*

### Step 4: Modify Frontend to Use the Proxy

Now, you need to change `services/geminiService.ts` to call your new Cloud Function instead of calling the Gemini API directly.

**This is a conceptual guide; you must apply these changes to your local `geminiService.ts` file.**

The core idea is to replace direct `@google/genai` calls with `fetch` calls to your proxy URL.

**Example Change for `generateContent`:**

```typescript
// In services/geminiService.ts (conceptual change)

// You will get this URL after you deploy the function for the first time.
// It looks like: https://geminiproxy-yourproject.run.app
const PROXY_URL = "YOUR_CLOUD_FUNCTION_URL";

// ... inside a method like generateResponse

const payload = {
    model: "gemini-2.5-flash",
    contents: query,
    config: {
        tools: useWebSearch ? [{ googleSearch: {} }] : [],
        systemInstruction: systemInstruction,
    },
};

const proxyResponse = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
});

if (!proxyResponse.ok) {
    const errorBody = await proxyResponse.json();
    throw new Error(errorBody.error || "Request to proxy failed");
}

const geminiResult = await proxyResponse.json();

// The structure of geminiResult should match the original GenerateContentResponse
// so the rest of your code can remain the same.
const text = geminiResult.text; 
// ... and so on
```

You would apply a similar pattern to `refineQuery`, `evaluateResponse`, etc. Each would become a `fetch` call to your proxy.

### Step 5: Deploy to Firebase

Once your code is updated to use the proxy, deploy everything.

1.  Make sure your `index.html` **does not** include the `<script src="env.js"></script>` line used for local development.
2.  Run the deploy command from your project's root directory:
    ```bash
    firebase deploy
    ```

Firebase will deploy your static files to Hosting and your proxy function to Cloud Functions. It will give you a **Hosting URL** to access your live application and a **Function URL** that you need to use for the `PROXY_URL` constant in `geminiService.ts`. You may need to deploy the function first, get the URL, update your service file, and then deploy everything again.

Your application is now live on the web, and your API key is secure!
