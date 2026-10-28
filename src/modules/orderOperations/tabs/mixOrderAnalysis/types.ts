import { RawOrderRow, SkuGroupsMap, CarrierCode } from '../../../../types';

export interface MixOrderAnalysisViewProps {
  orders: RawOrderRow[];
  skuGroups: SkuGroupsMap;
  selectedPickingList: string;
  selectedCarrier?: CarrierCode;
}

export type ViewMode = 'by_group' | 'by_area' | 'table' | 'cluster' | 'combos';
export type GroupingType = 'model' | 'area';
export type SubGroupTab = 'pure' | 'cross' | 'all';
export type YogaFilter = 'exclude' | 'only' | 'all';
export type PcsFilter = 'all' | '2' | '3' | '4' | '5' | '6' | 'ge6' | 'ge7';
export type SortBy = 'area_orders' | 'orders' | 'qty' | 'sku';
