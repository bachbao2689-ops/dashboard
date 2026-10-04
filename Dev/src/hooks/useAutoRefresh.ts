// src/hooks/useAutoRefresh.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

export interface UseAutoRefreshOptions {
  intervalMinutes?: number;
  onRefresh?: () => void;
  showToastOnManual?: boolean;
}

export interface UseAutoRefreshReturn {
  secondsRemaining: number;
  formattedTime: string;
  isRefreshing: boolean;
  refreshNow: () => void;
  intervalMinutes: number;
  setIntervalMinutes: (mins: number) => void;
}

export function useAutoRefresh({
  intervalMinutes: initialIntervalMinutes = 5,
  onRefresh,
  showToastOnManual = true,
}: UseAutoRefreshOptions = {}): UseAutoRefreshReturn {
  const [intervalMinutes, setIntervalMinutesState] = useState<number>(initialIntervalMinutes);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(initialIntervalMinutes * 60);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const setIntervalMinutes = useCallback((mins: number) => {
    setIntervalMinutesState(mins);
    setSecondsRemaining(mins * 60);
  }, []);

  const executeRefresh = useCallback((isManual = false) => {
    setIsRefreshing(true);
    if (onRefreshRef.current) {
      onRefreshRef.current();
    }
    if (isManual && showToastOnManual) {
      toast.success('Dữ liệu phòng ban đã được làm mới');
    }
    setSecondsRemaining(intervalMinutes * 60);
    // Subtle timeout to simulate instant data sync feedback
    const timeout = setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [intervalMinutes, showToastOnManual]);

  const refreshNow = useCallback(() => {
    executeRefresh(true);
  }, [executeRefresh]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          executeRefresh(false);
          return intervalMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [intervalMinutes, executeRefresh]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return {
    secondsRemaining,
    formattedTime,
    isRefreshing,
    refreshNow,
    intervalMinutes,
    setIntervalMinutes,
  };
}
