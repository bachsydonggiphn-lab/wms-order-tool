/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { RawOrderRow, SkuGroupsMap, CarrierCode } from './types';
import { DEFAULT_SKU_GROUPS, DEFAULT_AREA_ORDER } from './utils/skuData';
import { taoDuLieuMau, exportResultsToExcel, tinhTongHopSKU, xacDinhDonViVanChuyen } from './utils/orderProcessor';

import { Header } from './components/Header';
import { DataInputSection } from './components/DataInputSection';
import { Toolbar, ActiveTabType } from './components/Toolbar';
import { SkuAndPcsView } from './components/views/SkuAndPcsView';
import { PickingListDetailView } from './components/views/PickingListDetailView';
import { AreaGroupingView } from './components/views/AreaGroupingView';
import { MixOrderAnalysisView } from './components/views/MixOrderAnalysisView';
import { YogaClassificationView } from './components/views/YogaClassificationView';
import { SinglePcsView } from './components/views/SinglePcsView';
import { AllOrdersTableView } from './components/views/AllOrdersTableView';
import { SkuSettingsView } from './components/views/SkuSettingsView';
import { AppsScriptCodeView } from './components/views/AppsScriptCodeView';
import { PrintPickingModal } from './components/PrintPickingModal';
import { ClearDataModal } from './components/ClearDataModal';
import { WmsSyncModal } from './components/WmsSyncModal';
import { RealTimeTrackerBar } from './components/RealTimeTrackerBar';
import { Package, FileSpreadsheet, PlusCircle, Sparkles, CloudDownload } from 'lucide-react';

const LOCAL_STORAGE_KEY_SKU = 'warehouse_sku_groups_v1';
const LOCAL_STORAGE_KEY_ORDERS = 'warehouse_orders_v1';

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
    // Mặc định khởi tạo dữ liệu mẫu thực tế
    return taoDuLieuMau(DEFAULT_SKU_GROUPS);
  });

  // Tự động kiểm tra và nâng cấp lại ĐVVC cho các đơn đã lưu trong LocalStorage theo quy tắc mới nhất (VNGH,...)
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

  // 3. Quản lý bộ lọc & View & Modals
  const [activeTab, setActiveTab] = useState<ActiveTabType>('sku_pcs');
  const [selectedPickingList, setSelectedPickingList] = useState<string>('');
  const [selectedCarrier, setSelectedCarrier] = useState<CarrierCode>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState<boolean>(false);
  const [isWmsModalOpen, setIsWmsModalOpen] = useState<boolean>(false);
  const [forceOpenInput, setForceOpenInput] = useState<boolean>(false);

  // Lưu SKU groups vào LocalStorage khi có thay đổi
  const handleUpdateSkuGroups = (newGroups: SkuGroupsMap) => {
    setSkuGroups(newGroups);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_SKU, JSON.stringify(newGroups));
    } catch (e) {}
  };

  // Lưu orders vào LocalStorage
  const handleDataLoaded = (newOrders: RawOrderRow[]) => {
    setOrders(newOrders);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_ORDERS, JSON.stringify(newOrders));
    } catch (e) {}
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (e) {}
  };

  // Xử lý đơn mới bắt được từ Live WMS Real-Time Tracker
  const handleNewRealTimeOrders = (freshOrders: RawOrderRow[]) => {
    setOrders((current) => {
      const existingIds = new Set(current.map((o) => o.orderNo));
      const trulyNew = freshOrders.filter((o) => !existingIds.has(o.orderNo));
      if (trulyNew.length === 0) return current;

      const merged = [...trulyNew, ...current];
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_ORDERS, JSON.stringify(merged));
      } catch (e) {}
      return merged;
    });
  };

  // Thay thế toàn bộ đơn khi người dùng chọn "Chỉ cào trạng thái này" (VD: Shelved E11=5)
  const handleReloadStatusOrders = (freshOrders: RawOrderRow[]) => {
    setOrders(freshOrders);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_ORDERS, JSON.stringify(freshOrders));
    } catch (e) {}
  };

  const handleLoadSampleData = () => {
    const sample = taoDuLieuMau(skuGroups);
    handleDataLoaded(sample);
  };

  const handleConfirmClearOrders = () => {
    setOrders([]);
    setSelectedPickingList('');
    setSelectedCarrier('ALL');
    setSearchTerm('');
    setForceOpenInput((prev) => !prev);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_ORDERS, JSON.stringify([]));
    } catch (e) {}
  };

  const handleClearData = () => {
    setIsClearModalOpen(true);
  };

  // Danh sách các mã Picking List tìm thấy
  const pickingLists = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.pickingList && o.pickingList.trim() !== '') {
        set.add(o.pickingList.trim());
      }
    });
    return Array.from(set).sort();
  }, [orders]);

  // Thống kê số lượng đơn theo từng ĐVVC (có tính đến bộ lọc Picking List)
  const carrierCounts = useMemo(() => {
    const counts: Record<CarrierCode, number> = {
      ALL: 0,
      JNT: 0,
      SPX: 0,
      GHN: 0,
      GHN_TIKTOK: 0,
      VNPOST: 0,
      OTHER: 0,
    };
    const filtered = selectedPickingList
      ? orders.filter((o) => o.pickingList === selectedPickingList)
      : orders;

    counts.ALL = filtered.length;
    filtered.forEach((o) => {
      const c = xacDinhDonViVanChuyen(o.trackingNo, o.rawOrderText).carrier;
      if (counts[c] !== undefined) {
        counts[c]++;
      } else {
        counts.OTHER++;
      }
    });
    return counts;
  }, [orders, selectedPickingList]);

  // Thống kê tổng hợp SKU
  const skuSummary = useMemo(() => {
    return tinhTongHopSKU(orders, selectedPickingList, selectedCarrier);
  }, [orders, selectedPickingList, selectedCarrier]);

  const totalSkus = Object.keys(skuSummary).length;
  const totalPcs = Object.values(skuSummary).reduce((a: number, b: number) => a + b, 0);

  // Xuất file Excel
  const handleExportExcel = () => {
    if (orders.length === 0) {
      alert('Không có dữ liệu đơn hàng để xuất.');
      return;
    }
    exportResultsToExcel(orders, skuGroups, DEFAULT_AREA_ORDER, selectedPickingList, selectedCarrier);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Global Header */}
      <Header
        orders={orders}
        totalSkus={totalSkus}
        totalPcs={totalPcs}
        pickingLists={pickingLists}
        carrierCounts={carrierCounts}
        onLoadSample={handleLoadSampleData}
        onClear={handleClearData}
        onOpenWmsSync={() => setIsWmsModalOpen(true)}
      />

      {/* Real-Time Live WMS Tracker Bar */}
      <RealTimeTrackerBar
        orders={orders}
        onNewOrders={handleNewRealTimeOrders}
        onReloadStatusOrders={handleReloadStatusOrders}
        skuGroups={skuGroups}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 py-5">
        {/* Data Input Panel */}
        <DataInputSection
          onDataLoaded={handleDataLoaded}
          onClearData={handleClearData}
          onLoadSample={handleLoadSampleData}
          onOpenWmsModal={() => setIsWmsModalOpen(true)}
          skuGroups={skuGroups}
          ordersCount={orders.length}
          forceOpen={forceOpenInput}
        />

        {/* Empty state alert when no orders are loaded */}
        {orders.length === 0 && (
          <div className="mb-6 p-6 bg-gradient-to-br from-indigo-50/90 to-amber-50/70 border border-indigo-200/80 rounded-3xl text-center shadow-xs">
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
                onClick={() => setIsWmsModalOpen(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="text-amber-300 text-sm">⚡</span>
                <span>Kéo Đơn Trực Tiếp YunWMS (API)</span>
              </button>
              <button
                onClick={() => setForceOpenInput((prev) => !prev)}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Mở Khung Nhập & Dán Dữ Liệu</span>
              </button>
              <button
                onClick={handleLoadSampleData}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <span>Dữ Liệu Mẫu (22 đơn)</span>
              </button>
            </div>
          </div>
        )}

        {/* Toolbar & Filter Bar */}
        <Toolbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
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
        />

        {/* Active Tab View Rendering */}
        <div className="transition-all duration-200">
          {activeTab === 'sku_pcs' && (
            <SkuAndPcsView
              orders={orders}
              skuGroups={skuGroups}
              selectedPickingList={selectedPickingList}
              selectedCarrier={selectedCarrier}
              searchTerm={searchTerm}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'picking_detail' && (
            <PickingListDetailView
              orders={orders}
              skuGroups={skuGroups}
              selectedPickingList={selectedPickingList}
              onSelectPickingList={setSelectedPickingList}
              searchTerm={searchTerm}
              onOpenPrintModal={(pl) => {
                if (pl) setSelectedPickingList(pl);
                setIsPrintModalOpen(true);
              }}
            />
          )}

          {activeTab === 'area_group' && (
            <AreaGroupingView
              orders={orders}
              skuGroups={skuGroups}
              selectedPickingList={selectedPickingList}
              selectedCarrier={selectedCarrier}
              searchTerm={searchTerm}
            />
          )}

          {activeTab === 'mix_analysis' && (
            <MixOrderAnalysisView
              orders={orders}
              skuGroups={skuGroups}
              selectedPickingList={selectedPickingList}
              selectedCarrier={selectedCarrier}
            />
          )}

          {activeTab === 'yoga_mat' && (
            <YogaClassificationView
              orders={orders}
              skuGroups={skuGroups}
              selectedPickingList={selectedPickingList}
              selectedCarrier={selectedCarrier}
              searchTerm={searchTerm}
            />
          )}

          {activeTab === 'single_pcs' && (
            <SinglePcsView
              orders={orders}
              skuGroups={skuGroups}
              selectedPickingList={selectedPickingList}
              selectedCarrier={selectedCarrier}
              searchTerm={searchTerm}
            />
          )}

          {activeTab === 'all_table' && (
            <AllOrdersTableView
              orders={orders}
              skuGroups={skuGroups}
              selectedPickingList={selectedPickingList}
              selectedCarrier={selectedCarrier}
              onSelectCarrier={setSelectedCarrier}
              searchTerm={searchTerm}
            />
          )}

          {activeTab === 'sku_settings' && (
            <SkuSettingsView
              skuGroups={skuGroups}
              onUpdateSkuGroups={handleUpdateSkuGroups}
            />
          )}

          {activeTab === 'apps_script' && <AppsScriptCodeView />}
        </div>
      </main>

      {/* Clear Data Confirmation Modal */}
      <ClearDataModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirmClear={handleConfirmClearOrders}
        onLoadSample={handleLoadSampleData}
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
        onClose={() => setIsPrintModalOpen(false)}
        orders={orders}
        selectedPickingList={selectedPickingList}
        selectedCarrier={selectedCarrier}
        skuGroups={skuGroups}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="w-full mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Công Cụ Xử Lý & Phân Loại Đơn Hàng Kho (Tương thích Google Apps Script)</span>
          <span className="text-slate-400">
            Hỗ trợ trích xuất Order No, Picking List No, gộp PCS, phân nhóm 13 khu vực & Thảm Yoga
          </span>
        </div>
      </footer>
    </div>
  );
}
