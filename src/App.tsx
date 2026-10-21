/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RawOrderRow, SkuGroupsMap, CarrierCode } from './types';
import { DEFAULT_SKU_GROUPS } from './utils/skuData';
import { taoDuLieuMau, tinhTongHopSKU, xacDinhDonViVanChuyen } from './utils/orderProcessor';

import { Header } from './components/Header';
import { ActiveTabType } from './components/Toolbar';
import { OrderOperationsModule } from './modules/orderOperations';
import { HotSkuSlottingModule } from './modules/hotSkuSlotting';
import { WmsInventoryModule } from './modules/wmsInventory';
import { OrderPdfBatchPrintView } from './components/views/OrderPdfBatchPrintView';
import { ArrowUp } from 'lucide-react';

const LOCAL_STORAGE_KEY_SKU = 'warehouse_sku_groups_v1';
const LOCAL_STORAGE_KEY_ORDERS = 'warehouse_orders_v1';
let globalSaveOrdersTimer: any = null;

export default function App() {
  // 1. Quản lý danh mục SKU & Nhóm
  const [skuGroups, setSkuGroups] = useState<SkuGroupsMap>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_SKU);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return DEFAULT_SKU_GROUPS;
  });

  // 2. Quản lý danh sách đơn hàng
  const [orders, setOrders] = useState<RawOrderRow[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_ORDERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const isSample = parsed.some((o: RawOrderRow) => o.orderNo === 'YD-260816-0756' || o.orderNo === 'YD-260906-0733');
          if (isSample) {
            localStorage.removeItem(LOCAL_STORAGE_KEY_ORDERS);
            return [];
          }

          return parsed.map((o: RawOrderRow) => {
            const cInfo = xacDinhDonViVanChuyen(o.trackingNo, o.rawOrderText);
            return {
              ...o,
              carrier: cInfo.carrier,
              carrierName: cInfo.carrierName,
            };
          });
        }
      }
    } catch (e) {}
    return [];
  });

  // Tự động kiểm tra và nâng cấp lại ĐVVC
  useEffect(() => {
    setOrders((currentOrders) => {
      let hasChange = false;
      const updated = currentOrders.map((o) => {
        const cInfo = xacDinhDonViVanChuyen(o.trackingNo, o.rawOrderText);
        if (o.carrier !== cInfo.carrier || o.carrierName !== cInfo.carrierName) {
          hasChange = true;
          return {
            ...o,
            carrier: cInfo.carrier,
            carrierName: cInfo.carrierName,
          };
        }
        return o;
      });
      if (hasChange) {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY_ORDERS, JSON.stringify(updated));
        } catch (e) {}
        return updated;
      }
      return currentOrders;
    });
  }, []);

  // 3. Quản lý 3 Tab Lớn (Vận Hành Đơn Hàng | Hàng Bán Chạy & Bố Trí Kho | Tra Cứu Tồn Kho WMS)
  const [activeTab, setActiveTabRaw] = useState<ActiveTabType>('sku_pcs');
  const [visitedTabs, setVisitedTabs] = useState<Set<ActiveTabType>>(() => new Set<ActiveTabType>(['sku_pcs']));
  const [lastOrderSubTab, setLastOrderSubTab] = useState<ActiveTabType>('sku_pcs');

  const setActiveTab = useCallback((tab: ActiveTabType) => {
    React.startTransition(() => {
      setActiveTabRaw(tab);
      setVisitedTabs((prev) => {
        if (prev.has(tab)) return prev;
        const next = new Set(prev);
        next.add(tab);
        return next;
      });
    });
  }, []);

  const isOrderOps = activeTab !== 'hot_sku_slotting' && activeTab !== 'inventory_query' && activeTab !== 'order_pdf_print';

  useEffect(() => {
    if (activeTab !== 'hot_sku_slotting' && activeTab !== 'inventory_query' && activeTab !== 'order_pdf_print') {
      setLastOrderSubTab(activeTab);
    }
  }, [activeTab]);

  // Lưu SKU groups vào LocalStorage khi có thay đổi
  const handleUpdateSkuGroups = (newGroups: SkuGroupsMap) => {
    setSkuGroups(newGroups);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_SKU, JSON.stringify(newGroups));
    } catch (e) {}
  };

  // Lưu orders vào LocalStorage không chặn main-thread (Debounce 1.2s)
  const saveOrdersToStorage = (data: RawOrderRow[]) => {
    if (globalSaveOrdersTimer) clearTimeout(globalSaveOrdersTimer);
    globalSaveOrdersTimer = setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_ORDERS, JSON.stringify(data));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }
    }, 1200);
  };

  const handleOrdersChange = (newOrders: RawOrderRow[]) => {
    setOrders(newOrders);
    saveOrdersToStorage(newOrders);
  };

  const handleLoadSampleData = () => {
    const sample = taoDuLieuMau(skuGroups);
    handleOrdersChange(sample);
  };

  const handleConfirmClearOrders = () => {
    setOrders([]);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_ORDERS, JSON.stringify([]));
    } catch (e) {}
  };

  // Header stats & counts
  const pickingLists = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.pickingList && o.pickingList.trim() !== '') {
        set.add(o.pickingList.trim());
      }
    });
    return Array.from(set).sort();
  }, [orders]);

  const carrierCounts = useMemo(() => {
    const counts: Record<CarrierCode, number> = {
      ALL: 0,
      SPX: 0,
      SPX_INSTANT: 0,
      SPX_ALL: 0,
      JNT: 0,
      JT_CARGO: 0,
      GHN: 0,
      GHN_TIKTOK: 0,
      GHN_ALL: 0,
      NINJAVAN: 0,
      VIETTELPOST: 0,
      VNPOST: 0,
      BEST: 0,
      OTHER: 0,
    };
    counts.ALL = orders.length;
    orders.forEach((o) => {
      const c = xacDinhDonViVanChuyen(o.trackingNo, o.rawOrderText).carrier;
      if (counts[c] !== undefined) {
        counts[c]++;
      } else {
        counts.OTHER++;
      }
    });
    counts.GHN_ALL = counts.GHN + counts.GHN_TIKTOK;
    counts.SPX_ALL = counts.SPX + counts.SPX_INSTANT;
    return counts;
  }, [orders]);

  const skuSummary = useMemo(() => {
    return tinhTongHopSKU(orders, '', 'ALL');
  }, [orders]);

  const totalSkus = Object.keys(skuSummary).length;
  const totalPcs = Object.values(skuSummary).reduce((a: number, b: number) => a + b, 0);

  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [isWmsModalOpen, setIsWmsModalOpen] = useState<boolean>(false);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 350);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Global Header with 3 Master Module Switchers */}
      <Header
        orders={orders}
        totalSkus={totalSkus}
        totalPcs={totalPcs}
        pickingLists={pickingLists}
        carrierCounts={carrierCounts}
        onLoadSample={handleLoadSampleData}
        onClear={() => setIsClearModalOpen(true)}
        onOpenWmsSync={() => setIsWmsModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lastOrderSubTab={lastOrderSubTab}
      />

      {/* Main Content Area: 3 Phân Hệ Lớn Được Bọc & Cô Lập Cách Ly Hoàn Toàn */}
      <main className="flex-1 w-full mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 py-5">
        {/* PHÂN HỆ 1: VẬN HÀNH ĐƠN HÀNG (2507) */}
        <div className={isOrderOps ? 'block' : 'hidden'}>
          <OrderOperationsModule
            orders={orders}
            onOrdersChange={handleOrdersChange}
            skuGroups={skuGroups}
            onUpdateSkuGroups={handleUpdateSkuGroups}
            activeSubTab={activeTab}
            onSelectSubTab={setActiveTab}
            visitedTabs={visitedTabs}
            onLoadSampleData={handleLoadSampleData}
            onConfirmClearOrders={handleConfirmClearOrders}
            isClearModalOpen={isClearModalOpen}
            setIsClearModalOpen={setIsClearModalOpen}
            isWmsModalOpen={isWmsModalOpen}
            setIsWmsModalOpen={setIsWmsModalOpen}
          />
        </div>

        {/* PHÂN HỆ 2: HÀNG BÁN CHẠY & BỐ TRÍ KHO (ABC) */}
        {visitedTabs.has('hot_sku_slotting') && (
          <div className={activeTab === 'hot_sku_slotting' ? 'block' : 'hidden'}>
            <HotSkuSlottingModule
              skuGroups={skuGroups}
              onNavigateToInventory={(sku?: string) => {
                setActiveTab('inventory_query');
              }}
              onNavigateToOrders={() => setActiveTab(lastOrderSubTab)}
            />
          </div>
        )}

        {/* PHÂN HỆ 3: TRA CỨU TỒN KHO WMS (VN02) */}
        {visitedTabs.has('inventory_query') && (
          <div className={activeTab === 'inventory_query' ? 'block' : 'hidden'}>
            <WmsInventoryModule
              skuGroups={skuGroups}
              onNavigateToSlotting={() => {
                setActiveTab('hot_sku_slotting');
              }}
              onNavigateToOrders={() => setActiveTab(lastOrderSubTab)}
            />
          </div>
        )}

        {/* PHÂN HỆ 4: TỔNG HỢP PDF & NHẶT HÀNG (TÌM & IN 1 LẦN) - ĐỘC LẬP HOÀN TOÀN */}
        {visitedTabs.has('order_pdf_print') && (
          <div className={activeTab === 'order_pdf_print' ? 'block' : 'hidden'}>
            <OrderPdfBatchPrintView
              orders={orders}
              skuGroups={skuGroups}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="w-full mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Công Cụ Xử Lý & Phân Loại Đơn Hàng Kho (Tương thích Google Apps Script)</span>
          <span className="text-slate-400">
            Hỗ trợ trích xuất Order No, Picking List No, gộp PCS, phân nhóm 13 khu vực & Thảm Yoga
          </span>
        </div>
      </footer>

      {/* Floating Scroll To Top Button (Mobile & Desktop) */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-5 z-40 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl shadow-indigo-600/30 border border-indigo-400/30 transition-all transform active:scale-95 animate-fade-in flex items-center justify-center cursor-pointer"
          title="Cuộn lên đầu trang"
          aria-label="Cuộn lên đầu trang"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
