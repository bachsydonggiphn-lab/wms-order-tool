import { useState } from 'react';
import { SyncStats } from '../components/SyncShippedModal';

interface UseHotSkuSyncParams {
  onSyncComplete: () => void;
}

export const useHotSkuSync = ({ onSyncComplete }: UseHotSkuSyncParams) => {
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [syncFromDate, setSyncFromDate] = useState<string>('');
  const [syncToDate, setSyncToDate] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgressMsg, setSyncProgressMsg] = useState<string>('');
  const [syncPercent, setSyncPercent] = useState<number>(0);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    page: 0,
    maxPages: 0,
    totalFetched: 0,
    totalInserted: 0,
    totalSkipped: 0,
  });

  const handleOpenSyncModal = () => {
    if (!syncFromDate) {
      const d = new Date();
      d.setDate(d.getDate() - 3);
      setSyncFromDate(d.toISOString().slice(0, 10));
      setSyncToDate(new Date().toISOString().slice(0, 10));
    }
    setSyncPercent(0);
    setSyncProgressMsg('');
    setSyncStats({ page: 0, maxPages: 0, totalFetched: 0, totalInserted: 0, totalSkipped: 0 });
    setIsSyncModalOpen(true);
  };

  const handleTriggerSync = () => {
    setIsSyncing(true);
    setSyncPercent(2);
    setSyncProgressMsg('Đang khởi tạo kết nối YunWMS & lấy phiên làm việc...');
    setSyncStats({ page: 0, maxPages: 0, totalFetched: 0, totalInserted: 0, totalSkipped: 0 });

    const params = new URLSearchParams();
    if (syncFromDate) params.set('fromDate', syncFromDate);
    if (syncToDate) params.set('toDate', syncToDate);
    params.set('stream', 'true');

    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/wms/shipped/sync-stream?${params.toString()}`);

      es.addEventListener('start', (e: any) => {
        try {
          const data = JSON.parse(e.data || '{}');
          setSyncProgressMsg(data.message || 'Đang kết nối YunWMS...');
        } catch {}
      });

      es.addEventListener('progress', (e: any) => {
        try {
          const data = JSON.parse(e.data || '{}');
          setSyncPercent(data.percent || 0);
          setSyncProgressMsg(data.message || '');
          setSyncStats({
            page: data.page,
            maxPages: data.maxAllowedPages,
            totalFetched: data.totalFetched,
            totalInserted: data.totalInserted,
            totalSkipped: data.totalSkipped,
          });
        } catch {}
      });

      es.addEventListener('complete', (e: any) => {
        try {
          const data = JSON.parse(e.data || '{}');
          setSyncPercent(100);
          setSyncProgressMsg(data.message || 'Hoàn tất đồng bộ 100%!');
          setSyncStats({
            page: data.maxAllowedPages,
            maxPages: data.maxAllowedPages,
            totalFetched: data.totalOrdersFetched,
            totalInserted: data.insertedOrders,
            totalSkipped: data.skippedDuplicates,
          });
        } catch {}
        if (es) {
          es.close();
          es = null;
        }

        setTimeout(() => {
          setIsSyncModalOpen(false);
          setIsSyncing(false);
          setSyncProgressMsg('');
          setSyncPercent(0);
          onSyncComplete();
        }, 2200);
      });

      es.addEventListener('error', async (err: any) => {
        console.warn('[SyncShipped EventSource warning/error, attempting fallback REST]', err);
        if (es) {
          es.close();
          es = null;
        }
        try {
          setSyncProgressMsg('Đang kéo dữ liệu qua cổng dự phòng...');
          const res = await fetch('/api/wms/shipped/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fromDate: syncFromDate || undefined,
              toDate: syncToDate || undefined,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.message || 'Lỗi kéo dữ liệu');
          }
          setSyncPercent(100);
          setSyncProgressMsg(data.message || 'Hoàn tất!');
          setSyncStats({
            page: 1,
            maxPages: 1,
            totalFetched: data.totalOrdersFetched,
            totalInserted: data.insertedOrders,
            totalSkipped: data.skippedDuplicates,
          });
          setTimeout(() => {
            setIsSyncModalOpen(false);
            setIsSyncing(false);
            setSyncProgressMsg('');
            setSyncPercent(0);
            onSyncComplete();
          }, 2200);
        } catch (restErr: any) {
          alert(`Lỗi kéo đơn YunWMS: ${restErr?.message || 'Không thể kết nối'}`);
          setIsSyncing(false);
          setSyncProgressMsg('');
        }
      });
    } catch (createErr: any) {
      alert(`Không thể khởi tạo kết nối: ${createErr?.message}`);
      setIsSyncing(false);
      setSyncProgressMsg('');
    }
  };

  return {
    isSyncModalOpen,
    setIsSyncModalOpen,
    syncFromDate,
    setSyncFromDate,
    syncToDate,
    setSyncToDate,
    isSyncing,
    syncProgressMsg,
    syncPercent,
    syncStats,
    handleOpenSyncModal,
    handleTriggerSync,
  };
};
