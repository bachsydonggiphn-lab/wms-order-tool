import { RawOrderRow, SkuGroupsMap } from '../../types';
import { OrderAttachmentInfo, SkuPickingSummaryItem } from '../../services/wmsService';

export interface OrderPdfBatchPrintViewProps {
  orders?: RawOrderRow[];
  skuGroups?: SkuGroupsMap;
}

export interface BatchSearchResultsData {
  orders: OrderAttachmentInfo[];
  skuSummary: SkuPickingSummaryItem[];
  totalInputCodes: number;
  totalFound: number;
  totalWithPdf: number;
  totalPcs: number;
  missingCodes: string[];
  currentPickingList?: string;
}

export interface DistinctPickingListItem {
  pl: string;
  count: number;
  orderNos: string[];
}

export interface SeparatorItem {
  isSeparator: true;
  separatorLabel?: string;
}

export interface TodayPickingListItem {
  pl: string;
  orderCount: number;
  totalQty: number;
  binCount: number;
  createdTime: string;
  updateTime: string;
  pickingStatus: string;
  packStatus: string;
  creator: string;
  carrier: string;
}

export type PrintableOrderItem = OrderAttachmentInfo | SeparatorItem;

