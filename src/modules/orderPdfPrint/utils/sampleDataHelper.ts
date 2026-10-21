import { RawOrderRow } from '../../../types';
import { DistinctPickingListItem } from '../types';

export const SAMPLE_TEST_ORDER_CODES = [
  'YD-261020-2623',
  'YD-261021-2970',
  'YD-261021-2969',
  'YD-261021-2965',
  'YD-261021-2959',
  'YD-261021-2951',
  'YD-261021-2947',
  'YD-261021-2940',
  'YD-261021-2936',
  'YD-261021-2931',
  'YD-261021-2928'
];

/**
 * Trích xuất danh sách các mã Picking List độc lập kèm số lượng đơn từ danh sách orders
 */
export function extractDistinctPickingLists(orders: RawOrderRow[]): DistinctPickingListItem[] {
  const map = new Map<string, { pl: string; count: number; orderNos: string[] }>();
  orders.forEach((o) => {
    const pl = (o.pickingList || '').trim();
    if (pl) {
      if (!map.has(pl)) {
        map.set(pl, { pl, count: 0, orderNos: [] });
      }
      const item = map.get(pl)!;
      item.count++;
      const code = o.orderNo || o.trackingNo;
      if (code) item.orderNos.push(code);
    }
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count || a.pl.localeCompare(b.pl));
}
