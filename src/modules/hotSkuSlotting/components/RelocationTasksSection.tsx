import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  CheckSquare,
  Square,
  ArrowRight,
  ChevronRight,
  Download,
  Printer
} from 'lucide-react';
import { SlottingRelocationTask } from '../../../../sqliteDb';

interface RelocationTasksSectionProps {
  tasks: SlottingRelocationTask[];
  completedTaskIds: Set<string>;
  onToggleTask: (taskId: string) => void;
  onExportExcel: () => void;
  onPrintTasks: () => void;
}

export const RelocationTasksSection: React.FC<RelocationTasksSectionProps> = ({
  tasks,
  completedTaskIds,
  onToggleTask,
  onExportExcel,
  onPrintTasks,
}) => {
  const [taskUrgencyFilter, setTaskUrgencyFilter] = useState<'ALL' | 'high' | 'medium' | 'low'>('ALL');

  const filteredTasks = useMemo(() => {
    if (taskUrgencyFilter === 'ALL') return tasks;
    return tasks.filter((t) => t.urgency === taskUrgencyFilter);
  }, [tasks, taskUrgencyFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            Phiếu Giao Việc Chuyển Đổi Vị Trí Kệ Kho (Slotting Relocation Tasks)
          </h2>
          <p className="text-xs text-slate-500">
            Tự động tạo nhiệm vụ từ dữ liệu bán hàng: Đôn hàng bùng nổ lên Zone A, rút hàng thoái trào về Zone B/C, đặt chỗ ô kệ cho hàng cạn tồn đang về.
          </p>
          <div className="flex items-center gap-3 pt-2 text-xs font-semibold">
            <span className="text-slate-600">
              Tiến độ: <b className="text-indigo-600">{completedTaskIds.size}</b> / {tasks.length} nhiệm vụ đã xong
            </span>
            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{
                  width: `${tasks.length > 0 ? (completedTaskIds.size / tasks.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Lọc theo mức độ khẩn cấp */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <span className="text-slate-400 px-2">Lọc:</span>
            {[
              { id: 'ALL', label: 'Tất Cả' },
              { id: 'high', label: 'Khẩn Cấp' },
              { id: 'medium', label: 'Trung Bình' },
              { id: 'low', label: 'Tiêu Chuẩn' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTaskUrgencyFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  taskUrgencyFilter === f.id
                    ? f.id === 'high'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : f.id === 'medium'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <button
            type="button"
            onClick={onExportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Excel Phiếu Đổi Kệ</span>
          </button>

          <button
            type="button"
            onClick={onPrintTasks}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In Phiếu Giao Việc</span>
          </button>
        </div>
      </div>

      {/* Danh Sách Nhiệm Vụ */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 border border-slate-200 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">Hiện không có nhiệm vụ chuyển kệ nào cần xử lý</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Tất cả các vị trí SKU trong kho VN02 hiện tại đã khớp với vận tốc bán hàng thực tế và kế hoạch hàng về.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => {
            const isDone = completedTaskIds.has(task.id);
            return (
              <div
                key={task.id}
                onClick={() => onToggleTask(task.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  isDone
                    ? 'bg-slate-50/80 border-slate-200 opacity-60'
                    : task.urgency === 'high'
                    ? 'bg-white border-rose-300 hover:border-rose-400 shadow-sm hover:shadow-md'
                    : task.urgency === 'medium'
                    ? 'bg-white border-amber-300 hover:border-amber-400 shadow-sm hover:shadow-md'
                    : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTask(task.id);
                      }}
                      className={`mt-0.5 p-1 rounded-lg transition-colors cursor-pointer ${
                        isDone ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                      }`}
                    >
                      {isDone ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            task.urgency === 'high'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : task.urgency === 'medium'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {task.urgency === 'high' ? 'Khẩn Cấp' : task.urgency === 'medium' ? 'Ưu Tiên' : 'Tiêu Chuẩn'}
                        </span>
                        <span className="font-mono font-bold text-sm text-slate-900">
                          {task.sku}
                        </span>
                        {isDone && (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Đã Hoàn Thành
                          </span>
                        )}
                      </div>
                      {task.productTitle && (
                        <p className="text-xs text-slate-600 mt-1 line-clamp-1" title={task.productTitle}>
                          {task.productTitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Direction Badges */}
                  <div className="flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200/80 text-xs font-mono font-bold">
                    <span className="text-slate-500">{task.currentZone}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-indigo-700">{task.targetZone}</span>
                  </div>
                </div>

                {/* Action & Reason */}
                <div className="mt-3.5 pl-8 space-y-2">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{task.title}</span>
                  </div>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                    {task.reason}
                  </p>
                  <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                    <span>
                      Sản lượng / Tiềm năng: <b className="text-slate-800 font-mono font-bold">{task.potentialVolume.toLocaleString()} pcs</b>
                    </span>
                    {(task.onWay ?? 0) > 0 && (
                      <span className="text-emerald-700 font-medium">
                        Hàng về: <b className="font-mono font-bold">+{task.onWay} pcs</b>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
