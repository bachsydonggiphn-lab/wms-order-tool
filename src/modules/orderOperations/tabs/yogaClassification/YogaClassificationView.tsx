import React from 'react';
import { YogaClassificationViewProps } from './types';
import { useYogaClassificationData } from './hooks/useYogaClassificationData';
import { YogaHeaderBanner } from './components/YogaHeaderBanner';
import { YogaKpiCards } from './components/YogaKpiCards';
import { YogaMatsSection } from './components/YogaMatsSection';
import { YogaL46AndMixSection } from './components/YogaL46AndMixSection';
import { YogaNormalOrdersSection } from './components/YogaNormalOrdersSection';

export const YogaClassificationView: React.FC<YogaClassificationViewProps> = ({
  orders,
  skuGroups,
  selectedPickingList,
  selectedCarrier = 'ALL',
  searchTerm,
}) => {
  const {
    copiedKey,
    result,
    orderMap,
    handleCopyList,
    handleCopySingle,
    cacSoLuongYoga,
    cacSoLuongThuong,
    totalYogaOrders,
    totalNormalOrders,
    totalL46Orders,
    totalMix2L46,
    totalMixKhac,
  } = useYogaClassificationData({
    orders,
    skuGroups,
    selectedPickingList,
    selectedCarrier,
    searchTerm,
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <YogaHeaderBanner />

      {/* Summary Stat Badges Grid */}
      <YogaKpiCards
        totalYogaOrders={totalYogaOrders}
        totalL46Orders={totalL46Orders}
        totalMix2L46={totalMix2L46}
        totalNormalOrders={totalNormalOrders}
        totalMixKhac={totalMixKhac}
      />

      {/* 1. KHU VỰC THẢM YOGA */}
      <YogaMatsSection
        totalYogaOrders={totalYogaOrders}
        cacSoLuongYoga={cacSoLuongYoga}
        donThamYoga={result.donThamYoga}
        orderMap={orderMap}
        copiedKey={copiedKey}
        onCopyList={handleCopyList}
        onCopySingle={handleCopySingle}
      />

      {/* 2. KHU VỰC ĐƠN ĐẶC BIỆT (L46 & MIX) */}
      <YogaL46AndMixSection
        donL46={result.donL46}
        donMix2PCSL46={result.donMix2PCSL46}
        donMixKhac={result.donMixKhac}
        copiedKey={copiedKey}
        onCopyList={handleCopyList}
      />

      {/* 3. KHU VỰC ĐƠN THÔNG THƯỜNG */}
      <YogaNormalOrdersSection
        totalNormalOrders={totalNormalOrders}
        cacSoLuongThuong={cacSoLuongThuong}
        donThuong={result.donThuong}
        copiedKey={copiedKey}
        onCopyList={handleCopyList}
      />
    </div>
  );
};
