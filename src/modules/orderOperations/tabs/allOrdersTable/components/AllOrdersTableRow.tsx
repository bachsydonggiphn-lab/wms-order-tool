import React from 'react';
import { Copy, Check, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { RawOrderRow, SkuGroupsMap } from '../../../../../types';
import { layNhomTuSKU, xacDinhDonViVanChuyen } from '../../../../../utils/orderProcessor';
import { DEFAULT_AREA_ORDER } from '../../../../../utils/skuData';
import { CarrierBadge } from './CarrierBadge';

interface AllOrdersTableRowProps {
  order: RawOrderRow;
  globalIndex: number;
  skuGroups: SkuGroupsMap;
  isExpanded: boolean;
  copiedKey: string | null;
  onCopy: (text: string, id: string) => void;
  onToggleExpand: (id: string) => void;
}

export const AllOrdersTableRow: React.FC<AllOrdersTableRowProps> = ({
  order,
  globalIndex,
  skuGroups,
  isExpanded,
  copiedKey,
  onCopy,
  onToggleExpand,
}) => {
  const primaryArea =
    order.items.length === 1
      ? layNhomTuSKU(order.items[0].sku, skuGroups, DEFAULT_AREA_ORDER)
      : 'MIX';

  const cInfo = xacDinhDonViVanChuyen(order.trackingNo, order.rawOrderText);

  return (
    <React.Fragment>
      <tr
        className={`hover:bg-gray-50/80 transition-colors ${
          order.isRealTimeNew
            ? 'bg-emerald-50/80 border-l-4 border-l-emerald-500'
            : isExpanded
            ? 'bg-gray-50/50'
            : ''
        }`}
      >
        <td className="py-2.5 px-3.5 text-center text-gray-400 font-mono text-[11px]">
          {globalIndex}
        </td>

        <td className="py-2.5 px-3.5 font-medium text-gray-900 font-mono">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>{order.orderNo}</span>
            {order.isRealTimeNew && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500 text-white animate-pulse">
                MỚI
              </span>
            )}
            <button
              onClick={() => onCopy(order.orderNo, `ord_${order.id}`)}
              className="text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              {copiedKey === `ord_${order.id}` ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </td>

        <td className="py-2.5 px-3.5 font-mono text-gray-600">
          {order.trackingNo ? (
            <div className="flex items-center gap-1">
              <span>{order.trackingNo}</span>
              <button
                onClick={() => onCopy(order.trackingNo, `trk_${order.id}`)}
                className="text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                {copiedKey === `trk_${order.id}` ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>

        <td className="py-2.5 px-3.5">
          <CarrierBadge carrier={cInfo.carrier} carrierName={cInfo.carrierName} />
        </td>

        <td className="py-2.5 px-3.5 font-mono">
          {order.pickingList ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
              {order.pickingList}
            </span>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>

        <td className="py-2.5 px-3.5">
          <div className="flex flex-wrap gap-1">
            {order.items.map((it, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-mono ${
                  it.sku === 'YD-L46-1'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : order.hasYoga
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                <span>{it.sku}</span>
                <span className="font-semibold text-indigo-600">×{it.qty}</span>
              </span>
            ))}
          </div>
        </td>

        <td className="py-2.5 px-3.5 text-center">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
              order.totalQty === 1
                ? 'bg-gray-100 text-gray-700'
                : order.totalQty === 2
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                : 'bg-purple-50 text-purple-700 border border-purple-100'
            }`}
          >
            {order.totalQty} PCS
          </span>
        </td>

        <td className="py-2.5 px-3.5 font-medium text-gray-700">
          <span>{primaryArea || 'Chưa rõ'}</span>
        </td>

        <td className="py-2.5 px-3.5 font-mono text-[11px]">
          {order.shippedTime ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-medium">
              <Clock className="w-3 h-3 text-emerald-600" />
              {order.shippedTime}
            </span>
          ) : order.creationTime ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200/80">
              <Clock className="w-3 h-3 text-blue-500" />
              {order.creationTime}
            </span>
          ) : (
            <span className="text-gray-300">-</span>
          )}
        </td>

        <td className="py-2.5 px-3.5 text-center">
          <button
            onClick={() => onToggleExpand(order.id)}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
            title="Xem dữ liệu gốc của dòng này"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-indigo-600" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </td>
      </tr>

      {/* Expanded Detail Panel */}
      {isExpanded && (
        <tr className="bg-gray-50/60 border-b border-gray-100">
          <td colSpan={10} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                <div className="font-semibold text-gray-700 mb-1 flex items-center justify-between">
                  <span>Gốc Cột C (Thông tin đơn):</span>
                  <span className="text-[10px] text-gray-500 font-normal">
                    {order.carrierName}
                  </span>
                </div>
                <pre className="font-mono text-[11px] text-gray-600 whitespace-pre-wrap">
                  {order.rawOrderText || '(trống)'}
                </pre>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                <div className="font-semibold text-gray-700 mb-1">
                  Gốc Cột G (Piece):
                </div>
                <pre className="font-mono text-[11px] text-gray-600 whitespace-pre-wrap">
                  {order.rawPieceText || '(trống)'}
                </pre>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                <div className="font-semibold text-gray-700 mb-1">
                  Gốc Cột R (Picking List):
                </div>
                <pre className="font-mono text-[11px] text-gray-600 whitespace-pre-wrap">
                  {order.rawPickingText || '(trống)'}
                </pre>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};
