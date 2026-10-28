import React from 'react';

export const YogaHeaderBanner: React.FC = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-semibold text-gray-900">
            Phân Loại Đơn Thảm Yoga & Quy Cách Đặc Biệt (L46)
          </h2>
          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-medium">
            Tách Thảm Yoga & L46
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Phân tách Thảm Yoga riêng biệt theo PCS, nhận diện đơn có L46 (YD-L46-1), MIX 2 PCS L46 và đơn thông thường.
        </p>
      </div>
    </div>
  );
};
