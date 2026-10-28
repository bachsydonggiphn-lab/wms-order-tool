import React from 'react';
import {
  Package,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Truck,
  CheckCheck,
  RotateCcw,
} from 'lucide-react';
import { ShippedStats } from '../types';

interface ShippedKpiCardsProps {
  stats: ShippedStats;
  selectedStatusFilter: string;
  setSelectedStatusFilter: (status: string) => void;
  isBatchChecking: boolean;
  onUpdateUnscanned: () => void;
}

export const ShippedKpiCards: React.FC<ShippedKpiCardsProps> = ({
  stats,
  selectedStatusFilter,
  setSelectedStatusFilter,
  isBatchChecking,
  onUpdateUnscanned,
}) => {
  const cards = [
    {
      id: 'ALL',
      label: 'Tổng vận đơn',
      count: stats.total,
      subtext: `${stats.checked}/${stats.total} (${stats.percentComplete}%) đã kiểm tra`,
      icon: Package,
      borderColor: selectedStatusFilter === 'ALL' ? 'ring-2 ring-slate-900 border-slate-900' : 'border-slate-200',
      bgClass: 'bg-white',
      badgeClass: 'bg-slate-100 text-slate-800',
    },
    {
      id: 'not_scanned',
      label: 'CHƯA SCAN (Chờ lấy)',
      count: stats.notScanned,
      subtext: `${stats.unscannedRate}% chưa tới lấy`,
      icon: Clock,
      borderColor: selectedStatusFilter === 'not_scanned' || selectedStatusFilter.startsWith('unscanned') ? 'ring-2 ring-amber-600 border-amber-600' : 'border-amber-200',
      bgClass: 'bg-amber-50/50',
      badgeClass: 'bg-amber-100 text-amber-900 font-bold',
    },
    {
      id: 'scanned',
      label: 'ĐÃ SCAN (Đã lấy/giao)',
      count: stats.scannedTotal,
      subtext: `${stats.scannedRate}% bưu cục đã nhận`,
      icon: CheckCircle2,
      borderColor: selectedStatusFilter === 'scanned' ? 'ring-2 ring-emerald-600 border-emerald-600' : 'border-emerald-200',
      bgClass: 'bg-emerald-50/40',
      badgeClass: 'bg-emerald-100 text-emerald-900 font-bold',
    },
    {
      id: 'cancelled',
      label: 'ĐÃ HỦY (Cần giữ lại)',
      count: stats.cancelled,
      subtext: `${stats.cancelledRate}% đơn hủy`,
      icon: AlertOctagon,
      borderColor: selectedStatusFilter === 'cancelled' ? 'ring-2 ring-rose-600 border-rose-600' : 'border-rose-200',
      bgClass: 'bg-rose-50/50',
      badgeClass: 'bg-rose-100 text-rose-900 font-bold',
    },
    {
      id: 'in_transit',
      label: 'Đang vận chuyển',
      count: stats.inTransit,
      subtext: 'Đang luân chuyển / Giao',
      icon: Truck,
      borderColor: selectedStatusFilter === 'in_transit' ? 'ring-2 ring-indigo-600 border-indigo-600' : 'border-slate-200',
      bgClass: 'bg-white',
      badgeClass: 'bg-indigo-50 text-indigo-800 font-semibold',
    },
    {
      id: 'delivered',
      label: 'Giao thành công',
      count: stats.delivered,
      subtext: 'Khách đã nhận hàng',
      icon: CheckCheck,
      borderColor: selectedStatusFilter === 'delivered' ? 'ring-2 ring-teal-600 border-teal-600' : 'border-slate-200',
      bgClass: 'bg-white',
      badgeClass: 'bg-teal-50 text-teal-800 font-semibold',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedStatusFilter === card.id || 
          (card.id === 'not_scanned' && (selectedStatusFilter === 'unscanned_1day' || selectedStatusFilter === 'unscanned_2days' || selectedStatusFilter === 'unscanned_3days'));

        return (
          <button
            key={card.id}
            onClick={() => setSelectedStatusFilter(card.id)}
            className={`text-left p-3.5 rounded-xl border transition-all relative cursor-pointer hover:shadow-xs ${card.bgClass} ${card.borderColor}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className={`p-1.5 rounded-lg ${card.badgeClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              {isSelected && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-900 bg-slate-200/80 px-1.5 py-0.5 rounded font-mono">
                  Đang xem
                </span>
              )}
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
              {card.count.toLocaleString()}
            </div>
            <div className="text-xs font-bold text-slate-800 truncate mt-0.5">
              {card.label}
            </div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
              {card.subtext}
            </div>
            {card.id === 'not_scanned' && card.count > 0 && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isBatchChecking) {
                    onUpdateUnscanned();
                  }
                }}
                role="button"
                tabIndex={0}
                className={`mt-2 w-full inline-flex items-center justify-center px-2 py-1.5 text-[11px] font-bold rounded-lg transition-all shadow-2xs ${
                  isBatchChecking 
                    ? 'bg-amber-200/60 text-amber-800 cursor-not-allowed opacity-70' 
                    : 'bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-amber-950 border border-amber-500/60 cursor-pointer'
                }`}
                title="Cập nhật lại trạng thái các đơn Chưa Scan này"
              >
                <RotateCcw className="w-3 h-3 mr-1 text-amber-950 shrink-0" />
                <span>Cập nhật lại ({card.count.toLocaleString()})</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
