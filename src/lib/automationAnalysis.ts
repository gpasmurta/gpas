import OpenAI from 'openai';
import { Task } from '../types';
import { subDays, format, differenceInDays, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { DateRange } from '../components/DateRangePicker';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true // Only for demo purposes
});

export interface AutomationCandidate {
  id: string;
  title: string;
  timeSpent: number; // in hours
  frequency: string; // 'Daily', 'Weekly', 'Monthly'
  platform: string; // 'Zapier', 'Make', 'n8n', etc.
  savings: number; // estimated hours saved per month
  complexity: 'low' | 'medium' | 'high';
  matchCount: number; // Number of matching tasks found
  taskIds: string[]; // IDs of all matching tasks
}

export interface RecurringTask {
  id: string;
  title: string;
  frequency: string;
  occurrences: number;
  avgDuration: number; // in minutes
  automatable: boolean;
  exactMatches: number; // Number of exact title matches
  similarMatches: number; // Number of similar title matches
  taskIds: string[]; // IDs of all matching tasks
}

export interface ComplexityBreakdown {
  low: number;
  medium: number;
  high: number;
}

export interface TaskSummary {
  [key: string]: number; // Title -> count mapping
}

export interface AutomationAnalysis {
  potentialSavings: number; // in hours
  automationTasks: AutomationCandidate[];
  recurringTasks: RecurringTask[];
  complexityBreakdown: ComplexityBreakdown;
  lastUpdated: Date;
  dateRange: DateRange;
  taskCount: number; // Total number of tasks analyzed
  hasEnoughData: boolean; // Whether there's enough data for reliable analysis
  taskSummary?: TaskSummary; // Summary of task titles and counts
}

// Default empty analysis
export const emptyAnalysis: AutomationAnalysis = {
  potentialSavings: 0,
  automationTasks: [],
  recurringTasks: [],
  complexityBreakdown: { low: 0, medium: 0, high: 0 },
  lastUpdated: new Date(),
  dateRange: {
    start: new Date(),
    end: new Date(),
    label: 'No data available'
  },
  taskCount: 0,
  hasEnoughData: false,
  taskSummary: {}
};

// Get tasks within a specific date range
export function getTasksInDateRange(tasks: Task[], dateRange: DateRange): Task[] {
  const filteredTasks = tasks.filter(task => {
    try {
      // Parse the task date and ensure it's a valid date
      const taskDate = parseISO(task.date);
      
      // Check if the task date is within the date range (inclusive of start and end)
      const isInRange = isWithinInterval(taskDate, { 
        start: startOfDay(dateRange.start), 
        end: endOfDay(dateRange.end) 
      });
      
      return isInRange;
    } catch (error) {
      console.error(`Error filtering task with date ${task.date}:`, error);
      return false;
    }
  });
  
  // Debug logging
  console.log(`Filtered ${tasks.length} tasks to ${filteredTasks.length} tasks in range ${dateRange.label}`);
  console.log(`Date range: ${dateRange.start.toISOString()} to ${dateRange.end.toISOString()}`);
  
  return filteredTasks;
}

// Create a summary of tasks by title
function createTaskSummary(tasks: Task[]): TaskSummary {
  const summary: TaskSummary = {};
  
  tasks.forEach(task => {
    const title = task.title.trim();
    summary[title] = (summary[title] || 0) + 1;
  });
  
  return summary;
}

// Format tasks for OpenAI analysis
function formatTasksForAnalysis(tasks: Task[], dateRange: DateRange): string {
  return tasks.map(task => {
    return `
Task: ${task.title}
Date: ${task.date}
Time: ${task.startTime} - ${task.endTime}
Duration: ${calculateDurationMinutes(task)}m
Category: ${task.category}
Energy: ${task.energy}
Value: ${task.value}
Notes: ${task.notes || 'None'}
Process: ${task.processSummary || 'None'}
---`;
  }).join('\n');
}

// Calculate task duration in minutes
export function calculateDurationMinutes(task: Task): number {
  try {
    const start = new Date(`1970-01-01T${task.startTime}`);
    const end = new Date(`1970-01-01T${task.endTime}`);
    return (end.getTime() - start.getTime()) / (1000 * 60);
  } catch (error) {
    console.error(`Error calculating duration for task:`, error);
    return 15; // Default to 15 minutes if calculation fails
  }
}

// Find similar tasks based on title similarity
function findSimilarTasks(tasks: Task[]): Map<string, Task[]> {
  const taskGroups = new Map<string, Task[]>();
  
  // First pass: group by exact title matches
  tasks.forEach(task => {
    const normalizedTitle = task.title.trim().toLowerCase();
    if (!taskGroups.has(normalizedTitle)) {
      taskGroups.set(normalizedTitle, []);
    }
    taskGroups.get(normalizedTitle)?.push(task);
  });
  
  // Second pass: fuzzy matching for similar titles
  const processedGroups = new Map<string, Task[]>();
  
  // First add all exact matches
  taskGroups.forEach((taskList, title) => {
    processedGroups.set(title, [...taskList]);
  });
  
  // Then look for similar titles for ungrouped tasks
  tasks.forEach(task => {
    const normalizedTitle = task.title.trim().toLowerCase();
    
    // Skip if this task is already in a group with 2+ tasks
    if (taskGroups.get(normalizedTitle)?.length >= 2) {
      return;
    }
    
    // Check for similar titles
    let foundMatch = false;
    processedGroups.forEach((taskList, groupTitle) => {
      // Simple similarity check: title contains or is contained by the group title
      // or they share significant words
      if (!foundMatch && (
        normalizedTitle.includes(groupTitle) || 
        groupTitle.includes(normalizedTitle) ||
        shareSignificantWords(normalizedTitle, groupTitle)
      )) {
        taskList.push(task);
        foundMatch = true;
      }
    });
    
    // If no match found and not already processed, create a new group
    if (!foundMatch && !processedGroups.has(normalizedTitle)) {
      processedGroups.set(normalizedTitle, [task]);
    }
  });
  
  return processedGroups;
}

// Helper function to check if two strings share significant words
function shareSignificantWords(str1: string, str2: string): boolean {
  const words1 = str1.split(/\s+/).filter(word => word.length > 3);
  const words2 = str2.split(/\s+/).filter(word => word.length > 3);
  
  // Check if they share any significant words
  return words1.some(word => words2.includes(word));
}

// Determine frequency based on task occurrences and date range
function determineFrequency(tasks: Task[], dateRange: DateRange): string {
  if (tasks.length < 2) return 'Unknown';
  
  // Sort tasks by date
  const sortedTasks = [...tasks].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Calculate average days between occurrences
  let totalDays = 0;
  for (let i = 1; i < sortedTasks.length; i++) {
    const daysBetween = differenceInDays(
      new Date(sortedTasks[i].date),
      new Date(sortedTasks[i-1].date)
    );
    totalDays += daysBetween;
  }
  
  const avgDaysBetween = totalDays / (sortedTasks.length - 1);
  
  // Determine frequency based on average days between occurrences
  if (avgDaysBetween <= 1.5) return 'Daily';
  if (avgDaysBetween <= 3.5) return 'Every few days';
  if (avgDaysBetween <= 7.5) return 'Weekly';
  if (avgDaysBetween <= 14.5) return 'Bi-weekly';
  return 'Monthly';
}

// Calculate automation suitability score (0-100)
function calculateAutomationSuitability(task: Task): number {
  let score = 0;
  
  // Energy impact
  if (task.energy === 'takes') score += 30;
  
  // Value rating
  if (task.value === 'low') score += 30;
  else if (task.value === 'medium') score += 15;
  
  // Category suitability
  const automationFriendlyCategories = ['admin', 'errands', 'finance'];
  if (automationFriendlyCategories.includes(task.category)) score += 20;
  
  // Title keywords
  const automationKeywords = ['check', 'update', 'process', 'send', 'report', 'email', 'schedule', 'review'];
  if (automationKeywords.some(keyword => task.title.toLowerCase().includes(keyword))) {
    score += 20;
  }
  
  // Process description
  if (task.processSummary) {
    const dataTransferKeywords = ['copy', 'paste', 'transfer', 'move', 'export', 'import', 'download', 'upload'];
    if (dataTransferKeywords.some(keyword => task.processSummary?.toLowerCase().includes(keyword))) {
      score += 30;
    }
  }
  
  return Math.min(score, 100);
}

// Determine automation complexity
function determineComplexity(tasks: Task[]): 'low' | 'medium' | 'high' {
  // Calculate average automation suitability
  const avgSuitability = tasks.reduce((sum, task) => sum + calculateAutomationSuitability(task), 0) / tasks.length;
  
  // Determine complexity based on suitability score
  if (avgSuitability >= 70) return 'low';
  if (avgSuitability >= 40) return 'medium';
  return 'high';
}

// Recommend automation platform based on task characteristics
function recommendPlatform(tasks: Task[]): string {
  const categories = tasks.map(t => t.category);
  const titles = tasks.map(t => t.title.toLowerCase());
  const processes = tasks.map(t => t.processSummary?.toLowerCase() || '');
  
  // Check for data transfer processes
  if (processes.some(p => 
    p.includes('google sheets') || 
    p.includes('excel') || 
    p.includes('spreadsheet') ||
    p.includes('copy') && p.includes('paste')
  )) {
    return 'Make';
  }
  
  // Check for email-related tasks
  if (titles.some(t => t.includes('email') || t.includes('mail'))) {
    return 'Zapier';
  }
  
  // Check for finance-related tasks
  if (categories.includes('finance') || titles.some(t => t.includes('invoice') || t.includes('payment'))) {
    return 'Make';
  }
  
  // Check for social media tasks
  if (titles.some(t => t.includes('social') || t.includes('post') || t.includes('media'))) {
    return 'Buffer';
  }
  
  // Default to n8n for more technical tasks
  return 'n8n';
}

// Check if a task is automatable based on energy and value
function isTaskAutomatable(task: Task): boolean {
  // Low value + draining tasks are prime automation candidates
  if (task.energy === 'takes' && task.value === 'low') {
    return true;
  }
  
  // Medium value + draining tasks are also good candidates
  if (task.energy === 'takes' && task.value === 'medium') {
    return true;
  }
  
  // Check for automation keywords in the title
  const automationKeywords = ['check', 'update', 'process', 'send', 'report', 'email', 'schedule', 'review'];
  if (automationKeywords.some(keyword => task.title.toLowerCase().includes(keyword))) {
    return true;
  }
  
  // Check for data transfer in process description
  if (task.processSummary) {
    const dataTransferKeywords = ['copy', 'paste', 'transfer', 'move', 'export', 'import', 'download', 'upload'];
    if (dataTransferKeywords.some(keyword => task.processSummary?.toLowerCase().includes(keyword))) {
      return true;
    }
  }
  
  return false;
}

// Analyze tasks for automation potential using local logic
export function analyzeTasksLocally(tasks: Task[], dateRange: DateRange): AutomationAnalysis {
  // Create task summary
  const taskSummary = createTaskSummary(tasks);
  
  // Check if we have enough data
  const hasEnoughData = tasks.length >= 3;
  
  // Find similar tasks
  const taskGroups = findSimilarTasks(tasks);
  
  // Generate recurring tasks
  const recurringTasks: RecurringTask[] = [];
  const automationTasks: AutomationCandidate[] = [];
  
  taskGroups.forEach((taskList, title) => {
    // Skip if fewer than 2 tasks
    if (taskList.length < 2) return;
    
    // Calculate average duration
    const totalDuration = taskList.reduce((sum, task) => sum + calculateDurationMinutes(task), 0);
    const avgDuration = Math.round(totalDuration / taskList.length);
    
    // Count exact matches vs similar matches
    const exactMatches = taskList.filter(t => t.title.trim().toLowerCase() === title).length;
    const similarMatches = taskList.length - exactMatches;
    
    // Get task IDs
    const taskIds = taskList.map(t => t.id);
    
    // Determine if task is automatable
    // A task is automatable if ANY of the instances are "takes energy" and "low/medium value"
    const automatable = taskList.some(isTaskAutomatable);
    
    // Determine frequency
    const frequency = determineFrequency(taskList, dateRange);
    
    // Calculate time spent in hours (based on actual total duration)
    const timeSpent = Math.round((totalDuration / 60) * 10) / 10;
    
    // Determine complexity
    const complexity = determineComplexity(taskList);
    
    // Calculate estimated savings (based on actual time spent)
    // For the selected time period, not extrapolated
    const savings = Math.round(timeSpent * 0.8 * 10) / 10; // Assume 80% can be saved
    
    // Add to recurring tasks
    recurringTasks.push({
      id: `rec-${crypto.randomUUID().slice(0, 8)}`,
      title: taskList[0].title, // Use the title of the first task in the group
      frequency,
      occurrences: taskList.length,
      avgDuration,
      automatable,
      exactMatches,
      similarMatches,
      taskIds
    });
    
    // If automatable, add to automation candidates
    if (automatable) {
      automationTasks.push({
        id: `auto-${crypto.randomUUID().slice(0, 8)}`,
        title: taskList[0].title,
        timeSpent,
        frequency,
        platform: recommendPlatform(taskList),
        savings,
        complexity,
        matchCount: taskList.length,
        taskIds
      });
    }
  });
  
  // Calculate complexity breakdown
  const complexityBreakdown: ComplexityBreakdown = {
    low: automationTasks.filter(t => t.complexity === 'low').length,
    medium: automationTasks.filter(t => t.complexity === 'medium').length,
    high: automationTasks.filter(t => t.complexity === 'high').length
  };
  
  // Calculate total potential savings
  const potentialSavings = Math.round(automationTasks.reduce((sum, task) => sum + task.savings, 0) * 10) / 10;
  
  return {
    potentialSavings,
    automationTasks,
    recurringTasks,
    complexityBreakdown,
    lastUpdated: new Date(),
    dateRange,
    taskCount: tasks.length,
    hasEnoughData,
    taskSummary
  };
}

// Analyze tasks for automation potential
export async function analyzeTasksForAutomation(
  tasks: Task[], 
  dateRange: DateRange
): Promise<AutomationAnalysis> {
  // Filter tasks for the selected date range
  const tasksInRange = getTasksInDateRange(tasks, dateRange);
  
  // Create task summary for debugging
  const taskSummary = createTaskSummary(tasksInRange);
  console.log('Task summary:', taskSummary);
  
  // If we don't have enough data, use local analysis
  if (tasksInRange.length < 3 || !openai.apiKey) {
    console.log('Using local analysis due to insufficient data or missing API key');
    return analyzeTasksLocally(tasksInRange, dateRange);
  }

  const formattedTasks = formatTasksForAnalysis(tasksInRange, dateRange);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an automation expert analyzing time tracking data to identify tasks that could be automated. 
          
          Analyze the provided tasks and identify:
          1. Repetitive tasks based on title similarity and frequency
          2. Tasks that take energy and are low/medium value
          3. Tasks with keywords like "check", "update", "process", "send", "report", "email"
          4. Tasks that occur at regular intervals
          5. Short tasks (15-30m) that add up to significant time
          6. Tasks with process descriptions that indicate data transfer, copying/pasting, or repetitive steps
          
          IMPORTANT: Tasks with identical titles (like "Email") should be counted as a single recurring task series.
          IMPORTANT: Low Value + Draining tasks that appear 3+ times should ALWAYS be counted as automatable.
          IMPORTANT: Calculate time savings based on the combined duration of all matching tasks.
          IMPORTANT: Pay special attention to process descriptions that mention copying data between systems.
          
          For each automation candidate, determine:
          - Appropriate automation platform (Zapier, Make, n8n, etc.)
          - Complexity of automation (low, medium, high)
          - Estimated time savings for the specific time period
          - Number of matching tasks found
          
          Respond with a JSON object containing:
          {
            "potentialSavings": number, // total hours that could be saved in this time period
            "automationTasks": [
              {
                "id": string,
                "title": string,
                "timeSpent": number, // hours spent on this task
                "frequency": string, // "Daily", "Weekly", "Monthly"
                "platform": string, // recommended automation platform
                "savings": number, // estimated hours saved in this time period
                "complexity": string, // "low", "medium", "high"
                "matchCount": number // number of matching tasks found
              }
            ],
            "recurringTasks": [
              {
                "id": string,
                "title": string,
                "frequency": string,
                "occurrences": number,
                "avgDuration": number, // in minutes
                "automatable": boolean,
                "exactMatches": number, // number of exact title matches
                "similarMatches": number // number of similar title matches
              }
            ],
            "complexityBreakdown": {
              "low": number,
              "medium": number,
              "high": number
            }
          }`
        },
        {
          role: 'user',
          content: `Here are my tasks from ${dateRange.label}. Please analyze them for automation potential:\n\n${formattedTasks}`
        }
      ],
      temperature: 0.5,
      max_tokens: 2000
    });

    const analysisText = response.choices[0]?.message.content || '';
    
    try {
      // Extract JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysisJson = JSON.parse(jsonMatch[0]);
        
        // Add task IDs to each automation task and recurring task
        // This is a placeholder since OpenAI doesn't have access to the task IDs
        const tasksByTitle = new Map<string, Task[]>();
        tasksInRange.forEach(task => {
          const title = task.title.toLowerCase().trim();
          if (!tasksByTitle.has(title)) {
            tasksByTitle.set(title, []);
          }
          tasksByTitle.get(title)?.push(task);
        });
        
        // Add task IDs to automation tasks
        analysisJson.automationTasks.forEach((task: any) => {
          const matchingTasks = tasksByTitle.get(task.title.toLowerCase().trim()) || [];
          task.taskIds = matchingTasks.map(t => t.id);
        });
        
        // Add task IDs to recurring tasks
        analysisJson.recurringTasks.forEach((task: any) => {
          const matchingTasks = tasksByTitle.get(task.title.toLowerCase().trim()) || [];
          task.taskIds = matchingTasks.map(t => t.id);
        });
        
        return {
          ...analysisJson,
          lastUpdated: new Date(),
          dateRange,
          taskCount: tasksInRange.length,
          hasEnoughData: tasksInRange.length >= 3,
          taskSummary
        };
      } else {
        console.error('Failed to extract JSON from OpenAI response');
        return analyzeTasksLocally(tasksInRange, dateRange);
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return analyzeTasksLocally(tasksInRange, dateRange);
    }
  } catch (error) {
    console.error('Error analyzing tasks for automation:', error);
    return analyzeTasksLocally(tasksInRange, dateRange);
  }
}

// Generate mock data for testing
export function getMockAnalysis(dateRange: DateRange): AutomationAnalysis {
  // Create a task summary for the mock data
  const taskSummary: TaskSummary = {
    'Email Processing': 20,
    'Daily Standup': 20,
    'Invoice Processing': 4,
    'Report Generation': 4,
    'Social Media Posting': 4
  };
  
  return {
    potentialSavings: 13.5,
    automationTasks: [
      { 
        id: 'auto1', 
        title: 'Email Processing', 
        timeSpent: 10, 
        frequency: 'Daily', 
        platform: 'Zapier', 
        savings: 8,
        complexity: 'low',
        matchCount: 20,
        taskIds: []
      },
      { 
        id: 'auto2', 
        title: 'Invoice Processing', 
        timeSpent: 4, 
        frequency: 'Weekly', 
        platform: 'Make', 
        savings: 3,
        complexity: 'medium',
        matchCount: 4,
        taskIds: []
      },
      { 
        id: 'auto3', 
        title: 'Social Media Posting', 
        timeSpent: 3, 
        frequency: 'Weekly', 
        platform: 'n8n', 
        savings: 2.5,
        complexity: 'low',
        matchCount: 4,
        taskIds: []
      }
    ],
    recurringTasks: [
      { 
        id: 'rec1', 
        title: 'Email Processing', 
        frequency: 'Daily', 
        occurrences: 20, 
        avgDuration: 30,
        automatable: true,
        exactMatches: 18,
        similarMatches: 2,
        taskIds: []
      },
      { 
        id: 'rec2', 
        title: 'Daily Standup', 
        frequency: 'Daily', 
        occurrences: 20, 
        avgDuration: 15,
        automatable: false,
        exactMatches: 20,
        similarMatches: 0,
        taskIds: []
      },
      { 
        id: 'rec3', 
        title: 'Invoice Processing', 
        frequency: 'Weekly', 
        occurrences: 4, 
        avgDuration: 60,
        automatable: true,
        exactMatches: 4,
        similarMatches: 0,
        taskIds: []
      },
      { 
        id: 'rec4', 
        title: 'Report Generation', 
        frequency: 'Weekly', 
        occurrences: 4, 
        avgDuration: 45,
        automatable: true,
        exactMatches: 3,
        similarMatches: 1,
        taskIds: []
      },
      { 
        id: 'rec5', 
        title: 'Social Media Posting', 
        frequency: 'Weekly', 
        occurrences: 4, 
        avgDuration: 45,
        automatable: true,
        exactMatches: 2,
        similarMatches: 2,
        taskIds: []
      }
    ],
    complexityBreakdown: {
      low: 2,
      medium: 1,
      high: 0
    },
    lastUpdated: new Date(),
    dateRange,
    taskCount: 30,
    hasEnoughData: true,
    taskSummary
  };
}