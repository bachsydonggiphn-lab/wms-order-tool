import { RawOrderRow, SkuGroupsMap, CarrierCode } from '../../../../types';

export interface PickingListDetailViewProps {
  orders: RawOrderRow[];
  skuGroups: SkuGroupsMap;
  selectedPickingList: string;
  onSelectPickingList: (pl: string) => void;
  searchTerm: string;
  selectedCarrier?: CarrierCode;
  onSelectCarrier?: (carrier: CarrierCode) => void;
  onOpenPrintModal?: (pl?: string) => void;
}

export interface PickingListStatItem {
  pickingListNo: string;
  orders: RawOrderRow[];
  carrierOrders: RawOrderRow[];
  carrierOrderCount: number;
  carrierCounts: Partial<Record<CarrierCode, number>>;
  skuMap: Record<string, number>;
  carrierSkuMap: Record<string, number>;
  totalPcs: number;
  carrierTotalPcs: number;
  singlePcsCount: number;
  multiPcsCount: number;
  carrierSinglePcsCount: number;
  carrierMultiPcsCount: number;
  areas: Set<string>;
  carrierAreas: Set<string>;
}

export interface ActiveDetailData {
  isScopeCarrier: boolean;
  orders: RawOrderRow[];
  skuMap: Record<string, number>;
  totalPcs: number;
  singlePcsCount: number;
  multiPcsCount: number;
}
