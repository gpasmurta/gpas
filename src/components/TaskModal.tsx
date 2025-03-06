// Add TypeScript declaration for SpeechRecognition at the top of the file
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// Define proper types for SpeechRecognition events
interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult[];
  length: number;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

import React, { useState, useEffect, useRef } from 'react';
import { Task, TaskValue, EnergyLevel, TaskCategory, ScheduledTask } from '../types';
import { X, Zap, Battery, Loader2, Mic, MicOff, FileText, RefreshCw } from 'lucide-react';
import { cn, formatTimeWithValidation, calculateEndTime } from '../lib/utils';
import { addMinutes, format, parse, isValid } from 'date-fns';
import { summarizeProcess, transcribeAudio, testOpenAIConnection } from '../lib/openai';
import OpenAI from 'openai';
import TimePicker from 'react-time-picker';
import 'react-time-picker/dist/TimePicker.css';
import 'react-clock/dist/Clock.css';
import '../styles/time-picker.css';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true // Only for demo purposes
});

// Define the Value type for react-time-picker
type TimePickerValue = string | null;

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  startTime: string;
  onSave: (task: Omit<ScheduledTask, 'id'>) => void;
  initialTask?: ScheduledTask;
  timeSlot?: string;
  onTimeChange?: (taskId: string, newTimeSlot: string) => void;
  onTaskTypeChange?: (isParkingLot: boolean) => void;
}

export function TaskModal({ 
  isOpen, 
  onClose, 
  startTime: initialStartTime, 
  onSave, 
  initialTask,
  timeSlot: initialTimeSlot,
  onTimeChange,
  onTaskTypeChange
}: TaskModalProps) {
  const [title, setTitle] = useState(initialTask?.title ?? '');
  const [category, setCategory] = useState<TaskCategory>(initialTask?.category ?? 'personal');
  const [energy, setEnergy] = useState<EnergyLevel>(initialTask?.energy ?? 'gives');
  const [value, setValue] = useState<TaskValue>(initialTask?.value ?? 'medium');
  const [notes, setNotes] = useState(initialTask?.notes ?? '');
  const [duration, setDuration] = useState(initialTask ? calculateDurationBlocks(initialTask.startTime, initialTask.endTime) : 1);
  const [startTime, setStartTime] = useState(initialTask?.startTime ?? initialStartTime ?? '09:00');
  const [endTime, setEndTime] = useState(initialTask?.endTime ?? calculateEndTime(initialStartTime ?? '09:00', duration * 15));
  const [timeSlot, setTimeSlot] = useState(initialTimeSlot ?? initialStartTime ?? '09:00');
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [categorySource, setCategorySource] = useState<'default' | 'ai' | 'user'>('default');
  
  // Track current task type (parking lot or timeline)
  const [isParkingLotTask, setIsParkingLotTask] = useState(!initialStartTime);
  
  // Voice-to-text process description
  const [processDescription, setProcessDescription] = useState(initialTask?.processDescription ?? '');
  const [processSummary, setProcessSummary] = useState(initialTask?.processSummary ?? '');
  const [isRecording, setIsRecording] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const previousTaskRef = useRef<string | null>(null);
  const previousTaskTypeRef = useRef<boolean | null>(null);
  
  // Debounce timer for API calls
  const debounceTimerRef = useRef<number | null>(null);

  const [isTestingAPI, setIsTestingAPI] = useState(false);

  // Reset form when modal is opened or initialTask changes
  useEffect(() => {
    // Only reset the form if the modal is open
    if (!isOpen) return;
    
    // Check if we're editing the same task as before or creating a new one
    const currentTaskId = initialTask?.id || null;
    const isNewTaskOrDifferentTask = currentTaskId !== previousTaskRef.current;
    
    // Check if task type has changed
    const currentTaskType = !initialStartTime;
    const hasTaskTypeChanged = currentTaskType !== previousTaskTypeRef.current;
    
    // Always update the previous task ref and task type
    previousTaskRef.current = currentTaskId;
    previousTaskTypeRef.current = currentTaskType;
    
    // Update task type state
    setIsParkingLotTask(currentTaskType);
    
    // If we're editing an existing task, use its values
    if (initialTask) {
      setTitle(initialTask.title);
      setCategory(initialTask.category);
      setEnergy(initialTask.energy);
      setValue(initialTask.value);
      setNotes(initialTask.notes ?? '');
      setDuration(calculateDurationBlocks(initialTask.startTime, initialTask.endTime));
      
      // Always ensure timeSlot, startTime, and endTime are in sync
      const timeSlotToUse = initialTask.timeSlot || initialTask.startTime;
      setTimeSlot(timeSlotToUse);
      setStartTime(timeSlotToUse); // Set start time to match the time slot
      setEndTime(initialTask.endTime);
      
      setCategorySource('user');
      setProcessDescription(initialTask.processDescription ?? '');
      setProcessSummary(initialTask.processSummary ?? '');
    } 
    // If we're creating a new task or switching to a different task or task type has changed
    else if (isNewTaskOrDifferentTask || hasTaskTypeChanged) {
      setTitle('');
      setCategory('personal');
      setEnergy('gives');
      setValue('medium');
      setNotes('');
      setDuration(1);
      
      // For new tasks, ensure timeSlot and startTime match the initial time slot
      const timeSlotToUse = initialTimeSlot || initialStartTime || '09:00';
      setTimeSlot(timeSlotToUse);
      setStartTime(timeSlotToUse); // Set start time to match the time slot
      setEndTime(calculateEndTime(timeSlotToUse, 15)); // Calculate end time based on the time slot
      
      setCategorySource('default');
      setProcessDescription('');
      setProcessSummary('');
    }
  }, [initialTask, initialStartTime, initialTimeSlot, isOpen]);

  // Clean up form state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      // Clear any timers
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      // Stop recording if active
      if (isRecording) {
        stopRecording();
      }
      
      // Reset task type references
      previousTaskTypeRef.current = null;
    }
  }, [isOpen]);

  // Handle task type toggle
  const handleTaskTypeToggle = (newIsParkingLotTask: boolean) => {
    if (isParkingLotTask === newIsParkingLotTask) return; // No change
    
    setIsParkingLotTask(newIsParkingLotTask);
    
    // Notify parent component
    if (onTaskTypeChange) {
      onTaskTypeChange(newIsParkingLotTask);
    }
    
    // Reset form fields when switching task types
    setTitle('');
    setCategory('personal');
    setEnergy('gives');
    setValue('medium');
    setNotes('');
    setDuration(1);
    setStartTime(initialStartTime ?? '09:00');
    setEndTime(calculateEndTime(initialStartTime ?? '09:00', 15));
    setTimeSlot(initialStartTime ?? '09:00');
    setCategorySource('default');
    setProcessDescription('');
    setProcessSummary('');
  };

  // Handle title changes and trigger AI categorization
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    // Clear any existing timer
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    
    // Only trigger categorization if title has meaningful content
    if (newTitle.trim().length > 3 && categorySource !== 'user') {
      // Set a new timer for 800ms
      debounceTimerRef.current = window.setTimeout(async () => {
        setIsCategorizing(true);
        try {
          const suggestedCategory = await categorizeTask();
          setCategory(suggestedCategory);
          setCategorySource('ai');
        } catch (error) {
          console.error('Failed to categorize task:', error);
        } finally {
          setIsCategorizing(false);
        }
      }, 800);
    }
  };

  // Handle manual category selection
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value as TaskCategory);
    setCategorySource('user');
  };

  // Initialize speech recognition as fallback
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionConstructor();
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            if (event.results[i][0].confidence > 0.5) {
              transcript += event.results[i][0].transcript + ' ';
            }
          }
          setProcessDescription(transcript);
        };
        
        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error', event.error);
          setIsRecording(false);
        };
        
        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        if (isRecording) {
          recognitionRef.current.stop();
        }
      }
      
      // Clear any timers
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
      }
      
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isRecording]);

  /**
   * Handles starting the voice recording process
   * Initializes both MediaRecorder for audio recording and SpeechRecognition for real-time transcription
   */
  const startRecording = async () => {
    try {
      // Reset recording state
      audioChunksRef.current = [];
      setProcessDescription('');
      setRecordingTime(0);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize MediaRecorder for saving the audio
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up event handlers for the MediaRecorder
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Initialize SpeechRecognition for real-time transcription
      if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event) => {
          let transcript = '';
          
          // Combine all results into a single transcript
          for (let i = 0; i < event.results.length; i++) {
            if (event.results[i][0].confidence > 0.5) {
              transcript += event.results[i][0].transcript + ' ';
            }
          }
          
          if (transcript.trim()) {
            setProcessDescription(prev => {
              const newText = prev ? `${prev} ${transcript}` : transcript;
              return newText.trim();
            });
          }
        };
        
        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error, event.message);
        };
        
        recognition.onend = () => {
          // Restart recognition if we're still recording
          if (isRecording && recognitionRef.current) {
            recognitionRef.current.start();
          }
        };
        
        // Start the recognition
        recognition.start();
      } else {
        console.warn('Speech recognition not supported in this browser');
      }
      
      // Start the MediaRecorder
      mediaRecorder.start();
      
      // Start the recording timer
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Update recording state
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check your permissions and try again.');
    }
  };
  
  /**
   * Handles stopping the voice recording process
   * Stops both MediaRecorder and SpeechRecognition
   */
  const stopRecording = () => {
    // Stop the MediaRecorder if it exists
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      
      // Process the recorded audio
      mediaRecorderRef.current.onstop = async () => {
        try {
          // Create a blob from the audio chunks
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // If we have SpeechRecognition results, use those
          // Otherwise, send the audio to the server for transcription
          if (!processDescription && audioBlob.size > 0) {
            setIsSummarizing(true);
            const transcription = await transcribeAudio(audioBlob);
            setProcessDescription(transcription);
            setIsSummarizing(false);
          }
        } catch (error) {
          console.error('Error processing recording:', error);
          setIsSummarizing(false);
        }
      };
    }
    
    // Stop the SpeechRecognition if it exists
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    // Stop the recording timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    // Release the microphone
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    // Update recording state
    setIsRecording(false);
  };
  
  /**
   * Toggles the recording state
   */
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  /**
   * Formats the recording time for display
   */
  const formatRecordingTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  /**
   * Handles generating a summary of the process description using AI
   */
  const handleGenerateSummary = async () => {
    if (!processDescription.trim()) {
      alert('Please record or type a process description first.');
      return;
    }
    
    try {
      setIsSummarizing(true);
      const summary = await summarizeProcess(processDescription);
      setProcessSummary(summary);
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('Failed to generate summary. Please try again.');
    } finally {
      setIsSummarizing(false);
    }
  };

  // Handle process description changes
  const handleProcessDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newDescription = e.target.value;
    setProcessDescription(newDescription);
  };

  // Handle process summary changes
  const handleProcessSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newSummary = e.target.value;
    setProcessSummary(newSummary);
  };

  if (!isOpen) return null;

  function calculateDurationBlocks(start: string, end: string): number {
    try {
      const startDate = parse(start, 'HH:mm', new Date());
      const endDate = parse(end, 'HH:mm', new Date());
      
      if (!isValid(startDate) || !isValid(endDate)) {
        throw new Error('Invalid time format');
      }
      
      const diffMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
      return Math.max(1, Math.round(diffMinutes / 15)); // Round to nearest 15-min block, minimum 1
    } catch (error) {
      console.error('Error calculating duration:', error);
      return 1; // Default to 1 block (15 minutes)
    }
  }

  // Categorize tasks using OpenAI
  async function categorizeTask(): Promise<TaskCategory> {
    if (!title.trim()) return 'personal';

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a task categorization assistant. Your primary goal is to accurately categorize tasks into one of these categories: personal, work, health, finance, education, social, errands, home, admin, creative, strategic, meetings.

Key rules:
- If the task contains words like "meeting", "sync", "catchup", "1:1", "one-on-one", categorize as "meetings"
- If it's work-related, categorize as "work" unless it fits better in meetings/admin/strategic
- Respond with ONLY the category name, nothing else.`
          },
          {
            role: 'user',
            content: title
          }
        ],
        temperature: 0.3,
        max_tokens: 20
      });

      const suggestedCategory = response.choices[0]?.message.content?.toLowerCase().trim();
      
      // Validate that the suggested category is a valid TaskCategory
      const validCategories: TaskCategory[] = ['personal', 'work', 'health', 'finance', 'education', 'social', 'errands', 'home', 'admin', 'creative', 'strategic', 'meetings'];
      
      if (suggestedCategory && validCategories.includes(suggestedCategory as TaskCategory)) {
        return suggestedCategory as TaskCategory;
      }
      
      // Default to personal if the API returns an invalid category
      return 'personal';
    } catch (error) {
      console.error('Error categorizing task:', error);
      return 'personal';
    }
  }

  // Add time validation function
  const validateTimeChange = (newStartTime: string, newEndTime: string) => {
    const start = parse(newStartTime, 'HH:mm', new Date());
    const end = parse(newEndTime, 'HH:mm', new Date());
    
    if (start >= end) {
      return {
        isValid: false,
        error: 'End time must be after start time'
      };
    }

    if (start.getHours() < 0 || start.getHours() > 23) {
      return {
        isValid: false,
        error: 'Start time must be within 24-hour period'
      };
    }

    return { isValid: true };
  };

  // Handle duration change
  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDuration = parseInt(e.target.value, 10);
    setDuration(newDuration);
    
    // When duration changes, recalculate the end time based on the start time
    const newEndTime = calculateEndTime(startTime, newDuration * 15);
    setEndTime(newEndTime);
  };

  // Handle start time change
  const handleStartTimeChange = (value: TimePickerValue) => {
    if (!value) return;
    
    try {
      const formattedStartTime = formatTimeWithValidation(value, 'HH:mm');
      setStartTime(formattedStartTime);
      setTimeSlot(formattedStartTime); // Keep timeSlot in sync with startTime
      
      // When start time changes, recalculate the end time
      const newEndTime = calculateEndTime(formattedStartTime, duration * 15);
      setEndTime(newEndTime);
      
      // If this is an existing task and we have the onTimeChange callback, call it
      if (initialTask?.id && onTimeChange) {
        onTimeChange(initialTask.id, formattedStartTime);
      }
    } catch (error) {
      console.error('Invalid start time format:', error);
    }
  };

  // Handle end time change
  const handleEndTimeChange = (value: TimePickerValue) => {
    if (!value) return;
    
    try {
      const formattedEndTime = formatTimeWithValidation(value, 'HH:mm');
      setEndTime(formattedEndTime);
      
      // When end time changes, recalculate the duration
      const start = parse(startTime, 'HH:mm', new Date());
      const end = parse(formattedEndTime, 'HH:mm', new Date());
      
      if (isValid(start) && isValid(end)) {
        const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
        const newDuration = Math.max(1, Math.ceil(durationMinutes / 15)); // Round up to nearest 15-min block
        setDuration(newDuration);
      }
    } catch (error) {
      console.error('Invalid end time format:', error);
    }
  };

  // When task is saved, update the state
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Saving task with times:', {
      isParkingLotTask,
      startTime,
      endTime,
      timeSlot
    });
    
    // Validate required fields
    if (!title.trim()) {
      alert('Please enter a task title');
      return;
    }
    
    // Create the task object based on task type
    if (isParkingLotTask) {
      onSave({
        title,
        category,
        energy,
        value,
        notes,
        parkingLot: true,
        scheduled: false,
        startTime: '00:00', // Parking lot tasks don't have a specific start time
        endTime: '00:00',   // Parking lot tasks don't have a specific end time
        timeSlot: '',       // Parking lot tasks don't have a time slot
        date: format(new Date(), 'yyyy-MM-dd'),
        isCompleted: initialTask?.isCompleted ?? false,
        processDescription,
        processSummary,
      });
    } else {
      // For scheduled tasks, ensure timeSlot, startTime and endTime are in sync
      onSave({
        title,
        category,
        energy,
        value,
        notes,
        parkingLot: false,
        scheduled: true,
        startTime: startTime, // Use timeSlot as the start time for scheduled tasks
        endTime,
        timeSlot: startTime,  // Keep timeSlot and startTime in sync
        date: format(new Date(), 'yyyy-MM-dd'),
        isCompleted: initialTask?.isCompleted ?? false,
        processDescription,
        processSummary,
      });
    }
    
    onClose();
  };

  // Safely format the start time
  const formattedStartTime = initialStartTime ? formatTimeWithValidation(initialStartTime, 'h:mm a') : 'Unscheduled';
  
  // Create title with time if available
  const modalTitle = isParkingLotTask 
    ? (initialTask ? 'Edit Parking Lot Task' : 'Add to Parking Lot')
    : (initialTask ? `Edit Task at ${formattedStartTime}` : `Add Task at ${formattedStartTime}`);

  // Determine if we're showing a simplified form for parking lot tasks
  const isSimplifiedForm = isParkingLotTask;

  // Add time adjustment functions
  const adjustTime = (time: string, minutesToAdd: number): string => {
    try {
      const date = parse(time, 'HH:mm', new Date());
      if (!isValid(date)) {
        throw new Error('Invalid time format');
      }
      const newTime = addMinutes(date, minutesToAdd);
      return format(newTime, 'HH:mm');
    } catch (error) {
      console.error('Error adjusting time:', error);
      return time;
    }
  };

  const handleTimeAdjustment = (direction: 'forward' | 'backward') => {
    const minutesToAdjust = direction === 'forward' ? 15 : -15;
    const newStartTime = adjustTime(initialStartTime, minutesToAdjust);
    
    // Update the task with the new start time
    const endTime = calculateEndTime(newStartTime, duration * 15);
    const formattedDate = format(new Date(), 'yyyy-MM-dd');
    
    onSave({
      title,
      category,
      energy,
      value,
      notes: notes || undefined,
      startTime: newStartTime,
      endTime,
      timeSlot,
      processDescription: processDescription || undefined,
      processSummary: processSummary || undefined,
      timerElapsed: initialTask?.timerElapsed || undefined,
      timerSteps: initialTask?.timerSteps || undefined,
      scheduled: true,
      parkingLot: false,
      date: formattedDate
    });
  };

  const handleTestOpenAI = async () => {
    setIsTestingAPI(true);
    try {
      const result = await testOpenAIConnection();
      if (result.isWorking) {
        alert('OpenAI API is working correctly!');
      } else {
        alert(`OpenAI API Error: ${result.error}`);
      }
    } catch (error) {
      alert('Error testing OpenAI connection');
    } finally {
      setIsTestingAPI(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-3 sm:p-4 border-b">
          <h2 className="text-base sm:text-lg font-semibold">
            {modalTitle}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestOpenAI}
              disabled={isTestingAPI}
              className={cn(
                "text-xs px-2 py-1 rounded",
                isTestingAPI ? "bg-gray-100 text-gray-400" : "bg-blue-100 text-blue-700 hover:bg-blue-200"
              )}
            >
              {isTestingAPI ? (
                <div className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Testing...
                </div>
              ) : (
                'Test OpenAI'
              )}
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* Tab selector for parking lot vs timeline (only shown when adding new task) */}
          {!initialTask && (
            <div className="bg-gray-100 rounded-lg p-1 flex mb-3 sm:mb-4">
              <button
                type="button"
                className={cn(
                  "flex-1 py-2 text-center rounded-md text-xs sm:text-sm font-medium",
                  isParkingLotTask
                    ? "bg-white shadow text-blue-600"
                    : "text-gray-600 hover:bg-gray-200"
                )}
                onClick={() => handleTaskTypeToggle(true)}
              >
                Parking Lot
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 py-2 text-center rounded-md text-xs sm:text-sm font-medium",
                  !isParkingLotTask
                    ? "bg-white shadow text-blue-600"
                    : "text-gray-600 hover:bg-gray-200"
                )}
                onClick={() => handleTaskTypeToggle(false)}
              >
                Timeline
              </button>
            </div>
          )}

          {/* Task Title - Always shown */}
          <div>
            <label htmlFor="title" className="block text-xs sm:text-sm font-medium text-gray-700">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={handleTitleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              required
            />
          </div>

          {/* Category - Always shown */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="category" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              {isCategorizing && (
                <div className="flex items-center text-xs text-blue-600">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Analyzing...
                </div>
              )}
              {categorySource === 'ai' && !isCategorizing && (
                <div className="text-xs text-green-600">AI suggested</div>
              )}
            </div>
            <select
              id="category"
              value={category}
              onChange={handleCategoryChange}
              className={cn(
                "block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm",
                categorySource === 'ai' && "border-green-300 bg-green-50"
              )}
            >
              <option value="personal">Personal</option>
              <option value="work">Work</option>
              <option value="health">Health</option>
              <option value="finance">Finance</option>
              <option value="education">Education</option>
              <option value="social">Social</option>
              <option value="errands">Errands</option>
              <option value="home">Home</option>
              <option value="admin">Admin</option>
              <option value="creative">Creative</option>
              <option value="strategic">Strategic</option>
              <option value="meetings">Meetings</option>
            </select>
          </div>

          {/* Fields only shown for timeline tasks */}
          {!isSimplifiedForm && (
            <>
              {/* Time & Duration */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Time & Duration
                </label>
                <div className="space-y-4">
                  {/* Time pickers */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                      <TimePicker
                        value={startTime}
                        onChange={handleStartTimeChange}
                        format="h:mm a"
                        clearIcon={null}
                        disableClock={true}
                        minTime="00:00"
                        maxTime="23:59"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End Time</label>
                      <TimePicker
                        value={endTime}
                        onChange={handleEndTimeChange}
                        format="h:mm a"
                        clearIcon={null}
                        disableClock={true}
                        minTime="00:00"
                        maxTime="23:59"
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  {/* Duration buttons */}
                  <div className="flex gap-2">
                    {[1, 2, 4, 8].map((blocks) => (
                      <button
                        key={blocks}
                        type="button"
                        onClick={() => {
                          setDuration(blocks);
                          // Update end time based on new duration
                          const newEndTime = calculateEndTime(startTime, blocks * 15);
                          setEndTime(newEndTime);
                        }}
                        className={cn(
                          'px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm',
                          duration === blocks
                            ? 'bg-blue-100 text-blue-700 font-medium'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        )}
                      >
                        {blocks * 15}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Energy Impact */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Energy Impact
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEnergy('gives')}
                    className={cn(
                      'flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-sm flex-1',
                      energy === 'gives'
                        ? 'bg-green-100 text-green-700 font-medium border border-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
                    )}
                  >
                    <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                    Gives Energy
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnergy('takes')}
                    className={cn(
                      'flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-sm flex-1',
                      energy === 'takes'
                        ? 'bg-red-100 text-red-700 font-medium border border-red-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
                    )}
                  >
                    <Battery className="w-3 h-3 sm:w-4 sm:h-4" />
                    Takes Energy
                  </button>
                </div>
              </div>

              {/* Value */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Value
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setValue('low')}
                    className={cn(
                      'px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-sm flex-1',
                      value === 'low'
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    Low
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('medium')}
                    className={cn(
                      'px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-sm flex-1',
                      value === 'medium'
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    Medium
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('high')}
                    className={cn(
                      'px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-sm flex-1',
                      value === 'high'
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    High
                  </button>
                </div>
              </div>

              {/* Process Description */}
              <div>
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <label htmlFor="processDescription" className="block text-xs sm:text-sm font-medium text-gray-700">
                    Process Description
                  </label>
                  <div className="flex items-center gap-1 sm:gap-2">
                    {isRecording && (
                      <span className="text-xs text-red-600 font-medium animate-pulse">
                        {formatRecordingTime(recordingTime)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={toggleRecording}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded text-xs",
                        isRecording 
                          ? "bg-red-100 text-red-700" 
                          : "bg-blue-100 text-blue-700"
                      )}
                      disabled={isSummarizing}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-3 h-3 sm:w-4 sm:h-4" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Mic className="w-3 h-3 sm:w-4 sm:h-4" />
                          Record
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <textarea
                  id="processDescription"
                  value={processDescription}
                  onChange={handleProcessDescriptionChange}
                  rows={3}
                  className={cn(
                    "block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs sm:text-sm",
                    isRecording ? "border-red-300 bg-red-50" : ""
                  )}
                  placeholder="Describe your workflow process in detail (or click Record to use voice input)..."
                  disabled={isRecording || isSummarizing}
                />
                {isRecording && (
                  <p className="text-xs text-red-600 mt-1 animate-pulse">
                    Recording... Speak clearly to describe your process
                  </p>
                )}
                
                {/* Process Summary */}
                <div className="mt-2 sm:mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700">
                      Process Summary
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateSummary}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded text-xs",
                        "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      )}
                      disabled={!processDescription.trim() || isSummarizing}
                    >
                      {isSummarizing ? (
                        <>
                          <Loader2 className="w-3 h-3 sm:w-4 sm:w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3 sm:w-4 sm:w-4" />
                          Generate Summary
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    value={processSummary}
                    onChange={handleProcessSummaryChange}
                    rows={2}
                    className={cn(
                      "block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs sm:text-sm",
                      isSummarizing ? "animate-pulse bg-gray-50" : ""
                    )}
                    placeholder="Process summary will appear here after generation"
                    disabled={isSummarizing}
                  />
                  {processSummary && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                      <FileText className="w-3 h-3 mr-1" />
                      This summary will be used for automation analysis
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Notes - Always shown */}
          <div>
            <label htmlFor="notes" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs sm:text-sm"
              placeholder="Add any additional details about this task..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 sm:pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-3 sm:px-4 py-1 sm:py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-xs sm:text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 sm:px-4 py-1 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs sm:text-sm"
              disabled={isRecording || isSummarizing}
            >
              {isParkingLotTask ? 'Add to Parking Lot' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}