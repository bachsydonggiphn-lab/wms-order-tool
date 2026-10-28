import {
  RawOrderRow,
  SkuGroupsMap,
  CarrierCode,
  SkuPackingPcsMode,
  SkuPackingSortMode,
  SkuPackingItem,
} from '../../../../types';

export interface SinglePcsViewProps {
  orders: RawOrderRow[];
  skuGroups: SkuGroupsMap;
  selectedPickingList: string;
  selectedCarrier?: CarrierCode;
  searchTerm: string;
}

export type SinglePcsViewMode = 'by_sku' | 'by_area';

export interface AvailablePcsStats {
  qtyCounts: Record<number, number>;
  distinctQtys: number[];
  singleSkuTotalOrders: number;
  mixTotalOrders: number;
}

export interface SelectedSkuStats {
  selectedItems: SkuPackingItem[];
  totalSelectedOrders: number;
  totalSelectedPcs: number;
  allSelectedOrderNos: string[];
  skuCount: number;
}
