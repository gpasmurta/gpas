import { Task, TaskCategory } from './index';

export type DashboardTab = 'analytics' | 'automation';

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export interface TaskSummary {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  averageDuration: number;
  totalDuration: number;
  categoryDistribution: Record<TaskCategory, number>;
  energyDistribution: {
    gives: number;
    takes: number;
    neutral: number;
  };
}

export interface ComplexityBreakdown {
  low: number;
  medium: number;
  high: number;
}

export interface AutomationCandidate {
  id: string;
  title: string;
  timeSpent: number;
  frequency: string;
  platform: string;
  savings: number;
  matchCount?: number;
  complexity: 'low' | 'medium' | 'high';
  value: 'low' | 'medium' | 'high';
  energy: 'gives' | 'takes' | 'neutral';
  processSummary?: string;
}

export interface RecurringTask {
  id: string;
  title: string;
  frequency: string;
  occurrences: number;
  avgDuration: number;
  exactMatches?: number;
  similarMatches?: number;
  automatable: boolean;
  lastOccurrence: Date;
  firstOccurrence: Date;
}

export interface AutomationAnalysis {
  potentialSavings: number;
  automationTasks: AutomationCandidate[];
  recurringTasks: RecurringTask[];
  complexityBreakdown: ComplexityBreakdown;
  lastUpdated: Date;
  dateRange: DateRange;
  taskCount: number;
  hasEnoughData: boolean;
  taskSummary: TaskSummary;
}

export interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  tooltip: string;
  subtitle?: string;
}

export interface DataTableProps<T = any> {
  columns: {
    key: string;
    header: string;
    render?: (item: T) => React.ReactNode;
  }[];
  data: T[];
  emptyMessage: string;
  debugMode?: boolean;
  className?: string;
}

export interface TabNavigationProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
} 