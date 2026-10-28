import { useState, useMemo } from 'react';
import { RawOrderRow, SkuGroupsMap, CarrierCode } from '../../../../../types';
import { xuLyPhanLoaiThamYoga } from '../../../../../utils/orderProcessor';

interface UseYogaClassificationDataParams {
  orders: RawOrderRow[];
  skuGroups: SkuGroupsMap;
  selectedPickingList: string;
  selectedCarrier?: CarrierCode;
  searchTerm?: string;
}

export const useYogaClassificationData = ({
  orders,
  skuGroups,
  selectedPickingList,
  selectedCarrier = 'ALL',
}: UseYogaClassificationDataParams) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const result = useMemo(() => {
    return xuLyPhanLoaiThamYoga(orders, skuGroups, selectedPickingList, selectedCarrier);
  }, [orders, skuGroups, selectedPickingList, selectedCarrier]);

  const orderMap = useMemo(() => {
    const map = new Map<string, RawOrderRow>();
    orders.forEach((o) => {
      if (o.orderNo) map.set(o.orderNo, o);
    });
    return map;
  }, [orders]);

  const handleCopyList = (key: string, list: string[]) => {
    if (!list || list.length === 0) return;
    navigator.clipboard.writeText(list.join('\n'));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopySingle = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Tính toán các nhóm Thảm Yoga
  const cacSoLuongYoga = useMemo(() => {
    const keys: string[] = [];
    for (const key in result.donThamYoga) {
      if (result.donThamYoga[key].length > 0) {
        keys.push(key);
      }
    }
    keys.sort((a, b) => {
      const isNumA = !isNaN(Number(a));
      const isNumB = !isNaN(Number(b));
      if (isNumA && isNumB) return Number(a) - Number(b);
      if (isNumA) return -1;
      if (isNumB) return 1;
      if (a === 'MIX_L46') return -1;
      if (b === 'MIX_L46') return 1;
      return a.localeCompare(b);
    });
    return keys;
  }, [result.donThamYoga]);

  // Tính toán các nhóm Đơn Thường
  const cacSoLuongThuong = useMemo(() => {
    return Object.keys(result.donThuong)
      .map(Number)
      .filter((qty) => result.donThuong[qty].length > 0)
      .sort((a, b) => a - b);
  }, [result.donThuong]);

  // Tổng số đơn
  const totalYogaOrders = useMemo(
    () => Object.values(result.donThamYoga).reduce((s: number, a: string[]) => s + a.length, 0),
    [result.donThamYoga]
  );
  const totalNormalOrders = useMemo(
    () => Object.values(result.donThuong).reduce((s: number, a: string[]) => s + a.length, 0),
    [result.donThuong]
  );
  const totalL46Orders = result.donL46.length;
  const totalMix2L46 = result.donMix2PCSL46.length;
  const totalMixKhac = result.donMixKhac.length;

  return {
    copiedKey,
    result,
    orderMap,
    handleCopyList,
    handleCopySingle,
    cacSoLuongYoga,
    cacSoLuongThuong,
    totalYogaOrders,
    totalNormalOrders,
    totalL46Orders,
    totalMix2L46,
    totalMixKhac,
  };
};
