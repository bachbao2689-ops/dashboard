// src/hooks/useAutoRefresh.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

export interface UseAutoRefreshOptions {
  intervalMinutes?: number;
  onRefresh?: () => void | Promise<void>;
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

  const refreshingRef=useRef(false);
  const alive=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const executeRefresh=useCallback(async(isManual=false)=>{
    if(refreshingRef.current)return;
    refreshingRef.current=true;setIsRefreshing(true);setSecondsRemaining(intervalMinutes*60);
    try{await onRefreshRef.current?.();if(alive.current&&isManual&&showToastOnManual)toast.success('Đã tải lại dữ liệu phòng ban');}
    catch{if(alive.current&&isManual)toast.error('Không thể làm mới dữ liệu');}
    finally{refreshingRef.current=false;if(alive.current)setIsRefreshing(false);}
  },[intervalMinutes,showToastOnManual]);
  const refreshNow=useCallback(()=>{void executeRefresh(true);},[executeRefresh]);
  const remainingRef=useRef(secondsRemaining);remainingRef.current=secondsRemaining;
  useEffect(()=>{const timer=setInterval(()=>{const next=remainingRef.current-1;remainingRef.current=next;if(next<=0){void executeRefresh();}else setSecondsRemaining(next);},1000);return()=>clearInterval(timer);},[executeRefresh]);

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
