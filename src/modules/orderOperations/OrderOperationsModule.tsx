import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Package, FileSpreadsheet, PlusCircle } from 'lucide-react';
import { RawOrderRow, SkuGroupsMap, CarrierCode } from '../../types';
import { xacDinhDonViVanChuyen, exportResultsToExcel } from '../../utils/orderProcessor';
import { TabErrorBoundary } from '../../components/common/TabErrorBoundary';
import { Toolbar, ActiveTabType } from '../../components/Toolbar';
import { DataInputSection } from '../../components/DataInputSection';
import { RealTimeTrackerBar } from '../../components/RealTimeTrackerBar';
import {
  SkuAndPcsView,
  PickingListDetailView,
  AreaGroupingView,
  MixOrderAnalysisView,
  YogaClassificationView,
  SinglePcsView,
  AllOrdersTableView,
  ShippedTrackingView,
  SkuSettingsView,
  AppsScriptCodeView,
} from './tabs';
import { ClearDataModal } from '../../components/ClearDataModal';
import { WmsSyncModal } from '../../components/WmsSyncModal';
import { PrintPickingModal } from '../../components/PrintPickingModal';

interface OrderOperationsModuleProps {
  orders: RawOrderRow[];
  onOrdersChange: (orders: RawOrderRow[]) => void;
  skuGroups: SkuGroupsMap;
  onUpdateSkuGroups: (groups: SkuGroupsMap) => void;
  activeSubTab: ActiveTabType;
  onSelectSubTab: (tab: ActiveTabType) => void;
  visitedTabs: Set<ActiveTabType>;
  onLoadSampleData: () => void;
  onConfirmClearOrders: () => void;
  isWmsModalOpen?: boolean;
  setIsWmsModalOpen?: (open: boolean) => void;
  isClearModalOpen?: boolean;
  setIsClearModalOpen?: (open: boolean) => void;
}

export const OrderOperationsModule: React.FC<OrderOperationsModuleProps> = ({
  orders,
  onOrdersChange,
  skuGroups,
  onUpdateSkuGroups,
  activeSubTab,
  onSelectSubTab,
  visitedTabs,
  onLoadSampleData,
  onConfirmClearOrders,
  isWmsModalOpen: externalIsWmsModalOpen,
  setIsWmsModalOpen: externalSetIsWmsModalOpen,
  isClearModalOpen: externalIsClearModalOpen,
  setIsClearModalOpen: externalSetIsClearModalOpen,
}) => {
  const [selectedPickingList, setSelectedPickingList] = useState<string>('');
  const [selectedCarrier, setSelectedCarrier] = useState<CarrierCode>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [customPrintOrders, setCustomPrintOrders] = useState<RawOrderRow[] | null>(null);
  const [internalIsClearModalOpen, setInternalIsClearModalOpen] = useState<boolean>(false);
  const [internalIsWmsModalOpen, setInternalIsWmsModalOpen] = useState<boolean>(false);
  const [forceOpenInput, setForceOpenInput] = useState<boolean>(false);
  const [currentWmsStatus, setCurrentWmsStatus] = useState<string>(() => {
    try {
      return localStorage.getItem('wms_auto_refresh_status') || '4';
    } catch {
      return '4';
    }
  });

  const isClearModalOpen = externalIsClearModalOpen !== undefined ? externalIsClearModalOpen : internalIsClearModalOpen;
  const setIsClearModalOpen = externalSetIsClearModalOpen || setInternalIsClearModalOpen;

  const isWmsModalOpen = externalIsWmsModalOpen !== undefined ? externalIsWmsModalOpen : internalIsWmsModalOpen;
  const setIsWmsModalOpen = externalSetIsWmsModalOpen || setInternalIsWmsModalOpen;

  // Danh sách các mã Picking List
  const pickingLists = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o && o.pickingList) {
        const pl = String(o.pickingList).trim();
        if (pl) set.add(pl);
      }
    });
    return Array.from(set).sort();
  }, [orders]);

  // Mặc định luôn là Tất cả: Tự động reset về '' nếu danh sách đơn không có Picking List nào (chỉ reset khi modal in không mở)
  useEffect(() => {
    if (!isPrintModalOpen && selectedPickingList && (pickingLists.length === 0 || !pickingLists.includes(selectedPickingList))) {
      setSelectedPickingList('');
    }
  }, [pickingLists, selectedPickingList, isPrintModalOpen]);

  // Thống kê số lượng đơn theo từng ĐVVC
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
    const validOrders = Array.isArray(orders) ? orders.filter(Boolean) : [];
    const filtered = (selectedPickingList && pickingLists.includes(selectedPickingList))
      ? validOrders.filter((o) => o && String(o.pickingList || '').trim() === selectedPickingList)
      : validOrders;

    counts.ALL = filtered.length;
    filtered.forEach((o) => {
      if (!o) return;
      const c = xacDinhDonViVanChuyen(o.trackingNo, o.rawOrderText).carrier;
      if (counts[c] !== undefined) {
        counts[c]++;
      } else {
        counts.OTHER++;
      }
    });

    counts.GHN_ALL = (counts.GHN || 0) + (counts.GHN_TIKTOK || 0);
    counts.SPX_ALL = (counts.SPX || 0) + (counts.SPX_INSTANT || 0);

    return counts;
  }, [orders, selectedPickingList, pickingLists]);

  const normalizeOrders = useCallback((rawList: RawOrderRow[]): RawOrderRow[] => {
    if (!Array.isArray(rawList)) return [];
    return rawList.filter(Boolean).map((o) => {
      const cInfo = xacDinhDonViVanChuyen(o.trackingNo, o.rawOrderText);
      return {
        ...o,
        carrier: cInfo.carrier,
        carrierName: cInfo.carrierName,
      };
    });
  }, []);

  const handleDataLoaded = useCallback((newOrders: RawOrderRow[]) => {
    const normalized = normalizeOrders(newOrders);
    onOrdersChange(normalized);
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (e) {}
  }, [normalizeOrders, onOrdersChange]);

  const handleNewRealTimeOrders = useCallback((freshOrders: RawOrderRow[]) => {
    const normalizedFresh = normalizeOrders(freshOrders);
    const existingIds = new Set(orders.map((o) => o.orderNo));
    const trulyNew = normalizedFresh.filter((o) => !existingIds.has(o.orderNo));
    if (trulyNew.length === 0) return;

    const merged = [...trulyNew, ...orders];
    onOrdersChange(merged);
  }, [normalizeOrders, orders, onOrdersChange]);

  const handleReloadStatusOrders = useCallback((freshOrders: RawOrderRow[]) => {
    const normalized = normalizeOrders(freshOrders);
    onOrdersChange(normalized);
  }, [normalizeOrders, onOrdersChange]);

  const handleExportExcel = useCallback(() => {
    exportResultsToExcel(orders, skuGroups, undefined, selectedPickingList, selectedCarrier);
  }, [orders, skuGroups, selectedPickingList, selectedCarrier]);

  return (
    <TabErrorBoundary tabName="1. Vận Hành Đơn Hàng">
      <div className="w-full space-y-4">
        {/* Real-Time Live Order Tracker Bar */}
        <RealTimeTrackerBar
          orders={orders}
          currentOrders={orders}
          onNewOrders={handleNewRealTimeOrders}
          onNewOrdersDetected={handleNewRealTimeOrders}
          onReloadStatusOrders={handleReloadStatusOrders}
          onSwitchStatus={(targetStatus) => {
            setCurrentWmsStatus(targetStatus);
            if (targetStatus === '4') {
              onSelectSubTab('sku_pcs');
              setSelectedPickingList('');
            } else if (targetStatus === '5') {
              onSelectSubTab('picking_detail');
              setSelectedPickingList('');
            } else if (targetStatus === '8') {
              onSelectSubTab('shipped_tracking');
              setSelectedPickingList('');
            }
          }}
          skuGroups={skuGroups}
          pickingLists={pickingLists}
          onLoadSample={onLoadSampleData}
          onClear={() => setIsClearModalOpen(true)}
          onOpenWmsSync={() => setIsWmsModalOpen(true)}
        />

        {/* Data Input Section: Ẩn hoàn toàn khi đã có dữ liệu đơn hàng (người dùng làm việc trực tiếp qua YunWMS) */}
        {(orders.length === 0 || forceOpenInput) && (
          <DataInputSection
            onDataLoaded={(newOrders) => {
              setForceOpenInput(false);
              handleDataLoaded(newOrders);
            }}
            skuGroups={skuGroups}
            onClearData={() => setIsClearModalOpen(true)}
            ordersCount={orders.length}
            onOpenWmsModal={() => setIsWmsModalOpen(true)}
            forceOpen={forceOpenInput}
            onClose={() => setForceOpenInput(false)}
          />
        )}

        {/* Toolbar & Filter Bar */}
        <div className="w-full">
          <Toolbar
            activeTab={activeSubTab}
            setActiveTab={onSelectSubTab}
            pickingLists={pickingLists}
            selectedPickingList={selectedPickingList}
            setSelectedPickingList={setSelectedPickingList}
            selectedCarrier={selectedCarrier}
            setSelectedCarrier={setSelectedCarrier}
            carrierCounts={carrierCounts}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onExportExcel={handleExportExcel}
            onPrintPreview={() => setIsPrintModalOpen(true)}
            totalOrders={orders.length}
            orders={orders}
          />
        </div>

        {/* Empty State Banner when 0 orders */}
        {orders.length === 0 && (
          <div className="mb-6 p-6 bg-gradient-to-br from-indigo-50/90 to-amber-50/70 border border-indigo-200/80 rounded-3xl text-center shadow-xs animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Chưa Có Dữ Liệu Đơn Hàng Nào Trong Hệ Thống
            </h3>
            <p className="text-xs text-gray-600 max-w-lg mx-auto mb-4 leading-relaxed">
              Bạn có thể bấm <b>Kéo Đơn Trực Tiếp YunWMS</b> để lấy đơn trạng thái <b>Submitted</b> từ kho VN02 tự động bằng API, hoặc sao chép bảng dữ liệu dán vào khung phía trên.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsWmsModalOpen(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="text-amber-300 text-sm">⚡</span>
                <span>Kéo Đơn Trực Tiếp YunWMS (API)</span>
              </button>
              <button
                type="button"
                onClick={() => setForceOpenInput((prev) => !prev)}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Mở Khung Nhập & Dán Dữ Liệu</span>
              </button>
              <button
                type="button"
                onClick={onLoadSampleData}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <span>Dữ Liệu Mẫu (22 đơn)</span>
              </button>
            </div>
          </div>
        )}

        {/* Subtabs Rendering with Keep-Alive Cache */}
        <div className="w-full">
          {visitedTabs.has('sku_pcs') && (
            <div className={activeSubTab === 'sku_pcs' ? 'block' : 'hidden'}>
              <SkuAndPcsView
                orders={orders}
                skuGroups={skuGroups}
                selectedPickingList={selectedPickingList}
                selectedCarrier={selectedCarrier}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onExportExcel={handleExportExcel}
                onPrintPreview={() => setIsPrintModalOpen(true)}
                onNavigateTab={onSelectSubTab}
                onOpenPrintModal={(pl, customOrders) => {
                  if (pl) setSelectedPickingList(pl);
                  if (customOrders && customOrders.length > 0) {
                    setCustomPrintOrders(customOrders);
                  } else {
                    setCustomPrintOrders(null);
                  }
                  setIsPrintModalOpen(true);
                }}
                onOrdersChange={onOrdersChange}
                currentWmsStatus={currentWmsStatus}
              />
            </div>
          )}

          {visitedTabs.has('picking_detail') && (
            <div className={activeSubTab === 'picking_detail' ? 'block' : 'hidden'}>
              <PickingListDetailView
                orders={orders}
                skuGroups={skuGroups}
                selectedPickingList={selectedPickingList}
                onSelectPickingList={setSelectedPickingList}
                searchTerm={searchTerm}
                selectedCarrier={selectedCarrier}
                onSelectCarrier={setSelectedCarrier}
                onOpenPrintModal={(pl) => {
                  if (pl) setSelectedPickingList(pl);
                  setIsPrintModalOpen(true);
                }}
              />
            </div>
          )}

          {visitedTabs.has('area_group') && (
            <div className={activeSubTab === 'area_group' ? 'block' : 'hidden'}>
              <AreaGroupingView
                orders={orders}
                skuGroups={skuGroups}
                selectedPickingList={selectedPickingList}
                selectedCarrier={selectedCarrier}
                searchTerm={searchTerm}
              />
            </div>
          )}

          {visitedTabs.has('mix_analysis') && (
            <div className={activeSubTab === 'mix_analysis' ? 'block' : 'hidden'}>
              <MixOrderAnalysisView
                orders={orders}
                skuGroups={skuGroups}
                selectedPickingList={selectedPickingList}
                selectedCarrier={selectedCarrier}
              />
            </div>
          )}

          {visitedTabs.has('yoga_mat') && (
            <div className={activeSubTab === 'yoga_mat' ? 'block' : 'hidden'}>
              <YogaClassificationView
                orders={orders}
                skuGroups={skuGroups}
                selectedPickingList={selectedPickingList}
                selectedCarrier={selectedCarrier}
                searchTerm={searchTerm}
              />
            </div>
          )}

          {visitedTabs.has('single_pcs') && (
            <div className={activeSubTab === 'single_pcs' ? 'block' : 'hidden'}>
              <SinglePcsView
                orders={orders}
                skuGroups={skuGroups}
                selectedPickingList={selectedPickingList}
                selectedCarrier={selectedCarrier}
                searchTerm={searchTerm}
              />
            </div>
          )}

          {visitedTabs.has('shipped_tracking') && (
            <div className={activeSubTab === 'shipped_tracking' ? 'block' : 'hidden'}>
              <ShippedTrackingView
                skuGroups={skuGroups}
              />
            </div>
          )}

          {visitedTabs.has('all_table') && (
            <div className={activeSubTab === 'all_table' ? 'block' : 'hidden'}>
              <AllOrdersTableView
                orders={orders}
                skuGroups={skuGroups}
                selectedPickingList={selectedPickingList}
                selectedCarrier={selectedCarrier}
                onSelectCarrier={setSelectedCarrier}
                searchTerm={searchTerm}
              />
            </div>
          )}

          {visitedTabs.has('sku_settings') && (
            <div className={activeSubTab === 'sku_settings' ? 'block' : 'hidden'}>
              <SkuSettingsView
                skuGroups={skuGroups}
                onUpdateSkuGroups={onUpdateSkuGroups}
              />
            </div>
          )}

          {visitedTabs.has('apps_script') && (
            <div className={activeSubTab === 'apps_script' ? 'block' : 'hidden'}>
              <AppsScriptCodeView />
            </div>
          )}
        </div>

        {/* Clear Data Confirmation Modal */}
        <ClearDataModal
          isOpen={isClearModalOpen}
          onClose={() => setIsClearModalOpen(false)}
          onConfirmClear={onConfirmClearOrders}
          onLoadSample={onLoadSampleData}
          currentOrdersCount={orders.length}
        />

        {/* WMS Direct Sync Modal */}
        <WmsSyncModal
          isOpen={isWmsModalOpen}
          onClose={() => setIsWmsModalOpen(false)}
          onDataLoaded={handleDataLoaded}
          skuGroups={skuGroups}
          currentOrdersCount={orders.length}
        />

        {/* Printable Modal */}
        <PrintPickingModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setCustomPrintOrders(null);
          }}
          orders={customPrintOrders || orders}
          selectedPickingList={selectedPickingList}
          selectedCarrier={selectedCarrier}
          skuGroups={skuGroups}
        />
      </div>
    </TabErrorBoundary>
  );
};
