import OpenAI from 'openai';
import { TaskCategory } from '../types';
import { useSettingsStore } from '../stores/settingsStore';

// Initialize the OpenAI client
// In a production app, you would store this key securely in environment variables
// For this demo, we'll use a placeholder that should be replaced with a real key
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Only for demo purposes
});

// Helper function to get the current model
const getCurrentModel = () => useSettingsStore.getState().openAIModel;

// Map OpenAI response to our task categories
const categoryMapping: Record<string, TaskCategory> = {
  'work': 'work',
  'personal': 'personal',
  'health': 'health',
  'finance': 'finance',
  'education': 'education',
  'social': 'social',
  'errands': 'errands',
  'home': 'home',
  'admin': 'admin',
  'administrative': 'admin',
  'creative': 'creative',
  'strategic': 'strategic',
  'meetings': 'meetings',
  'meeting': 'meetings'
};

export async function categorizeTask(taskTitle: string): Promise<TaskCategory> {
  if (!OPENAI_API_KEY) {
    console.warn('OpenAI API key not found. Using default category.');
    return 'personal';
  }

  try {
    const response = await openai.chat.completions.create({
      model: getCurrentModel(),
      messages: [
        {
          role: 'system',
          content: 'You are a task categorization assistant. Categorize tasks into exactly one of these categories: Work, Personal, Health, Finance, Education, Social, Errands, Home, Admin, Creative, Strategic, or Meetings. Respond with ONLY the category name, nothing else.'
        },
        {
          role: 'user',
          content: `Categorize this task: "${taskTitle}"`
        }
      ],
      temperature: 0.3,
      max_tokens: 10
    });

    const suggestedCategory = response.choices[0]?.message.content?.trim().toLowerCase() || '';
    
    // Map the response to our task categories
    for (const [key, value] of Object.entries(categoryMapping)) {
      if (suggestedCategory.includes(key)) {
        return value;
      }
    }
    
    // Default to personal if no match found
    return 'personal';
  } catch (error) {
    console.error('Error categorizing task:', error);
    return 'personal';
  }
}

// Transcribe audio using OpenAI Whisper API
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  if (!OPENAI_API_KEY) {
    console.warn('OpenAI API key not found. Cannot transcribe audio.');
    throw new Error('OpenAI API key not found');
  }

  try {
    // Create a form data object to send the audio file
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'whisper-1');
    
    // Make a direct fetch request to the OpenAI API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.text || '';
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
}

// Summarize process description using OpenAI
export async function summarizeProcess(processDescription: string): Promise<string> {
  if (!OPENAI_API_KEY || !processDescription.trim()) {
    // If no API key or empty description, return the original or empty string
    return processDescription;
  }

  try {
    const response = await openai.chat.completions.create({
      model: getCurrentModel(),
      messages: [
        {
          role: 'system',
          content: `You are a process summarization assistant. Your task is to:
          1. Take a detailed process description
          2. Break it down into key steps
          3. Format it as a concise, pipe-separated list of actions
          4. Focus on identifying data sources, destinations, and actions
          5. Respond with ONLY the summarized steps, no explanations or additional text`
        },
        {
          role: 'user',
          content: `Summarize this process into key steps separated by pipes (|): "${processDescription}"`
        }
      ],
      temperature: 0.3,
      max_tokens: 100
    });

    const summary = response.choices[0]?.message.content?.trim() || '';
    return summary;
  } catch (error) {
    console.error('Error summarizing process:', error);
    
    // Fallback to simple summarization if API fails
    return fallbackSummarize(processDescription);
  }
}

// Fallback summarization function when API fails
function fallbackSummarize(text: string): string {
  if (!text.trim()) return '';
  
  // Clean up the text
  const cleanedText = text
    .trim()
    .replace(/\s+/g, ' ') // Remove extra spaces
    .replace(/(\r\n|\n|\r)/gm, ' '); // Remove line breaks
  
  // Split on common separators and join with pipe for brevity
  const steps = cleanedText
    .split(/\s*(?:and|,|then|next|after that|finally)\s*/i)
    .map(step => step.trim())
    .filter(step => step.length > 0);
  
  return steps.join(' | ');
}

export async function testOpenAIConnection(): Promise<{ isWorking: boolean; error?: string }> {
  if (!OPENAI_API_KEY) {
    return { 
      isWorking: false, 
      error: 'OpenAI API key not found. Please check your .env file and ensure VITE_OPENAI_API_KEY is set.' 
    };
  }

  try {
    // Try a simple API call
    const response = await openai.chat.completions.create({
      model: getCurrentModel(),
      messages: [
        {
          role: 'user',
          content: 'test'
        }
      ],
      max_tokens: 5
    });

    return {
      isWorking: true
    };
  } catch (error) {
    console.error('OpenAI API test failed:', error);
    return {
      isWorking: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred while testing OpenAI connection'
    };
  }
}