import { RawOrderRow, SkuGroupsMap, CarrierCode } from '../../../../types';

export interface YogaClassificationViewProps {
  orders: RawOrderRow[];
  skuGroups: SkuGroupsMap;
  selectedPickingList: string;
  selectedCarrier?: CarrierCode;
  searchTerm: string;
}
