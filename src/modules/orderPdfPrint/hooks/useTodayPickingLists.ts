import { useState, useEffect, useCallback } from 'react';
import { TodayPickingListItem } from '../types';

export function useTodayPickingLists(warehouse: string = '7') {
  const [todayPickingLists, setTodayPickingLists] = useState<TodayPickingListItem[]>([]);
  const [todayTotal, setTodayTotal] = useState<number>(0);
  const [isLoadingToday, setIsLoadingToday] = useState<boolean>(false);
  const [todayError, setTodayError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  const fetchTodayLists = useCallback(async () => {
    setIsLoadingToday(true);
    setTodayError(null);
    try {
      const res = await fetch(`/api/wms/today-picking-lists?warehouse=${encodeURIComponent(warehouse)}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Không thể tải danh sách Picking List hôm nay');
      }
      setTodayPickingLists(data.pickingLists || []);
      setTodayTotal(typeof data.total === 'number' ? data.total : (data.pickingLists?.length || 0));
      setLastFetchedAt(new Date());
    } catch (err: any) {
      console.warn('[useTodayPickingLists] Fetch error:', err);
      setTodayError(err?.message || 'Không thể kết nối máy chủ');
    } finally {
      setIsLoadingToday(false);
    }
  }, [warehouse]);

  useEffect(() => {
    fetchTodayLists();
  }, [fetchTodayLists]);

  return {
    todayPickingLists,
    todayTotal,
    isLoadingToday,
    todayError,
    lastFetchedAt,
    fetchTodayLists
  };
}
