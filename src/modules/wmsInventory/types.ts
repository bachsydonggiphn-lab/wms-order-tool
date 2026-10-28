import { SkuGroupsMap } from '../../types';

export interface WmsInventoryModuleProps {
  skuGroups: SkuGroupsMap;
  onNavigateToSlotting?: () => void;
  onNavigateToOrders?: () => void;
}

export type StockFilterType = 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK' | 'ON_WAY' | 'PENDING_OUTBOUND' | 'DEFECTIVE';
export type ViewMode = 'GROUPED' | 'TABLE';
export type SortField = 'inUsed' | 'sellable' | 'onWay' | 'outbound' | 'sku' | 'group';
export type SortOrder = 'asc' | 'desc';

export interface SkuDiffInfo {
  diffInUsed: number;
  diffSellable: number;
  diffOnWay: number;
  diffOutbound: number;
}
