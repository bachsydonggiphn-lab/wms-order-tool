import { useState, useMemo, useEffect } from 'react';
import { RawOrderRow, CarrierCode } from '../../../../../types';
import { layNhomTuSKU, CARRIER_CONFIG } from '../../../../../utils/orderProcessor';
import { DEFAULT_AREA_ORDER } from '../../../../../utils/skuData';
import { PickingListDetailViewProps, PickingListStatItem, ActiveDetailData } from '../types';

export function usePickingListDetailData(props: PickingListDetailViewProps) {
  const {
    orders,
    skuGroups,
    selectedPickingList,
    searchTerm,
    selectedCarrier = 'ALL',
  } = props;

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activePlFilter, setActivePlFilter] = useState<string>(selectedPickingList || '');
  const [showOnlyCarrierLists, setShowOnlyCarrierLists] = useState<boolean>(true);
  const [viewScope, setViewScope] = useState<'CARRIER_ONLY' | 'ALL_ORDERS'>('CARRIER_ONLY');

  const carrierInfo = selectedCarrier !== 'ALL' ? CARRIER_CONFIG[selectedCarrier] : null;

  useEffect(() => {
    if (selectedCarrier !== 'ALL') {
      setViewScope('CARRIER_ONLY');
      setShowOnlyCarrierLists(true);
    } else {
      setViewScope('ALL_ORDERS');
    }
  }, [selectedCarrier]);

  const pickingListStats: PickingListStatItem[] = useMemo(() => {
    const map = new Map<string, PickingListStatItem>();

    orders.forEach((order) => {
      const plKey = order.pickingList && order.pickingList.trim() !== '' ? order.pickingList.trim() : 'Chưa gán PL';
      if (!map.has(plKey)) {
        map.set(plKey, {
          pickingListNo: plKey,
          orders: [],
          carrierOrders: [],
          carrierOrderCount: 0,
          carrierCounts: {},
          skuMap: {},
          carrierSkuMap: {},
          totalPcs: 0,
          carrierTotalPcs: 0,
          singlePcsCount: 0,
          multiPcsCount: 0,
          carrierSinglePcsCount: 0,
          carrierMultiPcsCount: 0,
          areas: new Set<string>(),
          carrierAreas: new Set<string>(),
        });
      }

      const entry = map.get(plKey)!;
      entry.orders.push(order);
      entry.carrierCounts[order.carrier] = (entry.carrierCounts[order.carrier] || 0) + 1;

      const isCarrierMatch =
        !selectedCarrier ||
        selectedCarrier === 'ALL' ||
        (selectedCarrier === 'GHN_ALL'
          ? (order.carrier === 'GHN' || order.carrier === 'GHN_TIKTOK')
          : selectedCarrier === 'SPX_ALL'
          ? (order.carrier === 'SPX' || order.carrier === 'SPX_INSTANT')
          : selectedCarrier.includes(',')
          ? selectedCarrier.split(',').map((s) => s.trim()).some((c) => {
              if (c === 'ALL') return true;
              if (c === 'GHN_ALL') return order.carrier === 'GHN' || order.carrier === 'GHN_TIKTOK';
              if (c === 'SPX_ALL') return order.carrier === 'SPX' || order.carrier === 'SPX_INSTANT';
              return order.carrier === c;
            })
          : order.carrier === selectedCarrier);
      if (isCarrierMatch) {
        entry.carrierOrders.push(order);
        entry.carrierOrderCount += 1;
      }

      let orderPcs = 0;
      order.items.forEach((item) => {
        entry.skuMap[item.sku] = (entry.skuMap[item.sku] || 0) + item.qty;
        entry.totalPcs += item.qty;
        orderPcs += item.qty;

        const area = layNhomTuSKU(item.sku, skuGroups, DEFAULT_AREA_ORDER);
        entry.areas.add(area);

        if (isCarrierMatch) {
          entry.carrierSkuMap[item.sku] = (entry.carrierSkuMap[item.sku] || 0) + item.qty;
          entry.carrierTotalPcs += item.qty;
          entry.carrierAreas.add(area);
        }
      });

      if (orderPcs === 1) {
        entry.singlePcsCount += 1;
        if (isCarrierMatch) entry.carrierSinglePcsCount += 1;
      } else {
        entry.multiPcsCount += 1;
        if (isCarrierMatch) entry.carrierMultiPcsCount += 1;
      }
    });

    const list = Array.from(map.values());
    list.sort((a, b) => {
      if (selectedCarrier !== 'ALL') {
        if (b.carrierOrderCount !== a.carrierOrderCount) {
          return b.carrierOrderCount - a.carrierOrderCount;
        }
      }
      return a.pickingListNo.localeCompare(b.pickingListNo);
    });
    return list;
  }, [orders, skuGroups, selectedCarrier]);

  useEffect(() => {
    setActivePlFilter(selectedPickingList || '');
  }, [selectedPickingList]);

  const listsWithCarrierCount = useMemo(() => {
    return pickingListStats.filter((item) => item.carrierOrderCount > 0).length;
  }, [pickingListStats]);

  const filteredPlList = useMemo(() => {
    let list = pickingListStats;

    if (selectedCarrier !== 'ALL' && showOnlyCarrierLists) {
      list = list.filter((item) => item.carrierOrderCount > 0);
    }

    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter((item) => {
      const matchPl = item.pickingListNo.toLowerCase().includes(term);
      const matchSku = Object.keys(item.skuMap).some((sku) => sku.toLowerCase().includes(term));
      const matchOrder = item.orders.some(
        (o) => o.orderNo.toLowerCase().includes(term) || (o.trackingNo && o.trackingNo.toLowerCase().includes(term))
      );
      return matchPl || matchSku || matchOrder;
    });
  }, [pickingListStats, selectedCarrier, showOnlyCarrierLists, searchTerm]);

  useEffect(() => {
    if (activePlFilter && filteredPlList.length > 0) {
      const exists = filteredPlList.some((it) => it.pickingListNo === activePlFilter);
      if (!exists) {
        setActivePlFilter('');
      }
    }
  }, [filteredPlList, activePlFilter]);

  const currentPl = useMemo(() => {
    if (activePlFilter) {
      return pickingListStats.find((item) => item.pickingListNo === activePlFilter);
    }
    return filteredPlList[0] || pickingListStats[0] || null;
  }, [pickingListStats, filteredPlList, activePlFilter]);

  const activeDetailData: ActiveDetailData | null = useMemo(() => {
    if (!currentPl) return null;

    const isScopeCarrier = selectedCarrier !== 'ALL' && viewScope === 'CARRIER_ONLY';
    const displayedOrders = isScopeCarrier ? currentPl.carrierOrders : currentPl.orders;
    const displayedSkuMap = isScopeCarrier ? currentPl.carrierSkuMap : currentPl.skuMap;
    const displayedTotalPcs = isScopeCarrier ? currentPl.carrierTotalPcs : currentPl.totalPcs;
    const displayedSingleCount = isScopeCarrier ? currentPl.carrierSinglePcsCount : currentPl.singlePcsCount;
    const displayedMultiCount = isScopeCarrier ? currentPl.carrierMultiPcsCount : currentPl.multiPcsCount;

    return {
      isScopeCarrier,
      orders: displayedOrders,
      skuMap: displayedSkuMap,
      totalPcs: displayedTotalPcs,
      singlePcsCount: displayedSingleCount,
      multiPcsCount: displayedMultiCount,
    };
  }, [currentPl, selectedCarrier, viewScope]);

  const handleCopyText = (text: string, key: string, message?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    if (message) {
      setToastMessage(message);
      setTimeout(() => setToastMessage(null), 2500);
    }
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleCopyPlSkuTable = (plNo: string, skuMap: Record<string, number>, label = '') => {
    const rows = [
      `PICKING LIST: ${plNo} ${label ? `(${label})` : ''}`,
      'STT\tMÃ SKU\tSỐ LƯỢNG (PCS)',
      ...Object.entries(skuMap).map(([sku, qty], idx) => `${idx + 1}\t${sku}\t${qty}`),
    ];
    handleCopyText(rows.join('\n'), `table_${plNo}`, `Đã sao chép bảng SKU của ${plNo}`);
  };

  return {
    copiedKey,
    toastMessage,
    activePlFilter,
    setActivePlFilter,
    showOnlyCarrierLists,
    setShowOnlyCarrierLists,
    viewScope,
    setViewScope,
    carrierInfo,
    pickingListStats,
    listsWithCarrierCount,
    filteredPlList,
    currentPl,
    activeDetailData,
    handleCopyText,
    handleCopyPlSkuTable,
  };
}
