# Vercel Deployment Setup Guide

## Quick Setup Steps

### 1. Set Environment Variable in Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new environment variable:
   - **Name**: `VITE_GEMINI_API_KEY`
   - **Value**: Your actual Gemini API key (e.g., `AIzaSyCkRpRuHKbE1nMY5CQLhoiWP5UH0zRzLqM`)
   - **Environment**: Select all (Production, Preview, Development)

### 2. Redeploy Your Application

After setting the environment variable:
1. Go to **Deployments** tab in Vercel
2. Click **Redeploy** on the latest deployment
3. Or push a new commit to trigger automatic deployment

## Troubleshooting

### If you still get "API_KEY environment variable not set" error:

1. **Check Environment Variable Name**: Make sure it's exactly `VITE_GEMINI_API_KEY`
2. **Check Environment Variable Value**: Ensure your API key is correct
3. **Redeploy**: Environment variables only take effect after redeployment

### If you get 404 errors for favicon.svg:

The favicon.svg file should be automatically included in the build. If not, check that the `public/favicon.svg` file exists.

### Tailwind CSS Production Warning:

This is just a warning and won't break functionality. For production optimization, you can install Tailwind CSS locally, but the CDN version works fine for demos.

## Environment Variable Format

Your environment variable should look like this in Vercel:

```
Name: VITE_GEMINI_API_KEY
Value: AIzaSyCkRpRuHKbE1nMY5CQLhoiWP5UH0zRzLqM
```

Replace the value with your actual API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

## Verification

After deployment, check the browser console. You should NOT see:
- "API_KEY environment variable not set" error
- "Failed to load resource: env.js" error

If the deployment is successful, you should be able to:
1. Upload documents
2. Ask questions
3. See the agent workflow in action
4. Use the human-in-the-loop features when confidence is low