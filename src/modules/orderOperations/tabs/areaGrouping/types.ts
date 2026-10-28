import { RawOrderRow, SkuGroupsMap, CarrierCode } from '../../../../types';

export type ColumnMode = 'sheet4' | 'expanded8';
export type DisplayLayout = 'matrix' | 'cards';

export interface AreaGroupingViewProps {
  orders: RawOrderRow[];
  skuGroups: SkuGroupsMap;
  selectedPickingList: string;
  selectedCarrier?: CarrierCode;
  searchTerm: string;
}
