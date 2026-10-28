import { SkuGroupsMap } from '../../../../types';
import { CarrierId, TrackingStatusCategory, TrackingEvent } from '../../../../types/tracking';

export interface ShippedTrackingViewProps {
  skuGroups: SkuGroupsMap;
}

export interface TrackingOrderItemView {
  id: string;
  orderNo: string;
  trackingCode: string;
  carrier: CarrierId;
  carrierName: string;
  statusCategory: TrackingStatusCategory;
  rawStatusText: string;
  statusDetail: string;
  scannedAt?: string;
  updatedAt?: string;
  timeline: TrackingEvent[];
  isChecking: boolean;
  error?: string;
  directUrl: string;
  skuText: string;
  quantity: number;
  pickingList: string;
  shippedTime: string;
  ageDays: number;
}

export interface ShippedStats {
  total: number;
  checked: number;
  scanned: number;
  notScanned: number;
  inTransit: number;
  delivered: number;
  returned: number;
  cancelled: number;
  error: number;
  unscanned1Day: number;
  unscanned2Days: number;
  unscanned3PlusDays: number;
  percentComplete: number;
  scannedRate: number;
  unscannedRate: number;
  cancelledRate: number;
  scannedTotal: number;
}

export interface CheckingProgress {
  completed: number;
  total: number;
  speed: number;
  etaSeconds: number;
}
