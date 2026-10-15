import React from 'react';
import { WmsInventoryModule } from '../../modules/wmsInventory';
import { SkuGroupsMap } from '../../types';

interface InventoryQueryViewProps {
  skuGroups: SkuGroupsMap;
  onNavigateToSlotting?: () => void;
  onNavigateToOrders?: () => void;
}

export const InventoryQueryView: React.FC<InventoryQueryViewProps> = (props) => {
  return <WmsInventoryModule {...props} />;
};

export default InventoryQueryView;
