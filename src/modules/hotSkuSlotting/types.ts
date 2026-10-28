import { SkuGroupsMap } from '../../types';

export type HotSkuSubTab = 'map_and_table' | 'group_slotting' | 'relocation_tasks' | 'paired_skus';

export interface HotSkuSlottingModuleProps {
  skuGroups?: SkuGroupsMap;
  onNavigateToInventory?: (sku?: string) => void;
  onNavigateToOrders?: () => void;
}
