import OpenAI from 'openai';
import { Task, TaskCategory } from '../types';
import { DateRange } from '../components/DateRangePicker';
import { AutomationCandidate, AutomationAnalysis, ComplexityBreakdown, TaskSummary } from '../types/dashboard';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true // Only for demo purposes
});

// Helper functions for task analysis
// These are implemented here to avoid circular dependencies
function findSimilarTasks(tasks: Task[]): Map<string, Task[]> {
  // Group tasks by title similarity
  const taskGroups = new Map<string, Task[]>();
  
  tasks.forEach(task => {
    const normalizedTitle = task.title.trim().toLowerCase();
    if (!taskGroups.has(normalizedTitle)) {
      taskGroups.set(normalizedTitle, []);
    }
    taskGroups.get(normalizedTitle)?.push(task);
  });
  
  return taskGroups;
}

function filterTasksByDateRange(tasks: Task[], dateRange: DateRange): Task[] {
  return tasks.filter(task => {
    const taskDate = new Date(task.date);
    return taskDate >= dateRange.start && taskDate <= dateRange.end;
  });
}

function determineFrequency(tasks: Task[], dateRange: DateRange): string {
  // Simple frequency determination based on task count and date range
  const taskCount = tasks.length;
  const daysDiff = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
  
  if (taskCount / daysDiff >= 0.5) return 'Daily';
  if (taskCount / (daysDiff / 7) >= 0.5) return 'Weekly';
  return 'Monthly';
}

function determineComplexity(tasks: Task[]): 'low' | 'medium' | 'high' {
  // Simple complexity determination
  const avgDuration = tasks.reduce((sum, task) => sum + calculateDurationMinutes(task), 0) / tasks.length;
  
  if (avgDuration < 15) return 'low';
  if (avgDuration < 45) return 'medium';
  return 'high';
}

function calculateDurationMinutes(task: Task): number {
  if (!task.startTime || !task.endTime) return 0;
  
  const start = new Date(task.startTime);
  const end = new Date(task.endTime);
  return (end.getTime() - start.getTime()) / (1000 * 60);
}

// Enhanced types for GPT-powered analysis
export interface AutomationStep {
  description: string;
  importance: 'critical' | 'recommended' | 'optional';
}

export interface EnhancedAutomationCandidate extends AutomationCandidate {
  processAnalysis: string;
  automationApproach: AutomationStep[];
  setupTime: number; // in hours
  implementationUrl?: string;
  taskIds: string[]; // IDs of all matching tasks
}

export interface EnhancedAutomationAnalysis extends AutomationAnalysis {
  enhancedAutomationTasks: EnhancedAutomationCandidate[];
  aiAnalysisDate: Date;
}

interface PreparedTaskGroup {
  title: string;
  occurrences: number;
  tasks: {
    id: string;
    title: string;
    duration: number; // in minutes
    date: string;
    energy: 'gives' | 'takes' | 'neutral';
    value: 'low' | 'medium' | 'high';
    processSummary?: string;
  }[];
}

interface GPTAnalysisResponse {
  automationCandidates: {
    title: string;
    isAutomatable: boolean;
    processAnalysis: string;
    automationApproach: AutomationStep[];
    platform: string;
    complexity: 'low' | 'medium' | 'high';
    setupTime: number;
    estimatedSavings: number;
    implementationUrl?: string;
  }[];
}

// Prepare tasks for GPT analysis
function prepareTasksForGPTAnalysis(taskGroups: Map<string, Task[]>): PreparedTaskGroup[] {
  const preparedGroups: PreparedTaskGroup[] = [];
  
  taskGroups.forEach((tasks, title) => {
    // Only include groups with at least 2 tasks
    if (tasks.length < 2) return;
    
    const preparedTasks = tasks.map(task => ({
      id: task.id,
      title: task.title,
      duration: calculateDurationMinutes(task),
      date: task.date,
      energy: task.energy,
      value: task.value,
      processSummary: task.processSummary
    }));
    
    preparedGroups.push({
      title,
      occurrences: tasks.length,
      tasks: preparedTasks
    });
  });
  
  return preparedGroups;
}

// Call OpenAI API for analysis
async function callOpenAIForAnalysis(tasksData: PreparedTaskGroup[]): Promise<GPTAnalysisResponse> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an automation expert analyzing time tracking data to identify tasks that could be automated.
          
          For each task group provided, analyze:
          1. Whether the task is a good automation candidate
          2. The specific steps involved in the process (from the process descriptions)
          3. What automation approach would work best
          4. Specific implementation steps with tools like Zapier, Make, n8n
          5. The complexity and estimated setup time
          
          Consider a task automatable if:
          - It's repetitive (occurs multiple times)
          - It takes energy from the user (marked as "takes")
          - It has low or medium value
          - It involves data transfer, copying/pasting, or repetitive steps
          - It contains keywords like "check", "update", "process", "send", "report", "email"
          
          Provide an analysis that a non-technical person could understand, with concrete next steps.
          
          Respond with a JSON object containing:
          {
            "automationCandidates": [
              {
                "title": string,
                "isAutomatable": boolean,
                "processAnalysis": string,
                "automationApproach": [
                  {
                    "description": string,
                    "importance": "critical" | "recommended" | "optional"
                  }
                ],
                "platform": string,
                "complexity": "low" | "medium" | "high",
                "setupTime": number,
                "estimatedSavings": number,
                "implementationUrl": string (optional)
              }
            ]
          }`
        },
        {
          role: 'user',
          content: JSON.stringify(tasksData)
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });
    
    if (response.choices[0].message.content) {
      return JSON.parse(response.choices[0].message.content);
    }
    
    throw new Error('Empty response from OpenAI API');
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw new Error('Failed to analyze tasks with GPT');
  }
}

// Format GPT analysis results
function formatGPTAnalysisResults(
  gptAnalysis: GPTAnalysisResponse, 
  taskGroups: Map<string, Task[]>,
  dateRange: DateRange
): EnhancedAutomationAnalysis {
  // Start with empty arrays for automation tasks
  const enhancedAutomationTasks: EnhancedAutomationCandidate[] = [];
  const automationTasks: AutomationCandidate[] = [];
  
  // Process each automation candidate from GPT
  gptAnalysis.automationCandidates.forEach(candidate => {
    if (!candidate.isAutomatable) return;
    
    // Find the corresponding task group
    const taskGroup = taskGroups.get(candidate.title.toLowerCase()) || [];
    if (taskGroup.length === 0) return;
    
    // Calculate total time spent
    const totalDuration = taskGroup.reduce((sum, task) => sum + calculateDurationMinutes(task), 0);
    const timeSpent = Math.round((totalDuration / 60) * 10) / 10; // Convert to hours
    
    // Get task IDs
    const taskIds = taskGroup.map(t => t.id);
    
    // Create enhanced automation candidate
    const enhancedCandidate: EnhancedAutomationCandidate = {
      id: `auto-${crypto.randomUUID().slice(0, 8)}`,
      title: candidate.title,
      timeSpent,
      frequency: determineFrequency(taskGroup, dateRange),
      platform: candidate.platform,
      savings: candidate.estimatedSavings,
      complexity: candidate.complexity,
      matchCount: taskGroup.length,
      taskIds,
      value: 'low', // Default values, would be calculated from task group
      energy: 'takes',
      processAnalysis: candidate.processAnalysis,
      automationApproach: candidate.automationApproach,
      setupTime: candidate.setupTime,
      implementationUrl: candidate.implementationUrl,
      processSummary: taskGroup[0].processSummary
    };
    
    // Add to enhanced automation tasks
    enhancedAutomationTasks.push(enhancedCandidate);
    
    // Also create a standard automation candidate for backward compatibility
    automationTasks.push({
      id: enhancedCandidate.id,
      title: enhancedCandidate.title,
      timeSpent: enhancedCandidate.timeSpent,
      frequency: enhancedCandidate.frequency,
      platform: enhancedCandidate.platform,
      savings: enhancedCandidate.savings,
      complexity: enhancedCandidate.complexity,
      matchCount: enhancedCandidate.matchCount,
      value: enhancedCandidate.value,
      energy: enhancedCandidate.energy,
      processSummary: enhancedCandidate.processSummary
    });
  });
  
  // Calculate complexity breakdown
  const complexityBreakdown: ComplexityBreakdown = {
    low: enhancedAutomationTasks.filter(t => t.complexity === 'low').length,
    medium: enhancedAutomationTasks.filter(t => t.complexity === 'medium').length,
    high: enhancedAutomationTasks.filter(t => t.complexity === 'high').length
  };
  
  // Calculate total potential savings
  const potentialSavings = Math.round(enhancedAutomationTasks.reduce((sum, task) => sum + task.savings, 0) * 10) / 10;
  
  // Create a default task summary
  const taskSummary: TaskSummary = {
    totalTasks: 0,
    completedTasks: 0,
    completionRate: 0,
    averageDuration: 0,
    totalDuration: 0,
    categoryDistribution: {
      work: 0,
      personal: 0,
      health: 0,
      learning: 0,
      other: 0
    },
    energyDistribution: {
      gives: 0,
      takes: 0,
      neutral: 0
    }
  };
  
  // Create the enhanced analysis result
  return {
    potentialSavings,
    automationTasks,
    enhancedAutomationTasks,
    recurringTasks: [], // This would be populated from the standard analysis
    complexityBreakdown,
    lastUpdated: new Date(),
    aiAnalysisDate: new Date(),
    dateRange,
    taskCount: 0, // This would be populated from the standard analysis
    hasEnoughData: enhancedAutomationTasks.length > 0,
    taskSummary
  };
}

// Main function to analyze tasks with GPT
export async function analyzeTasksWithGPT(tasks: Task[], dateRange: DateRange): Promise<EnhancedAutomationAnalysis> {
  try {
    // Filter tasks for the date range
    const filteredTasks = filterTasksByDateRange(tasks, dateRange);
    
    // Group similar tasks
    const taskGroups = findSimilarTasks(filteredTasks);
    
    // Prepare tasks for GPT analysis
    const tasksForAnalysis = prepareTasksForGPTAnalysis(taskGroups);
    
    // Skip API call if no task groups to analyze
    if (tasksForAnalysis.length === 0) {
      return createEmptyEnhancedAnalysis(dateRange);
    }
    
    // Call OpenAI API
    const gptAnalysis = await callOpenAIForAnalysis(tasksForAnalysis);
    
    // Process and format the results
    return formatGPTAnalysisResults(gptAnalysis, taskGroups, dateRange);
  } catch (error) {
    console.error('Error in GPT task analysis:', error);
    return createEmptyEnhancedAnalysis(dateRange);
  }
}

// Create an empty enhanced analysis for error cases
function createEmptyEnhancedAnalysis(dateRange: DateRange): EnhancedAutomationAnalysis {
  // Create a default task summary
  const taskSummary: TaskSummary = {
    totalTasks: 0,
    completedTasks: 0,
    completionRate: 0,
    averageDuration: 0,
    totalDuration: 0,
    categoryDistribution: {
      work: 0,
      personal: 0,
      health: 0,
      learning: 0,
      other: 0
    },
    energyDistribution: {
      gives: 0,
      takes: 0,
      neutral: 0
    }
  };
  
  return {
    potentialSavings: 0,
    automationTasks: [],
    enhancedAutomationTasks: [],
    recurringTasks: [],
    complexityBreakdown: { low: 0, medium: 0, high: 0 },
    lastUpdated: new Date(),
    aiAnalysisDate: new Date(),
    dateRange,
    taskCount: 0,
    hasEnoughData: false,
    taskSummary
  };
} 