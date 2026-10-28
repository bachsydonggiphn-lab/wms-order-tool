import { RawOrderRow, CarrierCode, SkuGroupsMap } from '../../../../types';
import { ActiveTabType } from '../../../../components/Toolbar';

export interface SkuAndPcsViewProps {
  orders: RawOrderRow[];
  skuGroups?: SkuGroupsMap;
  selectedPickingList: string;
  selectedCarrier?: CarrierCode;
  searchTerm: string;
  onSearchChange?: (term: string) => void;
  onExportExcel?: () => void;
  onPrintPreview?: () => void;
  onNavigateTab?: (tab: ActiveTabType) => void;
  onOpenPrintModal?: (pickingCode: string, targetOrders?: RawOrderRow[]) => void;
  onOrdersChange?: (newOrders: RawOrderRow[]) => void;
  currentWmsStatus?: string;
}

export interface ColumnSkuItem {
  sku: string;
  orderCount: number;
  totalQty: number;
  orderNos: string[];
  orders: RawOrderRow[];
  percentage: number;
}

export type ColumnViewMode = 'sku' | 'order_no' | 'tracking_no' | 'tracking_prefix' | 'ref_prefix';

export type MinOrderThreshold = 'all' | 'lt5' | '5-9' | '10-19' | '20' | 'ge5' | 'lt9' | 'custom';

export type MobileColumnTab = 'pcs' | 'sku' | 'both';

export interface SelectedSkuEntry {
  sku: string;
  orderCount: number;
  totalQty: number;
  orderNos: string[];
  colKey?: string;
}
