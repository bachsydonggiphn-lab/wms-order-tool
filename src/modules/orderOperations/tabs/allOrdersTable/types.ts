import { RawOrderRow, SkuGroupsMap, CarrierCode } from '../../../../types';

export interface AllOrdersTableViewProps {
  orders: RawOrderRow[];
  skuGroups: SkuGroupsMap;
  selectedPickingList: string;
  selectedCarrier?: CarrierCode;
  onSelectCarrier?: (c: CarrierCode) => void;
  searchTerm: string;
}
