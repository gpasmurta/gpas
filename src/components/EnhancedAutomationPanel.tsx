import React, { useState, useEffect } from 'react';
import { EnhancedAutomationAnalysis } from '../lib/gptAutomationAnalysis';
import { AutomationCandidateCard } from './AutomationCandidateCard';
import { Sparkles, Clock, AlertTriangle } from 'lucide-react';
import { Task } from '../types';
import { DateRange } from '../components/DateRangePicker';
import { analyzeTasksWithGPT } from '../lib/gptAutomationAnalysis';

interface EnhancedAutomationPanelProps {
  tasks: Task[];
  dateRange: DateRange;
  isAIEnabled: boolean;
}

export function EnhancedAutomationPanel({ 
  tasks, 
  dateRange,
  isAIEnabled
}: EnhancedAutomationPanelProps) {
  const [analysis, setAnalysis] = useState<EnhancedAutomationAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function performAnalysis() {
      if (!isAIEnabled) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await analyzeTasksWithGPT(tasks, dateRange);
        setAnalysis(result);
      } catch (err) {
        console.error('Error analyzing tasks with GPT:', err);
        setError('Failed to analyze tasks. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    }
    
    performAnalysis();
  }, [tasks, dateRange, isAIEnabled]);
  
  if (!isAIEnabled) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-2" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">
          Unlock AI-Enhanced Automation Analysis
        </h3>
        <p className="text-gray-600 mb-4">
          Get deeper insights into your automation opportunities with our AI-powered analysis.
          Identify complex patterns and receive detailed implementation recommendations.
        </p>
        <button 
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md"
          onClick={() => window.alert('This would enable the AI analysis in a real app')}
        >
          Enable AI Analysis
        </button>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">
          Analyzing your tasks with AI to find automation opportunities...
        </p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-6 text-center">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
        <h3 className="text-lg font-medium text-red-700 mb-2">Analysis Error</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    );
  }
  
  if (!analysis || analysis.enhancedAutomationTasks.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <Clock className="w-10 h-10 text-gray-400 mx-auto mb-2" />
        <h3 className="text-lg font-medium text-gray-700 mb-2">
          No Automation Candidates Found
        </h3>
        <p className="text-gray-600">
          We couldn't identify any tasks suitable for automation in the selected time period.
          Try selecting a different date range or add more tasks to get insights.
        </p>
      </div>
    );
  }
  
  return (
    <>
      <div className="text-sm text-gray-500 mb-4 text-right">
        Last updated: {new Date(analysis.aiAnalysisDate).toLocaleString()}
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-purple-700 mb-1">Potential Time Savings</div>
          <div className="text-2xl font-bold text-purple-800">{analysis.potentialSavings}h</div>
          <div className="text-xs text-purple-600">per {dateRange.label.toLowerCase()}</div>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-700 mb-1">Automation Opportunities</div>
          <div className="text-2xl font-bold text-blue-800">{analysis.enhancedAutomationTasks.length}</div>
          <div className="text-xs text-blue-600">tasks identified</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-700 mb-1">Complexity Breakdown</div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-xs text-green-700">Low: {analysis.complexityBreakdown.low}</span>
            
            <span className="inline-block w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="text-xs text-yellow-700">Medium: {analysis.complexityBreakdown.medium}</span>
            
            <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-xs text-red-700">High: {analysis.complexityBreakdown.high}</span>
          </div>
        </div>
      </div>
      
      {/* Automation Candidates */}
      <div className="space-y-4">
        {analysis.enhancedAutomationTasks.map(candidate => (
          <AutomationCandidateCard key={candidate.id} candidate={candidate} />
        ))}
      </div>
    </>
  );
} 