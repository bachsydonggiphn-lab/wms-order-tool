import React from 'react';
import { HotSkuSlottingModule } from '../../modules/hotSkuSlotting';
import { SkuGroupsMap } from '../../types';

interface HotSkuSlottingViewProps {
  skuGroups?: SkuGroupsMap;
  onNavigateToInventory?: (sku?: string) => void;
  onNavigateToOrders?: () => void;
}

export const HotSkuSlottingView: React.FC<HotSkuSlottingViewProps> = (props) => {
  return <HotSkuSlottingModule {...props} />;
};

export default HotSkuSlottingView;
