import React, { useState } from 'react';
import { Sparkles, Copy, Check, Info, Box } from 'lucide-react';
import { RawOrderRow, SkuGroupsMap, CarrierCode } from '../../types';
import { xuLyPhanLoaiThamYoga, CARRIER_CONFIG } from '../../utils/orderProcessor';

interface YogaClassificationViewProps {
  orders: RawOrderRow[];
  skuGroups: SkuGroupsMap;
  selectedPickingList: string;
  selectedCarrier?: CarrierCode;
  searchTerm: string;
}

export const YogaClassificationView: React.FC<YogaClassificationViewProps> = ({
  orders,
  skuGroups,
  selectedPickingList,
  selectedCarrier = 'ALL',
  searchTerm,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const result = xuLyPhanLoaiThamYoga(orders, skuGroups, selectedPickingList, selectedCarrier);

  const orderMap = React.useMemo(() => {
    const map = new Map<string, RawOrderRow>();
    orders.forEach((o) => {
      if (o.orderNo) map.set(o.orderNo, o);
    });
    return map;
  }, [orders]);

  const handleCopyList = (key: string, list: string[]) => {
    if (!list || list.length === 0) return;
    navigator.clipboard.writeText(list.join('\n'));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Tính toán các nhóm Thảm Yoga
  const cacSoLuongYoga: string[] = [];
  for (const key in result.donThamYoga) {
    if (result.donThamYoga[key].length > 0) {
      cacSoLuongYoga.push(key);
    }
  }
  cacSoLuongYoga.sort((a, b) => {
    const isNumA = !isNaN(Number(a));
    const isNumB = !isNaN(Number(b));
    if (isNumA && isNumB) return Number(a) - Number(b);
    if (isNumA) return -1;
    if (isNumB) return 1;
    if (a === 'MIX_L46') return -1;
    if (b === 'MIX_L46') return 1;
    return a.localeCompare(b);
  });

  // Tính toán các nhóm Đơn Thường
  const cacSoLuongThuong = Object.keys(result.donThuong)
    .map(Number)
    .filter((qty) => result.donThuong[qty].length > 0)
    .sort((a, b) => a - b);

  // Tổng số đơn
  const totalYogaOrders = Object.values(result.donThamYoga).reduce((s: number, a: string[]) => s + a.length, 0);
  const totalNormalOrders = Object.values(result.donThuong).reduce((s: number, a: string[]) => s + a.length, 0);
  const totalL46Orders = result.donL46.length;
  const totalMix2L46 = result.donMix2PCSL46.length;
  const totalMixKhac = result.donMixKhac.length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-gray-900">Phân Loại Đơn Thảm Yoga & Quy Cách Đặc Biệt (L46)</h2>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-medium">
              Tách Thảm Yoga & L46
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Phân tách Thảm Yoga riêng biệt theo PCS, nhận diện đơn có L46 (YD-L46-1), MIX 2 PCS L46 và đơn thông thường.
          </p>
        </div>
      </div>

      {/* Summary Stat Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Thảm Yoga
          </div>
          <div className="text-lg font-semibold text-gray-900 mt-1">{totalYogaOrders} đơn</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-medium text-amber-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Đơn có L46
          </div>
          <div className="text-lg font-semibold text-gray-900 mt-1">{totalL46Orders} đơn</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-medium text-teal-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
            MIX 2 PCS (L46)
          </div>
          <div className="text-lg font-semibold text-gray-900 mt-1">{totalMix2L46} đơn</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-medium text-indigo-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            Đơn Thông Thường
          </div>
          <div className="text-lg font-semibold text-gray-900 mt-1">{totalNormalOrders} đơn</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <div className="text-xs font-medium text-purple-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            MIX Khác
          </div>
          <div className="text-lg font-semibold text-gray-900 mt-1">{totalMixKhac} đơn</div>
        </div>
      </div>

      {/* 1. KHU VỰC THẢM YOGA */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              1. Phân Loại Đơn Thảm Yoga ({totalYogaOrders} đơn)
            </h3>
          </div>
          <span className="text-xs text-gray-400">
            Mã SKU: YD-B8, YD-B9, YD-L28, YD-L29...
          </span>
        </div>

        <div className="p-5">
          {cacSoLuongYoga.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">
              Không có đơn thảm Yoga nào trong đợt này.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5">
              {cacSoLuongYoga.map((key) => {
                const list = result.donThamYoga[key] || [];
                const label =
                  key === 'MIX_L46'
                    ? 'Thảm Yoga + L46'
                    : key === 'MIX'
                    ? 'MIX Thảm Yoga'
                    : `Thảm Yoga ${key} PCS`;
                const subHint =
                  key === 'MIX_L46'
                    ? '1 Thảm + 1 L46 (Đúng 2 PCS)'
                    : key === 'MIX'
                    ? 'MIX Thảm hoặc > 2 PCS'
                    : undefined;

                return (
                  <div
                    key={key}
                    className="w-full bg-gray-50/60 border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-2xs"
                  >
                    <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-xs text-gray-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>{label}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                          <span>{list.length} đơn</span>
                          {subHint && (
                            <span className="text-gray-500 bg-gray-100 px-1 py-0.2 rounded text-[9px] font-sans font-medium">
                              {subHint}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopyList(label, list)}
                        className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
                        title="Sao chép danh sách"
                      >
                        {copiedKey === label ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="p-2.5 space-y-1 max-h-52 overflow-y-auto font-mono">
                      {list.map((orderNo, idx) => {
                        const ord = orderMap.get(orderNo);
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              navigator.clipboard.writeText(orderNo);
                              setCopiedKey(`ord_${orderNo}`);
                              setTimeout(() => setCopiedKey(null), 1500);
                            }}
                            title={ord?.rawPieceText || ord?.items.map((i) => `${i.sku}*${i.qty}`).join(', ') || ''}
                            className="text-[11px] text-gray-700 hover:text-emerald-700 hover:bg-white p-1.5 rounded-lg border border-transparent hover:border-gray-200 transition-all cursor-pointer flex items-center justify-between group"
                          >
                            <span className="truncate">{orderNo}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {ord && (
                                <span className="text-gray-500 bg-gray-100/90 border border-gray-200/60 px-1.5 py-0.2 rounded text-[9px] font-sans font-medium">
                                  {ord.totalQty} PCS
                                </span>
                              )}
                              {copiedKey === `ord_${orderNo}` ? (
                                <span className="text-[9px] text-emerald-600 font-bold font-sans">✓</span>
                              ) : (
                                <Copy className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. KHU VỰC ĐƠN ĐẶC BIỆT (L46 & MIX) */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              2. Đơn Có L46 & Đơn MIX Đặc Biệt
            </h3>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Đơn có L46 */}
          <div className="bg-gray-50/60 border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-2xs">
            <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between">
              <div>
                <div className="font-semibold text-xs text-gray-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>Đơn có L46</span>
                </div>
                <div className="text-[10px] text-gray-400">{result.donL46.length} đơn</div>
              </div>
              <button
                onClick={() =>
                  handleCopyList(
                    'don_l46',
                    result.donL46.map((it) => it.orderNo)
                  )
                }
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
              >
                {copiedKey === 'don_l46' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="p-2.5 space-y-1 max-h-52 overflow-y-auto font-mono">
              {result.donL46.length === 0 ? (
                <div className="text-[11px] text-gray-400 text-center py-4 font-sans">Trống</div>
              ) : (
                result.donL46.map((it, idx) => (
                  <div
                    key={idx}
                    className="text-[11px] text-gray-700 flex items-center justify-between p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all"
                  >
                    <span>{it.orderNo}</span>
                    <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200/60 px-1.5 py-0.5 rounded-md font-medium">
                      {it.qty} PCS
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* MIX 2 PCS (L46) */}
          <div className="bg-gray-50/60 border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-2xs">
            <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between">
              <div>
                <div className="font-semibold text-xs text-gray-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                  <span>MIX 2 PCS (L46)</span>
                </div>
                <div className="text-[10px] text-gray-400">{result.donMix2PCSL46.length} đơn</div>
              </div>
              <button
                onClick={() => handleCopyList('mix_2pcs_l46', result.donMix2PCSL46)}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
              >
                {copiedKey === 'mix_2pcs_l46' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="p-2.5 space-y-1 max-h-52 overflow-y-auto font-mono">
              {result.donMix2PCSL46.length === 0 ? (
                <div className="text-[11px] text-gray-400 text-center py-4 font-sans">Trống</div>
              ) : (
                result.donMix2PCSL46.map((orderNo, idx) => (
                  <div key={idx} className="text-[11px] text-gray-700 p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all">
                    {orderNo}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* MIX Khác */}
          <div className="bg-gray-50/60 border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-2xs">
            <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between">
              <div>
                <div className="font-semibold text-xs text-gray-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span>MIX Khác</span>
                </div>
                <div className="text-[10px] text-gray-400">{result.donMixKhac.length} đơn</div>
              </div>
              <button
                onClick={() => handleCopyList('mix_khac', result.donMixKhac)}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
              >
                {copiedKey === 'mix_khac' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="p-2.5 space-y-1 max-h-52 overflow-y-auto font-mono">
              {result.donMixKhac.length === 0 ? (
                <div className="text-[11px] text-gray-400 text-center py-4 font-sans">Trống</div>
              ) : (
                result.donMixKhac.map((orderNo, idx) => (
                  <div key={idx} className="text-[11px] text-gray-700 p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all">
                    {orderNo}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. KHU VỰC ĐƠN THÔNG THƯỜNG */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              3. Đơn Thông Thường Theo PCS ({totalNormalOrders} đơn)
            </h3>
          </div>
        </div>

        <div className="p-5">
          {cacSoLuongThuong.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">Trống</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-3.5">
              {cacSoLuongThuong.map((qty) => {
                const list = result.donThuong[qty] || [];
                const label = `${qty} PCS Thường`;

                return (
                  <div
                    key={qty}
                    className="w-full bg-gray-50/60 border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-2xs"
                  >
                    <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-xs text-gray-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                          <span>{qty} PCS</span>
                        </div>
                        <div className="text-[10px] text-gray-400">{list.length} đơn</div>
                      </div>
                      <button
                        onClick={() => handleCopyList(label, list)}
                        className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
                      >
                        {copiedKey === label ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="p-2.5 space-y-1 max-h-52 overflow-y-auto font-mono">
                      {list.map((orderNo, idx) => (
                        <div key={idx} className="text-[11px] text-gray-700 p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all">
                          {orderNo}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
