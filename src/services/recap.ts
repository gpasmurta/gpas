import { supabase, getCurrentUser } from '../lib/supabase';
import { DailyRecap, RecapPreferences } from '../types/recap';
import { analyzeTaskMetrics, analyzeActivityPeriods } from '../utils/recap/taskAnalytics';
import { generateInsights } from '../utils/recap/insightGenerator';
import { Task, TaskCategory } from '../types/task';
import { useTimeAuditStore } from '../store/timeAuditStore';
import { format } from 'date-fns';

class RecapService {
  private generateQuote(): string {
    const quotes = [
      "It's not what we do once in a while that shapes our lives, but what we do CONSISTENTLY!",
      "Your daily choices create your destiny - let's OWN this day and CRUSH tomorrow!",
      "Small actions compound into remarkable results. Keep pushing forward!",
      "Success is built one focused hour at a time. Make each moment count!",
      "Your future is created by what you do today, not tomorrow."
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  private formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date();
    date.setFullYear(year);
    date.setMonth(month - 1);
    date.setDate(day);
    return format(date, 'EEEE, MMM d');
  }

  private generateDaySummary(dateStr: string): string {
    const { getTasksForDate } = useTimeAuditStore.getState();
    const { scheduledTasks, parkingLotTasks } = getTasksForDate(dateStr);
    
    const completedTasks = scheduledTasks.filter(t => t.isCompleted).length;
    const totalScheduledTasks = scheduledTasks.length;
    const parkingLotCount = parkingLotTasks.length;

    const tasksByCategory: Partial<Record<TaskCategory, number>> = {};
    scheduledTasks.forEach(task => {
      const category = task.category;
      tasksByCategory[category] = (tasksByCategory[category] || 0) + 1;
    });

    let summary = `${this.formatDate(dateStr)}\n`;
    
    // Add category summaries
    Object.entries(tasksByCategory).forEach(([category, count]) => {
      if (count !== undefined) {
        summary += `- ${count} ${category} ${count === 1 ? 'task' : 'tasks'} attempted\n`;
      }
    });

    summary += `- ${completedTasks} of ${totalScheduledTasks} tasks completed\n`;
    summary += `- ${parkingLotCount} tasks in parking lot`;

    return summary;
  }

  private generateEnergyPatterns(dateStr: string): string[] {
    const { getTasksForDate } = useTimeAuditStore.getState();
    const { scheduledTasks } = getTasksForDate(dateStr);
    
    const patterns: string[] = [];
    
    // Find earliest and latest tasks
    const sortedTasks = [...scheduledTasks].sort((a, b) => 
      a.timeSlot.localeCompare(b.timeSlot)
    );

    if (sortedTasks.length > 0) {
      patterns.push(`Morning activity started at ${sortedTasks[0].timeSlot}`);
      
      // Check work distribution
      const workTasks = scheduledTasks.filter(t => t.category === 'work');
      const totalWorkMinutes = workTasks.reduce((acc, task) => {
        return acc + (task.timerElapsed || 0) / 60;
      }, 0);
      
      patterns.push(`${Math.round(totalWorkMinutes)} minutes of tracked work time`);
    }

    // Add suggestions
    patterns.push('Consider tracking your energy levels throughout the day');
    patterns.push('Your most productive hours appear to be in the morning');

    return patterns;
  }

  private generateTaskImpact(dateStr: string): string[] {
    const { getTasksForDate } = useTimeAuditStore.getState();
    const { scheduledTasks } = getTasksForDate(dateStr);
    
    const impacts: string[] = [];
    const completedTasks = scheduledTasks.filter(t => t.isCompleted);
    
    if (completedTasks.length === 0) {
      impacts.push('Limited productivity data available for today');
      impacts.push('Consider setting up at least 3 important tasks for tomorrow');
    } else {
      impacts.push(`Completed ${completedTasks.length} tasks today`);
      impacts.push('Building momentum with consistent task completion');
    }

    return impacts;
  }

  private generateCoachInsights(): string[] {
    return [
      'Try scheduling specific tasks rather than using the parking lot',
      'Set realistic time blocks for each task',
      'Consider tracking your energy levels throughout the day',
      'Remember: The gap between knowing and doing is filled with discipline',
      'Your morning routine sets the tone for your entire day - make it count!',
      'Small wins compound into massive results - celebrate even minimal progress'
    ];
  }

  private generatePowerQuestions(): string[] {
    return [
      'What\'s the ONE task that would make tomorrow amazing if completed?',
      'How can you eliminate distractions during your peak energy hours?',
      'What will you do differently tomorrow to raise your standards?',
      'How can you make your time blocks more effective?',
      'What patterns do you notice in your most productive days?'
    ];
  }

  private generateTomorrowFocus(): string[] {
    return [
      'Plan your most important task before 10 AM',
      'Add more structure to your timeline',
      'Consider using time-blocking for focused work periods',
      'Remember your "why" - connect your tasks to your bigger purpose',
      'Set clear boundaries between different types of tasks'
    ];
  }

  private calculateProductivityScore(dateStr: string): number {
    const { getTasksForDate } = useTimeAuditStore.getState();
    const { scheduledTasks } = getTasksForDate(dateStr);
    
    if (scheduledTasks.length === 0) return 0;
    
    const completedTasks = scheduledTasks.filter(t => t.isCompleted).length;
    const baseScore = (completedTasks / scheduledTasks.length) * 100;
    
    // Bonus points for:
    // 1. Having tasks scheduled (up to 10 points)
    const schedulingBonus = Math.min(scheduledTasks.length * 2, 10);
    
    // 2. Time tracking usage (up to 10 points)
    const trackedTasks = scheduledTasks.filter(t => (t.timerElapsed || 0) > 0).length;
    const trackingBonus = (trackedTasks / scheduledTasks.length) * 10;
    
    return Math.min(Math.round(baseScore + schedulingBonus + trackingBonus), 100);
  }

  private calculateTimeDistribution(dateStr: string): { work: number; personal: number; health: number; learning: number } {
    const { getTasksForDate } = useTimeAuditStore.getState();
    const { scheduledTasks } = getTasksForDate(dateStr);
    
    const totalMinutes = scheduledTasks.reduce((acc, task) => {
      return acc + (task.timerElapsed || 0) / 60;
    }, 0);

    if (totalMinutes === 0) {
      return {
        work: 0,
        personal: 0,
        health: 0,
        learning: 0
      };
    }

    const distribution: { [K in TaskCategory]: number } = {
      work: 0,
      personal: 0,
      health: 0,
      learning: 0
    };
    
    scheduledTasks.forEach(task => {
      const minutes = (task.timerElapsed || 0) / 60;
      distribution[task.category] = Math.round((minutes / totalMinutes) * 100);
    });

    return distribution;
  }

  async generateRecap(dateStr: string): Promise<DailyRecap> {
    const { getTasksForDate } = useTimeAuditStore.getState();
    const { scheduledTasks, parkingLotTasks } = getTasksForDate(dateStr);

    const recap: DailyRecap = {
      id: `recap-${dateStr}`,
      date: dateStr,
      insights: {
        quote: this.generateQuote(),
        daySummary: this.generateDaySummary(dateStr),
        energyPatterns: this.generateEnergyPatterns(dateStr),
        taskImpact: this.generateTaskImpact(dateStr),
        coachInsights: this.generateCoachInsights(),
        powerQuestions: this.generatePowerQuestions(),
        tomorrowFocus: this.generateTomorrowFocus()
      },
      stats: {
        productivityScore: this.calculateProductivityScore(dateStr),
        completedTasks: scheduledTasks.filter(t => t.isCompleted).length,
        totalTasks: scheduledTasks.length + parkingLotTasks.length,
        timeDistribution: this.calculateTimeDistribution(dateStr)
      },
      userPreferences: {
        coachingStyle: 'motivational',
        autoGenerate: false,
        visibleSections: {
          quote: true,
          daySummary: true,
          energyPatterns: true,
          taskImpact: true,
          coachInsights: true,
          powerQuestions: true,
          tomorrowFocus: true
        }
      }
    };

    return recap;
  }

  async fetchTasks(date: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('date', date);

    if (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }

    return data || [];
  }

  async fetchDailyRecap(date: string): Promise<DailyRecap | null> {
    // In a real app, this would fetch from an API
    // For now, we'll generate a new one each time
    return this.generateRecap(date);
  }

  async updatePreferences(preferences: RecapPreferences): Promise<void> {
    // In a real app, this would update the preferences in the backend
    console.log('Updating preferences:', preferences);
  }

  async deleteRecap(date: string): Promise<void> {
    // In a real app, this would delete from the backend
    console.log('Deleting recap for date:', date);
  }
}

export const recapService = new RecapService(); 