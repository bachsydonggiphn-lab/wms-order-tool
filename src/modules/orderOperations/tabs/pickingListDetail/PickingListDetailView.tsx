import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { PickingListDetailViewProps } from './types';
import { usePickingListDetailData } from './hooks/usePickingListDetailData';
import { PickingListDetailBanner } from './components/PickingListDetailBanner';
import { PickingListSelectorSidebar } from './components/PickingListSelectorSidebar';
import { PickingListActiveDetailPanel } from './components/PickingListActiveDetailPanel';

export const PickingListDetailView: React.FC<PickingListDetailViewProps> = (props) => {
  const { selectedCarrier, onSelectCarrier, onOpenPrintModal, onSelectPickingList, skuGroups } = props;
  const data = usePickingListDetailData(props);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {data.toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{data.toastMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <PickingListDetailBanner
        selectedCarrier={selectedCarrier}
        carrierInfo={data.carrierInfo}
        listsWithCarrierCount={data.listsWithCarrierCount}
        onSelectCarrier={onSelectCarrier}
        filteredPlCount={data.filteredPlList.length}
        totalPlCount={data.pickingListStats.length}
        onOpenPrintModal={onOpenPrintModal ? () => onOpenPrintModal() : undefined}
      />

      {/* Main Grid: Left side list of PLs, Right side detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <PickingListSelectorSidebar
          filteredPlList={data.filteredPlList}
          activePlFilter={data.activePlFilter}
          setActivePlFilter={data.setActivePlFilter}
          onSelectPickingList={onSelectPickingList}
          selectedCarrier={selectedCarrier}
          carrierInfo={data.carrierInfo}
          showOnlyCarrierLists={data.showOnlyCarrierLists}
          setShowOnlyCarrierLists={data.setShowOnlyCarrierLists}
          listsWithCarrierCount={data.listsWithCarrierCount}
          totalPlCount={data.pickingListStats.length}
          copiedKey={data.copiedKey}
          handleCopyText={data.handleCopyText}
        />

        <PickingListActiveDetailPanel
          currentPl={data.currentPl}
          activeDetailData={data.activeDetailData}
          selectedCarrier={selectedCarrier}
          carrierInfo={data.carrierInfo}
          viewScope={data.viewScope}
          setViewScope={data.setViewScope}
          onOpenPrintModal={onOpenPrintModal}
          handleCopyPlSkuTable={data.handleCopyPlSkuTable}
          handleCopyText={data.handleCopyText}
          copiedKey={data.copiedKey}
          skuGroups={skuGroups}
        />
      </div>
    </div>
  );
};

export default PickingListDetailView;
