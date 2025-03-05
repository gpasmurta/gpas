import React, { useEffect, useMemo, useState } from 'react';
import { useTimeAuditStore } from '../store/timeAuditStore';
import { 
  BarChart3, 
  Zap, 
  Battery, 
  Star, 
  Clock, 
  RefreshCcw, 
  Sparkles, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Bug, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Repeat, 
  CheckSquare,
  Loader2,
  Info
} from 'lucide-react';
import { formatTime, cn } from '../lib/utils';
import { 
  formatDistanceToNow, 
  format, 
  parseISO, 
  isWithinInterval,
  startOfDay,
  endOfDay
} from 'date-fns';
import { DateRangePicker } from './DateRangePicker';
import { useDebugLog } from '../hooks/useDebugLog';
import { useDashboardState } from '../hooks/useDashboardState';
import { safeCalculateDuration, isValidTask, calculateEnergyBalance } from '../utils/taskCalculations';
import { SummaryCard } from './dashboard/SummaryCard';
import { DataTable } from './dashboard/DataTable';
import { TabNavigation } from './dashboard/TabNavigation';
import { LoadingState } from './dashboard/LoadingState';
import { ErrorState } from './dashboard/ErrorState';
import { Tooltip } from './ui/Tooltip';
import { EnhancedAutomationPanel } from './EnhancedAutomationPanel';
import { 
  DashboardTab, 
  AutomationAnalysis, 
  AutomationCandidate, 
  RecurringTask, 
  TaskSummary,
  DateRange 
} from '../types/dashboard';
import { Task, TaskCategory } from '../types';

// Get tasks within a specific date range
function getTasksInDateRange(tasks: Task[], dateRange: DateRange): Task[] {
  return tasks.filter(task => {
    try {
      const taskDate = typeof task.date === 'string' ? parseISO(task.date) : task.date;
      return taskDate >= dateRange.start && taskDate <= dateRange.end;
    } catch (error) {
      console.error('Error filtering task by date range:', error);
      return false;
    }
  });
}

// Calculate task creation and completion counts
function calculateTaskCounts(tasks: Task[], dateRange: DateRange): {
  created: number;
  completed: number;
  completionRate: number;
} {
  let created = 0;
  let completed = 0;

  for (const task of tasks) {
    try {
      const taskDate = typeof task.date === 'string' ? parseISO(task.date) : task.date;
      if (taskDate >= dateRange.start && taskDate <= dateRange.end) {
        created++;
        if (task.isCompleted) {
          completed++;
        }
      }
    } catch (error) {
      console.error('Error calculating task counts:', error);
    }
  }

  return {
    created,
    completed,
    completionRate: created > 0 ? (completed / created) * 100 : 0
  };
}

// Analyze process descriptions to find unique and repeatable processes
function analyzeProcesses(tasks: Task[]): { 
  uniqueCount: number; 
  repeatableCount: number;
  averageTimePerProcess: number;
  processFrequency: Record<string, number>;
} {
  const processes: Record<string, { count: number; totalTime: number }> = {};
  let totalProcessTime = 0;

  for (const task of tasks) {
    if (task.processSummary) {
      const processKey = task.processSummary.trim().toLowerCase();
      
      if (!processes[processKey]) {
        processes[processKey] = { count: 0, totalTime: 0 };
      }
      
      processes[processKey].count++;
      const duration = safeCalculateDuration(task);
      processes[processKey].totalTime += duration;
      totalProcessTime += duration;
    }
  }

  const processKeys = Object.keys(processes);
  const repeatableCount = processKeys.filter(key => processes[key].count > 1).length;
  const processFrequency: Record<string, number> = {};
  
  processKeys.forEach(key => {
    processFrequency[key] = processes[key].count;
  });

  return {
    uniqueCount: processKeys.length,
    repeatableCount,
    averageTimePerProcess: processKeys.length > 0 ? totalProcessTime / processKeys.length : 0,
    processFrequency
  };
}

export function Dashboard() {
  const { 
    tasks, 
    automationAnalysis, 
    isAnalyzing, 
    lastAnalysisDate, 
    runAutomationAnalysis,
    debugMode,
    toggleDebugMode
  } = useTimeAuditStore();
  
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [isAIEnabled, setIsAIEnabled] = useState(false);
  
  const {
    activeTab,
    setActiveTab,
    isLoading,
    dateRange,
    handleDateRangeChange
  } = useDashboardState();

  // Get tasks for the selected date range
  const filteredTasks = useMemo(() => 
    getTasksInDateRange(tasks, dateRange),
    [tasks, dateRange]
  );

  // Add debug logging
  useDebugLog('Dashboard data:', {
    dateRange,
    filteredTasksCount: filteredTasks.length,
    filteredTasks: filteredTasks.map(t => ({
      id: t.id,
      title: t.title,
      startTime: t.startTime,
      endTime: t.endTime,
      energy: t.energy
    }))
  });

  // Calculate derived data
  const categoryDistribution = useMemo(() => {
    const distribution: Partial<Record<TaskCategory, number>> = {};
    
    filteredTasks.forEach(task => {
      try {
        if (!task.category) {
          console.warn('Task missing category:', task);
          return;
        }
        
        const duration = safeCalculateDuration(task);
        
        if (isNaN(duration)) {
          console.warn('Task has invalid duration for category distribution:', task);
          return;
        }
        
        distribution[task.category] = (distribution[task.category] || 0) + duration;
      } catch (error) {
        console.error(`Error processing task for category distribution:`, error);
      }
    });
    
    return distribution as Record<TaskCategory, number>;
  }, [filteredTasks]);

  const totalMinutes = useMemo(() => 
    Object.values(categoryDistribution).reduce((a, b) => a + b, 0),
    [categoryDistribution]
  );

  const energizingTasks = useMemo(() => 
    filteredTasks.filter(t => t.energy === 'gives'),
    [filteredTasks]
  );

  const drainingTasks = useMemo(() => 
    filteredTasks.filter(t => t.energy === 'takes'),
    [filteredTasks]
  );

  const tasksWithProcesses = useMemo(() => 
    filteredTasks.filter(t => t.processSummary),
    [filteredTasks]
  );

  const energyBalanceScore = useMemo(() => 
    calculateEnergyBalance(filteredTasks),
    [filteredTasks]
  );

  const taskCounts = useMemo(() => 
    calculateTaskCounts(tasks, dateRange),
    [tasks, dateRange]
  );

  const processAnalysis = useMemo(() => 
    analyzeProcesses(filteredTasks),
    [filteredTasks]
  );

  // Create a safe version of automationAnalysis with default values
  const safeAutomationAnalysis: AutomationAnalysis = {
    potentialSavings: automationAnalysis?.potentialSavings ?? 0,
    automationTasks: ((automationAnalysis?.automationTasks ?? []).map(task => ({
      ...task,
      complexity: task.complexity ?? 'medium',
      value: (task as any).value ?? 'medium',
      energy: (task as any).energy ?? 'neutral'
    })) as unknown) as AutomationCandidate[],
    recurringTasks: ((automationAnalysis?.recurringTasks ?? []).map(task => ({
      ...task,
      lastOccurrence: (task as any).lastOccurrence ?? new Date(),
      firstOccurrence: (task as any).firstOccurrence ?? new Date()
    })) as unknown) as RecurringTask[],
    complexityBreakdown: automationAnalysis?.complexityBreakdown ?? { low: 0, medium: 0, high: 0 },
    lastUpdated: automationAnalysis?.lastUpdated ?? new Date(),
    dateRange: automationAnalysis?.dateRange ?? dateRange,
    taskCount: automationAnalysis?.taskCount ?? 0,
    hasEnoughData: automationAnalysis?.hasEnoughData ?? false,
    taskSummary: {
      totalTasks: automationAnalysis?.taskSummary?.totalTasks ?? 0,
      completedTasks: automationAnalysis?.taskSummary?.completedTasks ?? 0,
      completionRate: automationAnalysis?.taskSummary?.completionRate ?? 0,
      averageDuration: automationAnalysis?.taskSummary?.averageDuration ?? 0,
      totalDuration: automationAnalysis?.taskSummary?.totalDuration ?? 0,
      categoryDistribution: {
        work: (automationAnalysis?.taskSummary?.categoryDistribution as any)?.work ?? 0,
        personal: (automationAnalysis?.taskSummary?.categoryDistribution as any)?.personal ?? 0,
        health: (automationAnalysis?.taskSummary?.categoryDistribution as any)?.health ?? 0,
        learning: (automationAnalysis?.taskSummary?.categoryDistribution as any)?.learning ?? 0,
        other: (automationAnalysis?.taskSummary?.categoryDistribution as any)?.other ?? 0
      },
      energyDistribution: {
        gives: (automationAnalysis?.taskSummary?.energyDistribution as any)?.gives ?? 0,
        takes: (automationAnalysis?.taskSummary?.energyDistribution as any)?.takes ?? 0,
        neutral: (automationAnalysis?.taskSummary?.energyDistribution as any)?.neutral ?? 0
      }
    }
  };

  // Run automation analysis when switching to automation tab or changing date range
  useEffect(() => {
    if (activeTab === 'automation' && tasks.length > 0) {
      const shouldAnalyze = !lastAnalysisDate || 
        (new Date().getTime() - lastAnalysisDate.getTime() > 24 * 60 * 60 * 1000);
      
      if (shouldAnalyze) {
        runAutomationAnalysis(dateRange);
      }
    }
  }, [activeTab, tasks.length, lastAnalysisDate, runAutomationAnalysis, dateRange]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Navigation and Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <TabNavigation 
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <DateRangePicker 
            selectedRange={dateRange}
            onRangeChange={handleDateRangeChange}
          />
          <div className="text-sm text-gray-500">
            Analyzed {tasks.length} tasks in this time period
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && <LoadingState />}

      {!isLoading && activeTab === 'analytics' ? (
        /* Analytics Tab Content */
        <>
          {filteredTasks.length === 0 ? (
            <ErrorState
              message="No tasks found for the selected time period. Try selecting a different date range or add new tasks in the Timeline view."
            />
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard
                  title="Total Time Tracked"
                  value={`${Math.round(totalMinutes / 60 * 10) / 10}h`}
                  icon={<Clock className="w-5 h-5" />}
                  tooltip="Total time spent on all tasks within the selected date range."
                  subtitle={`${filteredTasks.length} tasks logged`}
                />

                <SummaryCard
                  title="Energizing Tasks"
                  value={energizingTasks.length}
                  icon={<Zap className="w-5 h-5" />}
                  tooltip="Tasks that give you energy and leave you feeling motivated."
                  subtitle={`${filteredTasks.length ? Math.round(energizingTasks.length / filteredTasks.length * 100) : 0}% of total tasks`}
                />

                <SummaryCard
                  title="Draining Tasks"
                  value={drainingTasks.length}
                  icon={<Battery className="w-5 h-5" />}
                  tooltip="Tasks that drain your energy and may be candidates for delegation or automation."
                  subtitle={`${filteredTasks.length ? Math.round(drainingTasks.length / filteredTasks.length * 100) : 0}% of total tasks`}
                />

                <SummaryCard
                  title="Documented Processes"
                  value={tasksWithProcesses.length}
                  icon={<FileText className="w-5 h-5" />}
                  tooltip="Tasks with detailed process descriptions that can be analyzed for automation potential."
                  subtitle={`${filteredTasks.length ? Math.round(tasksWithProcesses.length / filteredTasks.length * 100) : 0}% of total tasks`}
                />
              </div>

              {/* Energy Balance Score and Task Completion */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Energy Balance Score */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-2 mb-4">
                    {energyBalanceScore >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                    <h2 className="text-lg font-semibold">Daily Energy Balance Score</h2>
                    <Tooltip content="The net energy impact of your tasks, calculated as the total minutes of 'Gives Energy' tasks minus 'Takes Energy' tasks. A positive score indicates more energizing activities." />
                  </div>
                  <div className="flex items-center">
                    <div className={cn(
                      "text-4xl font-bold",
                      energyBalanceScore >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {isNaN(energyBalanceScore / 60) ? '0h' : `${energyBalanceScore >= 0 ? "+" : "-"}${Math.round(Math.abs(energyBalanceScore) / 60 * 10) / 10}h`}
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span>Energizing: {Math.round(energizingTasks.reduce((sum, task) => sum + safeCalculateDuration(task), 0) / 60 * 10) / 10}h</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-1">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span>Draining: {Math.round(drainingTasks.reduce((sum, task) => sum + safeCalculateDuration(task), 0) / 60 * 10) / 10}h</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-green-500 h-full" 
                      style={{ 
                        width: `${Math.min(100, Math.max(0, (energizingTasks.reduce((sum, task) => sum + safeCalculateDuration(task), 0) / totalMinutes) * 100))}%` 
                      }}
                    ></div>
                    <div 
                      className="bg-red-500 h-full" 
                      style={{ 
                        width: `${Math.min(100, Math.max(0, (drainingTasks.reduce((sum, task) => sum + safeCalculateDuration(task), 0) / totalMinutes) * 100))}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {energyBalanceScore >= 0 
                      ? "Your energy balance is positive! You're spending more time on tasks that energize you."
                      : "Your energy balance is negative. Consider delegating or automating more draining tasks."}
                  </p>
                </div>

                {/* Task Completion Card */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold">Task Completion Tracker</h2>
                    <Tooltip content="Shows the number of tasks created and completed during the selected time period. The completion rate is the percentage of tasks that were completed." />
                  </div>
                  <div className="flex items-center">
                    <div className="text-4xl font-bold text-blue-600">
                      {taskCounts.completionRate}%
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span>Created: {taskCounts.created} tasks</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-1">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span>Completed: {taskCounts.completed} tasks</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full" 
                      style={{ 
                        width: `${taskCounts.completionRate}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {taskCounts.completionRate >= 80 
                      ? "Great job! You're completing most of your planned tasks."
                      : taskCounts.completionRate >= 50
                        ? "You're making good progress on your tasks."
                        : "Consider breaking down tasks into smaller, more manageable pieces."}
                  </p>
                </div>
              </div>

              {/* Logged Processes Overview */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-semibold">Logged Processes Overview</h2>
                  <Tooltip content="Analysis of documented processes from your tasks, showing how many are unique vs. repeatable." />
                </div>
                
                {tasksWithProcesses.length === 0 ? (
                  <div className="text-center py-6">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No processes documented yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Add process descriptions to your tasks to see insights here
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-indigo-50 rounded-lg p-4 text-center">
                        <p className="text-indigo-700 font-medium">Unique Processes</p>
                        <p className="text-3xl font-bold text-gray-900">{processAnalysis.uniqueCount}</p>
                        <p className="text-sm text-gray-500">documented workflows</p>
                      </div>
                      
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <p className="text-green-700 font-medium">Repeatable Processes</p>
                        <p className="text-3xl font-bold text-gray-900">{processAnalysis.repeatableCount}</p>
                        <p className="text-sm text-gray-500">appear in 2+ tasks</p>
                      </div>
                      
                      <div className="bg-blue-50 rounded-lg p-4 text-center">
                        <p className="text-blue-700 font-medium">Avg. Time Per Process</p>
                        <p className="text-3xl font-bold text-gray-900">{processAnalysis.averageTimePerProcess}m</p>
                        <p className="text-sm text-gray-500">per occurrence</p>
                      </div>
                    </div>
                    
                    {/* Most Frequent Processes */}
                    {Object.entries(processAnalysis.processFrequency)
                      .filter(([_, count]) => count > 1)
                      .sort(([_, countA], [__, countB]) => countB - countA)
                      .slice(0, 3)
                      .length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <Repeat className="w-4 h-4 mr-1 text-green-600" />
                            Most Frequent Processes
                          </h3>
                          <div className="space-y-2">
                            {Object.entries(processAnalysis.processFrequency)
                              .filter(([_, count]) => count > 1)
                              .sort(([_, countA], [__, countB]) => countB - countA)
                              .slice(0, 3)
                              .map(([process, count]) => (
                                <div key={process} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                  <span className="text-sm text-gray-700 truncate max-w-[80%]">{process}</span>
                                  <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded">
                                    {count}x
                                  </span>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      )
                    }
                    
                    <p className="text-xs text-gray-500 mt-4">
                      Processes that appear multiple times are prime candidates for automation.
                      {processAnalysis.repeatableCount > 0 ? 
                        " Check the Automation tab for detailed analysis." : 
                        " Add more process descriptions to identify patterns."}
                    </p>
                  </>
                )}
              </div>

              {/* Category Distribution */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-semibold">Time Distribution by Category</h2>
                  <Tooltip content="Breakdown of how your time is distributed across different categories of tasks." />
                </div>
                <div className="space-y-3">
                  {Object.entries(categoryDistribution).length > 0 ? (
                    Object.entries(categoryDistribution).map(([category, minutes]) => (
                      <div key={category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{category}</span>
                          <span className="text-gray-500">{Math.round(minutes / 60 * 10) / 10}h</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(minutes / totalMinutes) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No tasks logged for this period.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Zone of Genius */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <h2 className="text-lg font-semibold">Zone of Genius</h2>
                  </div>
                  <div className="space-y-4">
                    {energizingTasks.slice(0, 3).map(task => (
                      <div key={task.id} className="border-l-4 border-green-500 pl-3">
                        <h3 className="font-medium">{task.title}</h3>
                        <p className="text-sm text-gray-500">
                          {formatTime(task.startTime)} - {formatTime(task.endTime)}
                        </p>
                        {task.processSummary && (
                          <p className="text-xs text-gray-500 mt-1">
                            <span className="font-medium">Process:</span> {task.processSummary}
                          </p>
                        )}
                      </div>
                    ))}
                    {energizingTasks.length === 0 && (
                      <p className="text-gray-500 text-sm">No high-value energizing tasks found yet.</p>
                    )}
                  </div>
                </div>

                {/* Delegation Candidates */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Battery className="w-5 h-5 text-red-500" />
                    <h2 className="text-lg font-semibold">Delegation Candidates</h2>
                  </div>
                  <div className="space-y-4">
                    {drainingTasks.slice(0, 3).map(task => (
                      <div key={task.id} className="border-l-4 border-red-500 pl-3">
                        <h3 className="font-medium">{task.title}</h3>
                        <p className="text-sm text-gray-500">
                          {formatTime(task.startTime)} - {formatTime(task.endTime)}
                        </p>
                        {task.processSummary && (
                          <p className="text-xs text-gray-500 mt-1">
                            <span className="font-medium">Process:</span> {task.processSummary}
                          </p>
                        )}
                      </div>
                    ))}
                    {drainingTasks.length === 0 && (
                      <p className="text-gray-500 text-sm">No low-value draining tasks found yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        /* Automation Tab Content */
        <>
          {/* Analysis Status */}
          {isAnalyzing && (
            <div className="bg-blue-50 text-blue-700 p-4 rounded-lg flex items-center gap-2 mb-4">
              <Loader2 className="w-5 h-5 animate-spin" />
              <p>Analyzing your tasks for automation opportunities...</p>
            </div>
          )}
          
          {!isAnalyzing && lastAnalysisDate && (
            <div className="bg-white shadow rounded-lg p-4 flex items-center justify-between mb-4">
              <div>
                <p className="text-sm">Last analyzed {formatDistanceToNow(lastAnalysisDate)} ago</p>
                {safeAutomationAnalysis.taskCount > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Analyzed {safeAutomationAnalysis.taskCount} tasks in {safeAutomationAnalysis.dateRange.label}
                  </p>
                )}
              </div>
              <button 
                onClick={() => runAutomationAnalysis(dateRange)}
                className="text-blue-600 text-sm hover:text-blue-800 flex items-center gap-1"
              >
                <RefreshCcw className="w-4 h-4" /> Refresh analysis
              </button>
            </div>
          )}

          {/* Potential Time Savings */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold">Potential Time Savings</h2>
              <Tooltip content="Total time that could be saved by automating recurring tasks in the selected time period." />
            </div>
            <p className="text-4xl font-bold text-gray-900">{safeAutomationAnalysis.potentialSavings}h</p>
            <p className="text-sm text-gray-500">{safeAutomationAnalysis.automationTasks.length} tasks automatable</p>
          </div>

          {/* Complexity Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold">Complexity Breakdown</h2>
              <Tooltip content="Automation complexity is determined by task type, frequency, and required integrations. Low complexity tasks are quick wins." />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-green-700 font-medium">Low</p>
                <p className="text-3xl font-bold text-gray-900">{safeAutomationAnalysis.complexityBreakdown.low}</p>
                <p className="text-sm text-gray-500">quick wins</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <p className="text-yellow-700 font-medium">Medium</p>
                <p className="text-3xl font-bold text-gray-900">{safeAutomationAnalysis.complexityBreakdown.medium}</p>
                <p className="text-sm text-gray-500">tasks</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div>
                  <p className="text-red-700 font-medium">High</p>
                  <p className="text-3xl font-bold text-gray-900">{safeAutomationAnalysis.complexityBreakdown.high}</p>
                  <p className="text-sm text-gray-500">tasks</p>
                </div>
              </div>
            </div>
          </div>

          {/* Automation Candidates */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold">Automation Candidates</h2>
                <Tooltip content="Tasks that appear multiple times and are marked as 'Takes Energy' with 'Low' or 'Medium' value are considered highly suitable for automation." />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">AI-Enhanced Analysis</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={isAIEnabled}
                    onChange={() => setIsAIEnabled(!isAIEnabled)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
            
            {isAIEnabled ? (
              <EnhancedAutomationPanel 
                tasks={filteredTasks}
                dateRange={dateRange}
                isAIEnabled={isAIEnabled}
              />
            ) : (
              <DataTable
                columns={[
                  { key: 'title', header: 'Task' },
                  { key: 'timeSpent', header: 'Time Spent', render: (task: AutomationCandidate) => `${task.timeSpent}h` },
                  { key: 'frequency', header: 'Frequency' },
                  { key: 'platform', header: 'Platform' },
                  { key: 'savings', header: 'Est. Savings', render: (task: AutomationCandidate) => `${task.savings}h / ${safeAutomationAnalysis.dateRange.label}` },
                  ...(debugMode ? [{ key: 'matchCount', header: 'Matches', render: (task: AutomationCandidate) => task.matchCount ?? 0 }] : [])
                ]}
                data={safeAutomationAnalysis.automationTasks}
                emptyMessage="No automation candidates found yet. Add more tasks to get insights."
              />
            )}
          </div>

          {/* Recurring Tasks Highlight */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCcw className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold">Recurring Tasks Highlight</h2>
              <Tooltip content="Tasks that appear 3+ times in your history with similar titles and durations. Frequency is calculated based on the average interval between occurrences." />
            </div>
            <DataTable
              columns={[
                { key: 'title', header: 'Task' },
                { key: 'frequency', header: 'Frequency' },
                { key: 'occurrences', header: 'Occurrences', render: (task: RecurringTask) => `${task.occurrences}x` },
                { key: 'avgDuration', header: 'Avg. Duration', render: (task: RecurringTask) => `${task.avgDuration}m` },
                ...(debugMode ? [
                  { key: 'exactMatches', header: 'Exact' },
                  { key: 'similarMatches', header: 'Similar' }
                ] : [])
              ]}
              data={safeAutomationAnalysis.recurringTasks}
              emptyMessage="No recurring tasks found yet. Continue tracking your time to identify patterns."
            />
          </div>
          
          {/* How This Works Section */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <button
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className="w-full p-4 text-left flex items-center justify-between font-medium text-gray-900"
            >
              <span className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                How This Works
              </span>
              {showHowItWorks ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            
            {showHowItWorks && (
              <div className="p-4 bg-gray-50 text-sm text-gray-700 space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Potential Time Savings</h3>
                  <p>Total time spent on tasks that appear multiple times in your history. Calculated by multiplying each recurring task's average duration by its frequency in the selected time period.</p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Complexity Rating</h3>
                  <p>Based on task type, description keywords, and category. Low complexity tasks typically involve simple triggers and actions, while high complexity tasks may require custom code or multiple integrations.</p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Recurring Tasks</h3>
                  <p>Tasks that appear 3+ times in your history with similar titles and durations. Frequency is calculated based on the average interval between occurrences.</p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Automation Suitability</h3>
                  <p>Tasks marked as "Takes Energy" with "Low" or "Medium" value that occur regularly are considered highly suitable for automation. Tasks highlighted in green are the best candidates for automation.</p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Process Descriptions</h3>
                  <p>Detailed descriptions of your workflow provide valuable context for automation analysis. Tasks with process descriptions that mention data transfer between systems are prioritized for automation.</p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Date Range</h3>
                  <p>All calculations are based only on tasks within the selected time period. Changing the time period will recalculate all metrics using only tasks from that specific period.</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Debug Mode Toggle */}
          <div className="mt-4 text-right">
            <button
              onClick={toggleDebugMode}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 ml-auto"
            >
              <Bug className="w-3 h-3" />
              {debugMode ? 'Disable Debug Mode' : 'Enable Debug Mode'}
            </button>
          </div>
          
          {/* Data Last Updated */}
          <div className="text-xs text-gray-400 text-center mt-4">
            Data last updated: {format(safeAutomationAnalysis.lastUpdated, 'MMM d, yyyy h:mm a')}
          </div>
        </>
      )}
    </div>
  );
} 