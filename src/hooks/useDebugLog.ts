import { useEffect } from 'react';
import { useTimeAuditStore } from '../store/timeAuditStore';

export function useDebugLog(message: string, data: any) {
  const { debugMode } = useTimeAuditStore();

  useEffect(() => {
    if (debugMode) {
      console.log(`[Debug] ${message}:`, data);
    }
  }, [debugMode, message, data]);
} 