import React from 'react';

interface AreaGroupingFilterTabsProps {
  totalOrders: number;
  selectedAreaFilter: string;
  onSelectArea: (nhom: string) => void;
  dynamicAreaList: string[];
  getTotalOrdersInArea: (nhom: string) => number;
}

export const AreaGroupingFilterTabs: React.FC<AreaGroupingFilterTabsProps> = ({
  totalOrders,
  selectedAreaFilter,
  onSelectArea,
  dynamicAreaList,
  getTotalOrdersInArea,
}) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      <button
        onClick={() => onSelectArea('ALL')}
        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
          selectedAreaFilter === 'ALL'
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
        }`}
      >
        Tất cả khu vực ({totalOrders})
      </button>
      {dynamicAreaList.map((nhom) => {
        const count = getTotalOrdersInArea(nhom);
        if (count === 0) return null;
        return (
          <button
            key={nhom}
            onClick={() => onSelectArea(nhom)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              selectedAreaFilter === nhom
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {nhom} ({count})
          </button>
        );
      })}
    </div>
  );
};
