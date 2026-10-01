import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import zlib from "zlib";
import { createServer as createViteServer } from "vite";
import { getAllSqliteOrders, getOrderTimeline, upsertSqliteOrders, clearSqliteOrders, getSqliteStats, getSqliteDb, initSqliteDb } from "./sqliteDb";
import { matchesTrackingPrefixFilter } from "./src/services/carrierDetector";

interface GHNTrackingLog {
  order_code: string;
  action_code?: string;
  status: string;
  status_name: string;
  location?: {
    address?: string;
  };
  executor?: {
    name?: string;
    phone?: string;
  };
  action_at: string;
}

interface GHNResponse {
  code: number;
  code_message?: string;
  message: string;
  data?: {
    order_info?: {
      order_code: string;
      status: string;
      status_name: string;
      picktime?: string;
      to_name?: string;
      to_phone?: string;
      to_address?: string;
      from_name?: string;
      from_phone?: string;
      from_address?: string;
      leadtime?: string;
      leadtime_order?: {
        from_estimate_date?: string;
        to_estimate_date?: string;
      };
      action?: string;
    };
    tracking_logs?: GHNTrackingLog[];
  };
}

function mapGHNStatus(ghnStatus: string, rawStatusName: string) {
  const s = (ghnStatus || '').toLowerCase().trim();
  const name = (rawStatusName || '').toLowerCase().trim();

  // 1. Returned / Hoàn hàng
  if (
    s === 'returned' ||
    s === 'return' ||
    s === 'waiting_to_return' ||
    s === 'returning' ||
    s === 'return_transporting' ||
    s === 'return_sorting' ||
    s === 'return_storing' ||
    s === 'return_fail' ||
    name.includes('hoàn hàng') ||
    name.includes('chuyển hoàn') ||
    name.includes('trả hàng') ||
    name.includes('đang hoàn') ||
    name.includes('hoàn trả')
  ) {
    return {
      category: 'returned',
      label: rawStatusName || 'Hoàn hàng / Chuyển hoàn',
      isScanned: true
    };
  }

  // 2. Delivered / Giao thành công
  if (
    s === 'delivered' || 
    name.includes('giao hàng thành công') || 
    name.includes('giao thành công') || 
    name.includes('đã giao') ||
    name.includes('phát thành công') ||
    name.includes('ký nhận')
  ) {
    return {
      category: 'delivered',
      label: rawStatusName || 'Giao hàng thành công',
      isScanned: true
    };
  }

  // 3. Cancelled / Đã hủy
  if (
    s === 'cancel' || 
    s === 'cancelled' || 
    name.includes('hủy') || 
    name.includes('huỷ') ||
    name.includes('từ chối nhận lúc lấy') ||
    name.includes('shop huỷ')
  ) {
    return {
      category: 'cancelled',
      label: rawStatusName || 'Đơn hàng đã hủy',
      isScanned: false
    };
  }

  // 4. Ready to pick / Delayed pickup / Pickup failed (Chưa lấy hàng)
  if (
    s === 'ready_to_pick' || 
    s === 'picking' ||
    s === 'pickup_fail' ||
    name.includes('chờ lấy hàng') || 
    name.includes('chưa lấy') ||
    name.includes('đang đến lấy') ||
    name.includes('chờ ghn lấy') ||
    name.includes('lấy không thành công') ||
    name.includes('không lấy được') ||
    name.includes('hẹn lấy lại') ||
    name.includes('chưa có hàng') ||
    name.includes('chưa chuẩn bị hàng')
  ) {
    return {
      category: 'not_scanned',
      label: rawStatusName || 'Chờ lấy hàng (Chưa scan)',
      isScanned: false
    };
  }

  // 5. Picking / Picked (Đã tiếp nhận bưu kiện)
  if (
    s === 'picked' || 
    s === 'storing' ||
    name.includes('lấy hàng thành công') || 
    name.includes('đã nhận hàng') ||
    name.includes('đã lấy hàng') ||
    name.includes('tiếp nhận')
  ) {
    return {
      category: 'scanned',
      label: rawStatusName || 'Đã lấy hàng & nhập bưu cục',
      isScanned: true
    };
  }

  // 6. In transit / Delivering
  if (
    s === 'transporting' ||
    s === 'sorting' ||
    s === 'delivering' ||
    s === 'money_collect_delivering' ||
    name.includes('trung chuyển') ||
    name.includes('đang giao') ||
    name.includes('đang phát') ||
    name.includes('nhập kho') ||
    name.includes('xuất kho') ||
    name.includes('sẵn sàng giao') ||
    name.includes('phân loại') ||
    name.includes('luân chuyển')
  ) {
    return {
      category: 'in_transit',
      label: rawStatusName || 'Đang vận chuyển',
      isScanned: true
    };
  }

  // 7. Error / Delivery fail / Exception / Damage / Lost
  if (
    s === 'delivery_fail' || 
    s === 'damage' || 
    s === 'lost' || 
    s === 'exception' ||
    name.includes('thất lạc') || 
    name.includes('hư hỏng') || 
    name.includes('sự cố')
  ) {
    return {
      category: 'error',
      label: rawStatusName || 'Sự cố vận chuyển',
      isScanned: true
    };
  }

  return {
    category: 'not_scanned',
    label: rawStatusName || 'Chờ lấy hàng (Chưa scan)',
    isScanned: false
  };
}

function mapJNTStatus(topText: string, hasPickupScan: boolean = false) {
  const t = (topText || '').toLowerCase();

  // 1. Returned
  if (t.includes('chuyển hoàn') || t.includes('trả hàng') || t.includes('hoàn hàng') || t.includes('đang hoàn')) {
    return {
      category: 'returned',
      label: topText || 'Chuyển hoàn J&T',
      isScanned: true
    };
  }

  // 2. Delivered
  if (t.includes('đã ký nhận') || t.includes('ký nhận') || t.includes('giao hàng thành công') || t.includes('giao thành công')) {
    return {
      category: 'delivered',
      label: topText || 'Giao hàng thành công (Đã ký nhận)',
      isScanned: true
    };
  }

  // 3. Cancelled
  if (t.includes('hủy') || t.includes('huỷ')) {
    return {
      category: 'cancelled',
      label: topText || 'Đã hủy phiếu gửi J&T',
      isScanned: false
    };
  }

  // 4. Lấy hàng không thành công / Hoãn lấy / Hẹn lại ngày lấy (Chưa ra khỏi kho)
  if (
    t.includes('lấy hàng không thành công') ||
    t.includes('lấy không thành công') ||
    t.includes('không lấy được') ||
    t.includes('chưa lấy được') ||
    t.includes('hẹn lại ngày lấy') ||
    t.includes('hẹn lấy lại') ||
    t.includes('người gửi hẹn') ||
    t.includes('chưa chuẩn bị hàng') ||
    t.includes('chưa có hàng') ||
    (t.includes('f001') && !hasPickupScan)
  ) {
    return {
      category: 'not_scanned',
      label: topText || 'Chờ J&T lấy hàng (Lấy không thành công / Hẹn lại ngày lấy)',
      isScanned: false
    };
  }

  // 4b. Kiện vấn đề / Kiện khó / Sự cố giao hàng
  if (t.includes('kiện vấn đề') || t.includes('kiện khó') || t.includes('vấn đề')) {
    const hasStationLocation = t.includes('bưu cục') || t.includes('ttkt') || t.includes('đgp') || t.includes('trung chuyển') || t.includes('phú lợi');
    if (hasPickupScan || hasStationLocation) {
      return {
        category: 'scanned',
        label: topText || 'Đã tiếp nhận tại bưu cục J&T (Đang xử lý kiện hàng)',
        isScanned: true
      };
    } else {
      return {
        category: 'not_scanned',
        label: topText || 'Chờ J&T lấy hàng (Kiện vấn đề lấy hàng / Kiện khó)',
        isScanned: false
      };
    }
  }

  // 5. Not scanned / Chờ lấy hàng
  if (t.includes('chờ lấy') || t.includes('chưa lấy') || t.includes('tạo đơn') || t.includes('tạo phiếu gửi') || t.includes('chờ nhận') || t.includes('chưa scan')) {
    return {
      category: 'not_scanned',
      label: topText || 'Chờ J&T lấy hàng (Chưa scan)',
      isScanned: false
    };
  }

  // 6. In transit
  if (t.includes('đang giao hàng') || t.includes('đang phát') || t.includes('sẵn sàng giao') || t.includes('đang giao') || t.includes('sẽ sớm được giao')) {
    return {
      category: 'in_transit',
      label: topText || 'Đang giao hàng',
      isScanned: true
    };
  }

  if (
    t.includes('đang chuyển hàng đến') || 
    t.includes('đã được chuyển đến') || 
    t.includes('ttkt') || 
    t.includes('kho trung chuyển') || 
    t.includes('đgp') ||
    t.includes('rời bưu cục') ||
    t.includes('xuất bưu cục') ||
    t.includes('nhập trung tâm') ||
    t.includes('xuất trung tâm') ||
    t.includes('lên xe') ||
    t.includes('đang vận chuyển') ||
    t.includes('đang luân chuyển') ||
    t.includes('đang chuyển kiện') ||
    t.includes('phân loại')
  ) {
    return {
      category: 'in_transit',
      label: topText || 'Đang trung chuyển',
      isScanned: true
    };
  }

  // 7. Scanned / Đã nhận hàng & nhập bưu cục
  if (
    t.includes('đã nhận hàng') || 
    (t.includes('nhân viên') && t.includes('đã nhận')) ||
    t.includes('nhận kiện hàng') || 
    t.includes('nhập bưu cục') || 
    t.includes('lấy hàng thành công') ||
    t.includes('đã lấy hàng') ||
    t.includes('tiếp nhận') ||
    t.includes('quét mã tiếp nhận')
  ) {
    return {
      category: 'scanned',
      label: topText || 'Đã lấy hàng & nhập bưu cục J&T',
      isScanned: true
    };
  }

  // 8. Error
  if (t.includes('không thành công') || t.includes('thất bại') || t.includes('sự cố')) {
    return {
      category: hasPickupScan ? 'error' : 'not_scanned',
      label: topText || 'Sự cố vận chuyển J&T',
      isScanned: hasPickupScan
    };
  }

  return {
    category: hasPickupScan ? 'scanned' : 'not_scanned',
    label: topText || (hasPickupScan ? 'Đang xử lý trên hệ thống J&T' : 'Chưa scan lấy hàng'),
    isScanned: hasPickupScan
  };
}

// Server-side smart memory cache
const liveCache = new Map<string, { data: any; expiresAt: number }>();

/**
 * Smart logistics cache TTL strategy:
 * - Completed/Terminal statuses (delivered, cancelled, returned): cache 4 hours
 * - In-transit / Delivering: cache 15 minutes
 * - Scanned / Picked up: cache 5 minutes
 * - Not scanned / Pickup pending / Issue: ONLY CACHE 30 SECONDS
 *   (Crucial: couriers can pick up parcels at any second during shift,
 *    must reflect live pickup immediately on subsequent scans!)
 */
function getSmartTTL(statusCategory?: string): number {
  switch (statusCategory) {
    case 'delivered':
    case 'cancelled':
    case 'returned':
      return 4 * 60 * 60 * 1000; // 4 hours
    case 'in_transit':
      return 15 * 60 * 1000;      // 15 minutes
    case 'scanned':
      return 5 * 60 * 1000;       // 5 minutes
    case 'not_scanned':
    case 'error':
    default:
      return 30 * 1000;           // 30 SECONDS ONLY
  }
}

function getFromCache(key: string, force: boolean = false) {
  if (force) {
    liveCache.delete(key);
    return null;
  }
  const item = liveCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    liveCache.delete(key);
    return null;
  }
  // Sanity check: if cached item was falsely marked as 'scanned' but has problem issue without scan time
  if (item.data) {
    const raw = (item.data.rawStatusText || '').toLowerCase();
    if ((raw.includes('kiện vấn đề') || raw.includes('kiện khó')) && !item.data.scannedAt && item.data.statusCategory === 'scanned') {
      item.data.statusCategory = 'not_scanned';
    }
  }
  return item.data;
}

function setInCache(key: string, data: any, ttlMs?: number) {
  const actualTtl = ttlMs !== undefined ? ttlMs : getSmartTTL(data?.statusCategory);
  liveCache.set(key, { data, expiresAt: Date.now() + actualTtl });
}

// Optimized non-blocking throttles with adaptive backoff
let ghnLastReqTime = 0;
let jtLastReqTime = 0;

async function throttleGHN() {
  const now = Date.now();
  const minInterval = 20; // 50 reqs/sec capacity
  const elapsed = now - ghnLastReqTime;
  if (elapsed < minInterval) {
    await new Promise(r => setTimeout(r, minInterval - elapsed));
  }
  ghnLastReqTime = Date.now();
}

let jtQueue: Promise<any> = Promise.resolve();
async function executeJTThrottled<T>(fn: () => Promise<T>): Promise<T> {
  const next = jtQueue.then(async () => {
    const minInterval = 120; // Controlled spacing for J&T anti-bot
    await new Promise(resolve => setTimeout(resolve, minInterval));
    return fn();
  });
  jtQueue = next.catch(() => {});
  return next;
}


function formatDate(input?: string | number | Date, includeSeconds: boolean = true): string {
  if (!input) return '';
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return '';
    // If string is already formatted as DD/MM/YYYY with time, return as-is
    if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
      return trimmed;
    }
  }

  try {
    let d: Date;
    if (typeof input === 'number') {
      d = new Date(input < 10000000000 ? input * 1000 : input);
    } else if (input instanceof Date) {
      d = input;
    } else {
      const trimmed = String(input).trim();
      if (!trimmed) return '';
      if (/^\d+$/.test(trimmed)) {
        const num = Number(trimmed);
        d = new Date(num < 10000000000 ? num * 1000 : num);
      } else {
        d = new Date(trimmed);
      }
    }

    if (isNaN(d.getTime())) return String(input);

    // Format strictly in Asia/Ho_Chi_Minh timezone (Vietnam GMT+7)
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(d);
    const map: Record<string, string> = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }

    const { hour = '00', minute = '00', second = '00', day = '01', month = '01', year = '2026' } = map;
    return includeSeconds
      ? `${hour}:${minute}:${second} ${day}/${month}/${year}`
      : `${hour}:${minute} ${day}/${month}/${year}`;
  } catch {
    return String(input);
  }
}

// J&T Express HTML Multi-Parser (supports 1 to 10 bill codes in single response)
function parseJNTMultiHtml(html: string, expectedCodes: string[]): Record<string, { items: { time: string; text: string }[] }> {
  const results: Record<string, { items: { time: string; text: string }[] }> = {};

  for (const code of expectedCodes) {
    const cleanCode = code.trim().toUpperCase();
    results[cleanCode] = { items: [] };

    // Locate section for this specific billcode:
    // J&T renders: <input ... id="chck-${cleanCode}" ...> <div class="tab-content">...</div>
    let sectionHtml = '';
    const chckIndex = html.indexOf('chck-' + cleanCode);
    if (chckIndex !== -1) {
      const tabContentStart = html.indexOf('class="tab-content"', chckIndex);
      if (tabContentStart !== -1) {
        const nextChck = html.indexOf('type="checkbox" id="chck-', tabContentStart);
        if (nextChck !== -1) {
          sectionHtml = html.substring(tabContentStart, nextChck);
        } else {
          sectionHtml = html.substring(tabContentStart, tabContentStart + 25000);
        }
      }
    }

    if (!sectionHtml) {
      const codeIndex = html.indexOf(cleanCode);
      if (codeIndex !== -1) {
        sectionHtml = html.substring(codeIndex, codeIndex + 25000);
      }
    }

    // If single code was queried and no accordion was rendered
    if (!sectionHtml && expectedCodes.length === 1) {
      sectionHtml = html;
    }

    if (!sectionHtml) continue;

    const blocks = sectionHtml.split(/class=[\"']result-vandon-item/i);
    const items: { time: string; text: string }[] = [];
    if (blocks.length > 1) {
      for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        const timeMatch = block.match(/(\d{2}:\d{2}(?::\d{2})?)/);
        const dateMatch = block.match(/(\d{4}-\d{2}-\d{2})/) || block.match(/(\d{2}\/\d{2}\/\d{4})/);
        
        let rawText = "";
        const calendarIndex = block.indexOf("calendar-clear-outline");
        if (calendarIndex !== -1) {
          const afterCalendar = block.substring(calendarIndex);
          const divMatch = afterCalendar.match(/<div>([\s\S]*?)<\/div>/);
          if (divMatch) {
            rawText = divMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
          }
        }

        if (!rawText) {
          const match = block.match(/<div>\s*([\s\S]*?(?:【|đã|nhận|giao|bưu cục|kiện)[\s\S]*?)<\/div>/i);
          if (match) {
            rawText = match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
          }
        }

        if (rawText && (timeMatch || dateMatch)) {
          let formattedDate = "";
          if (dateMatch) {
            if (dateMatch[1].includes('-')) {
              const dateParts = dateMatch[1].split('-');
              formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : dateMatch[1];
            } else {
              formattedDate = dateMatch[1];
            }
          }
          const timeStr = timeMatch ? timeMatch[1] : '';
          const finalTime = timeStr && formattedDate ? `${timeStr} ${formattedDate}` : (timeStr || formattedDate || 'Gần đây');
          
          items.push({
            time: finalTime,
            text: rawText
          });
        }
      }
    }
    results[cleanCode] = { items };
  }

  return results;
}

// J&T Express Live Multi-Tracking (handles batches up to 10 codes in a single request)
async function fetchJNTBatchLive(
  billCodes: string[], 
  cellphone?: string,
  force: boolean = false
): Promise<Record<string, { success: boolean; data?: any; error?: string; carrier?: string }>> {
  const cleanCodes = Array.from(new Set(billCodes.map(c => (c || '').trim().toUpperCase()).filter(Boolean)));
  if (cleanCodes.length === 0) return {};

  const cleanPhone = cellphone ? cellphone.replace(/\D/g, '').slice(-4) : '';
  const results: Record<string, { success: boolean; data?: any; error?: string; carrier?: string }> = {};
  const uncachedCodes: string[] = [];

  // Check cache first (bypass if force is true)
  for (const code of cleanCodes) {
    let cachedData = null;
    if (!force) {
      const candidateKeys = [
        cleanPhone ? `jnt:${code}:${cleanPhone}` : '',
        `jnt:${code}:8836`,
        `jnt:${code}:8036`,
        `jnt:${code}:default`
      ].filter(Boolean);

      for (const key of candidateKeys) {
        const cached = getFromCache(key);
        if (cached) {
          cachedData = cached;
          break;
        }
      }
    }

    if (cachedData) {
      results[code] = { success: true, data: cachedData };
    } else {
      uncachedCodes.push(code);
    }
  }

  if (uncachedCodes.length === 0) {
    return results;
  }

  // Priority phone suffixes to test: custom phone -> 8836 -> 8036
  const phonesToTry: string[] = [];
  if (cleanPhone) phonesToTry.push(cleanPhone);
  if (!phonesToTry.includes('8836')) phonesToTry.push('8836');
  if (!phonesToTry.includes('8036')) phonesToTry.push('8036');

  // J&T Express limit: optimal batch size 5 for maximum reliability & anti-dropping
  const BATCH_SIZE = 5;
  for (let i = 0; i < uncachedCodes.length; i += BATCH_SIZE) {
    const batch = uncachedCodes.slice(i, i + BATCH_SIZE);
    let remainingInBatch = [...batch];

    for (const phone of phonesToTry) {
      if (remainingInBatch.length === 0) break;

      const targetUrl = `https://jtexpress.vn/vi/tracking?type=track&billcode=${encodeURIComponent(remainingInBatch.join(','))}${phone ? `&cellphone=${encodeURIComponent(phone)}` : ''}`;

      let html = '';
      try {
        html = await executeJTThrottled(async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 7000);
          try {
            const response = await fetch(targetUrl, {
              signal: controller.signal,
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
                "Referer": "https://jtexpress.vn/vi/tracking"
              }
            });
            clearTimeout(timeoutId);
            if (response.ok) {
              return await response.text();
            } else if (response.status === 429) {
              // Exponential backoff for J&T 429 rate limit
              await new Promise(r => setTimeout(r, 1200));
              const retryRes = await fetch(targetUrl, {
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                  "Referer": "https://jtexpress.vn/vi/tracking"
                }
              });
              if (retryRes.ok) return await retryRes.text();
            }
          } catch {
            clearTimeout(timeoutId);
          }
          return '';
        });
      } catch {
        html = '';
      }

      if (html) {
        const parsedBatch = parseJNTMultiHtml(html, remainingInBatch);
        const resolvedCodes: string[] = [];

        for (const code of remainingInBatch) {
          const parsed = parsedBatch[code];
          if (parsed && parsed.items.length > 0) {
            const topItem = parsed.items[0];

            // Find actual pickup scan event (recognizing bưu cục / station scans)
            const pickupItem = parsed.items.slice().reverse().find(item => {
              const txt = item.text.toLowerCase();
              const hasStation = txt.includes('bưu cục') || txt.includes('【') || txt.includes('ttkt') || txt.includes('đgp') || txt.includes('phú lợi');
              if (hasStation && (txt.includes('đã đăng ký') || txt.includes('kiện khó') || txt.includes('kiện vấn đề') || txt.includes('nhận') || txt.includes('đến'))) {
                return true;
              }
              const isPrePickup = (txt.includes('tạo đơn') || txt.includes('khởi tạo') || txt.includes('chuẩn bị') || txt.includes('chờ lấy')) && !hasStation;
              if (isPrePickup) return false;

              return txt.includes('đã nhận hàng') || 
                     (txt.includes('nhân viên') && txt.includes('đã nhận')) ||
                     txt.includes('nhận kiện hàng') || 
                     txt.includes('nhập bưu cục') || 
                     txt.includes('lấy hàng thành công') || 
                     txt.includes('đã lấy hàng') || 
                     txt.includes('tiếp nhận') || 
                     txt.includes('quét mã tiếp nhận') || 
                     txt.includes('picked up');
            });

            const validTransitItem = parsed.items.slice().reverse().find(item => {
              const txt = item.text.toLowerCase();
              const hasStation = txt.includes('bưu cục') || txt.includes('【') || txt.includes('ttkt') || txt.includes('đgp') || txt.includes('phú lợi');
              if (hasStation) return true;
              const isExcluded = txt.includes('kiện vấn đề') || 
                                 txt.includes('kiện khó') || 
                                 txt.includes('vấn đề') || 
                                 txt.includes('tạo đơn') || 
                                 txt.includes('được tạo') || 
                                 txt.includes('chờ lấy') ||
                                 txt.includes('chuẩn bị');
              return !isExcluded;
            });

            const hasPickup = Boolean(pickupItem || validTransitItem);
            const scannedTime = pickupItem ? pickupItem.time : (validTransitItem ? validTransitItem.time : undefined);
            const mapped = mapJNTStatus(topItem.text, hasPickup);

            const timeline = parsed.items.map(item => {
              const locMatch = item.text.match(/bưu cục\s*【(.*?)】/i) || 
                               item.text.match(/đến\s*【(.*?)】/i) || 
                               item.text.match(/【((?:TTKT|ĐGP|\([A-Z0-9_-]+\)).*?)】/i) || 
                               item.text.match(/【(.*?)】/);
              const extractedLoc = locMatch ? locMatch[1].trim() : '';
              return {
                time: item.time,
                statusText: item.text,
                location: extractedLoc || 'Mạng lưới J&T Express',
                description: ''
              };
            });

            const resultData = {
              carrier: 'jt',
              statusCategory: mapped.category,
              rawStatusText: topItem.text,
              statusDetail: topItem.text,
              updatedAt: topItem.time,
              scannedAt: scannedTime,
              recipientLocation: timeline[0]?.location !== 'Mạng lưới J&T Express' ? timeline[0]?.location : undefined,
              timeline
            };

            if (phone) setInCache(`jnt:${code}:${phone}`, resultData);
            setInCache(`jnt:${code}:default`, resultData);

            results[code] = { success: true, data: resultData };
            resolvedCodes.push(code);
          }
        }

        remainingInBatch = remainingInBatch.filter(c => !resolvedCodes.includes(c));
      }
    }

    // Any remaining codes in this batch had no new data on J&T portal => Check DB first before falling back to not_scanned
    for (const code of remainingInBatch) {
      let existingTimeline: any[] | null = null;
      try {
        existingTimeline = await getOrderTimeline(code);
      } catch {}

      if (existingTimeline && existingTimeline.length > 0) {
        const pickupItem = existingTimeline.slice().reverse().find(item => {
          const txt = (item.statusText || '').toLowerCase();
          const hasStation = txt.includes('bưu cục') || txt.includes('【') || txt.includes('ttkt') || txt.includes('đgp') || txt.includes('phú lợi');
          if (hasStation && (txt.includes('đã đăng ký') || txt.includes('kiện khó') || txt.includes('kiện vấn đề') || txt.includes('nhận') || txt.includes('đến'))) {
            return true;
          }
          const isPrePickup = (txt.includes('tạo đơn') || txt.includes('khởi tạo') || txt.includes('chuẩn bị') || txt.includes('chờ lấy')) && !hasStation;
          if (isPrePickup) return false;
          return txt.includes('đã nhận hàng') || 
                 (txt.includes('nhân viên') && txt.includes('đã nhận')) ||
                 txt.includes('nhận kiện hàng') || 
                 txt.includes('nhập bưu cục') || 
                 txt.includes('lấy hàng thành công') || 
                 txt.includes('đã lấy hàng') || 
                 txt.includes('tiếp nhận') || 
                 txt.includes('quét mã tiếp nhận') ||
                 txt.includes('picked up');
        });

        const topItem = existingTimeline[0];
        const hasPickup = Boolean(pickupItem);
        const mapped = mapJNTStatus(topItem?.statusText || '', hasPickup);

        if (hasPickup || mapped.category !== 'not_scanned') {
          const preservedData = {
            carrier: 'jt',
            statusCategory: mapped.category,
            rawStatusText: topItem?.statusText || 'Đang vận chuyển (J&T)',
            statusDetail: topItem?.statusText || '',
            updatedAt: topItem?.time,
            scannedAt: pickupItem ? pickupItem.time : undefined,
            timeline: existingTimeline
          };
          results[code] = { success: true, data: preservedData };
          continue;
        }
      }

      const isCargo = code.startsWith('530') || code.startsWith('53');
      results[code] = {
        success: true,
        carrier: 'jt',
        data: {
          carrier: 'jt',
          statusCategory: 'not_scanned',
          rawStatusText: 'Chờ J&T lấy hàng (Chưa scan)',
          statusDetail: isCargo 
            ? "Chưa có dữ liệu hành trình trên J&T Cargo (Đơn hàng vừa xuất kho WMS, chờ bưu cục quét nhận)"
            : "Chưa có dữ liệu trên cổng J&T Express (Mã đã xuất kho WMS, chờ bưu tá quét nhận)",
          timeline: []
        }
      };
    }
  }

  return results;
}

// Single J&T Express Live Tracking (delegates to batch runner)
async function fetchJNTLive(billCode: string, cellphone?: string): Promise<{ success: boolean; data?: any; error?: string; carrier?: string }> {
  const cleanBillCode = billCode.trim().toUpperCase();
  const batchRes = await fetchJNTBatchLive([cleanBillCode], cellphone);
  if (batchRes[cleanBillCode]) {
    return batchRes[cleanBillCode];
  }

  try {
    const existingTimeline = await getOrderTimeline(cleanBillCode);
    if (existingTimeline && existingTimeline.length > 0) {
      const pickupItem = existingTimeline.slice().reverse().find(item => {
        const txt = (item.statusText || '').toLowerCase();
        return txt.includes('đã nhận hàng') || (txt.includes('nhân viên') && txt.includes('đã nhận')) || txt.includes('tiếp nhận');
      });
      const topItem = existingTimeline[0];
      const hasPickup = Boolean(pickupItem);
      const mapped = mapJNTStatus(topItem?.statusText || '', hasPickup);
      return {
        success: true,
        carrier: 'jt',
        data: {
          carrier: 'jt',
          statusCategory: mapped.category,
          rawStatusText: topItem?.statusText || 'Đang vận chuyển (J&T)',
          statusDetail: topItem?.statusText || '',
          updatedAt: topItem?.time,
          scannedAt: pickupItem ? pickupItem.time : undefined,
          timeline: existingTimeline
        }
      };
    }
  } catch {}

  return {
    success: true,
    carrier: 'jt',
    data: {
      carrier: 'jt',
      statusCategory: 'not_scanned',
      rawStatusText: 'Chờ J&T lấy hàng (Chưa scan)',
      statusDetail: 'Mã vận đơn chưa phát sinh dữ liệu quét tiếp nhận trên cổng J&T Express (Chờ bưu tá lấy hàng)',
      timeline: []
    }
  };
}

// ----------------------------------------------------------------
// J&T Cargo Live Tracking (office.jtcargo.com.vn API)
// For bill codes starting with "530" or identified as jt_cargo
// ----------------------------------------------------------------
function mapJNTCargoStatus(statusCode: number, statusText: string): { category: string; label: string; isScanned: boolean } {
  const s = (statusText || '').toLowerCase().trim();
  const code = statusCode;

  // Delivered (code 60 = Giao hàng thành công)
  if (code === 60 || s.includes('giao hàng thành công') || s.includes('giao thành công') || s.includes('đã giao') || s.includes('ký nhận')) {
    return { category: 'delivered', label: statusText || 'Giao hàng thành công', isScanned: true };
  }

  // Returned (code 70 = Chuyển hoàn)
  if (code === 70 || s.includes('chuyển hoàn') || s.includes('hoàn hàng') || s.includes('trả hàng') || s.includes('đang hoàn')) {
    return { category: 'returned', label: statusText || 'Chuyển hoàn J&T Cargo', isScanned: true };
  }

  // Cancelled
  if (s.includes('hủy') || s.includes('huỷ') || s.includes('cancel')) {
    return { category: 'cancelled', label: statusText || 'Đơn hàng đã hủy', isScanned: false };
  }

  // Picked up (code 10 = Đã nhận hàng / lấy hàng)
  if (code === 10 || code === 201 || s.includes('đã nhận hàng') || s.includes('lấy hàng') || s.includes('tiếp nhận')) {
    return { category: 'scanned', label: statusText || 'J&T Cargo đã lấy hàng', isScanned: true };
  }

  // In transit (code 50 = Đang vận chuyển, 90 = Đến trung tâm)
  if (
    code === 50 || code === 90 || code === 203 ||
    s.includes('đang vận chuyển') || s.includes('vận chuyển') ||
    s.includes('đến trung tâm') || s.includes('hub') ||
    s.includes('rời khỏi') || s.includes('đã đến') ||
    s.includes('đang giao') || s.includes('sắp giao')
  ) {
    return { category: 'in_transit', label: statusText || 'Đang vận chuyển (J&T Cargo)', isScanned: true };
  }

  // Error / Exception
  if (s.includes('thất lạc') || s.includes('hư hỏng') || s.includes('sự cố') || s.includes('bất thường')) {
    return { category: 'error', label: statusText || 'Sự cố vận chuyển J&T Cargo', isScanned: true };
  }

  // Default: treat as scanned if code > 0
  return {
    category: code > 0 ? 'scanned' : 'not_scanned',
    label: statusText || (code > 0 ? 'Đang xử lý (J&T Cargo)' : 'Chưa có dữ liệu J&T Cargo'),
    isScanned: code > 0
  };
}

async function fetchJNTCargoLive(billCode: string, force: boolean = false): Promise<{ success: boolean; data?: any; error?: string; carrier?: string }> {
  const cleanCode = billCode.trim().toUpperCase();
  const cacheKey = `jnt_cargo:${cleanCode}`;

  if (!force) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }
  }

  const CARGO_BASE_URL = 'https://office.jtcargo.com.vn';
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Referer': 'https://www.jtcargo.vn/',
    'Origin': 'https://www.jtcargo.vn',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    'Content-Type': 'application/json;charset=UTF-8',
    'language': 'VN',
    'authToken': '',
    'Cache-Control': 'max-age=2, must-revalidate'
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(`${CARGO_BASE_URL}/official/waybill/trackingCustomerByWaybillNo`, {
        method: 'POST',
        signal: controller.signal,
        headers,
        body: JSON.stringify({ waybillNo: cleanCode })
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (attempt < 1) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        return { success: false, error: `J&T Cargo API HTTP ${response.status}` };
      }

      const json = await response.json() as any;

      // API returns { code: 1, succ: true, data: [...] }
      if (!json.succ || !Array.isArray(json.data) || json.data.length === 0) {
        return {
          success: true,
          data: {
            carrier: 'jt_cargo',
            statusCategory: 'not_scanned',
            rawStatusText: 'Chưa có dữ liệu J&T Cargo',
            statusDetail: 'Mã vận đơn chưa được ghi nhận trên hệ thống J&T Cargo (Chờ bưu cục quét nhận)',
            timeline: []
          }
        };
      }

      const waybillData = json.data[0];
      const details: any[] = waybillData.details || [];

      // Build timeline (details[0] = most recent)
      const timeline = details.map((d: any) => {
        const locParts = [d.scanNetworkCity, d.scanNetworkName].filter(Boolean);
        const location = locParts.length > 0 ? locParts.join(' - ') : 'Mạng lưới J&T Cargo';
        return {
          time: formatDate(d.scanTime),
          statusText: d.customerTracking || d.status || '',
          location,
          description: d.scanByName ? `Nhân viên: ${d.scanByName}` : ''
        };
      });

      // Latest status = details[0]
      const latestDetail = details[0];
      const latestStatusCode = latestDetail?.code || latestDetail?.change || 0;
      const latestStatusText = latestDetail?.status || '';
      const latestCustomerTracking = latestDetail?.customerTracking || latestStatusText;

      const mapped = mapJNTCargoStatus(latestStatusCode, latestStatusText);

      // Find pickup event (status "Đã nhận hàng" / code 10 / 201)
      const pickupEvent = details.slice().reverse().find((d: any) =>
        d.code === 10 || d.code === 201 || (d.status || '').includes('Đã nhận hàng') || (d.status || '').includes('lấy hàng')
      );
      const scannedAt = pickupEvent ? formatDate(pickupEvent.scanTime) : (mapped.isScanned ? formatDate(latestDetail?.scanTime) : undefined);

      // Receiver city info
      const recipientInfo = waybillData.receiverCityName
        ? `Đến: ${waybillData.receiverCityName}${waybillData.receiverProvinceName ? ` (${waybillData.receiverProvinceName})` : ''}`
        : undefined;

      // Extra info
      const extraInfo: string[] = [];
      if (waybillData.expressTypeName) extraInfo.push(`Dịch vụ: ${waybillData.expressTypeName}`);
      if (waybillData.packageTotalWeight) extraInfo.push(`Trọng lượng: ${waybillData.packageTotalWeight} kg`);
      if (waybillData.packageNumber) extraInfo.push(`Số kiện: ${waybillData.packageNumber}`);

      const statusDetail = latestCustomerTracking || mapped.label;

      const resultData = {
        carrier: 'jt_cargo',
        statusCategory: mapped.category,
        rawStatusText: latestStatusText || mapped.label,
        statusDetail,
        updatedAt: latestDetail ? formatDate(latestDetail.scanTime) : undefined,
        scannedAt,
        recipientLocation: recipientInfo,
        extraInfo: extraInfo.join(' | ') || undefined,
        timeline
      };

      setInCache(cacheKey, resultData);
      return { success: true, data: resultData };

    } catch (err: any) {
      if (attempt === 1) {
        return { success: false, error: err.message ? `Lỗi kết nối J&T Cargo: ${err.message}` : 'Lỗi kết nối cổng J&T Cargo' };
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return { success: false, error: 'Hệ thống J&T Cargo không phản hồi' };
}

// J&T Cargo Batch Live Tracking (multiple bill codes)
async function fetchJNTCargoBatchLive(
  billCodes: string[],
  force: boolean = false
): Promise<Record<string, { success: boolean; data?: any; error?: string; carrier?: string }>> {
  const cleanCodes = Array.from(new Set(billCodes.map(c => (c || '').trim().toUpperCase()).filter(Boolean)));
  if (cleanCodes.length === 0) return {};

  const results: Record<string, { success: boolean; data?: any; error?: string; carrier?: string }> = {};

  // Run in parallel with limited concurrency (max 5 at once to avoid rate limiting)
  const CONCURRENCY = 5;
  for (let i = 0; i < cleanCodes.length; i += CONCURRENCY) {
    const chunk = cleanCodes.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (code) => {
        results[code] = await fetchJNTCargoLive(code, force);
      })
    );
    if (i + CONCURRENCY < cleanCodes.length) {
      await new Promise(r => setTimeout(r, 200)); // Brief pause between batches
    }
  }

  return results;
}

// GHN (Giao Hàng Nhanh) Live Tracking
async function fetchGHNLive(orderCode: string, cellphone?: string, force: boolean = false): Promise<{ success: boolean; data?: any; error?: string }> {
  const cleanCode = orderCode.trim().toUpperCase();
  const cleanPhone = (cellphone || '').replace(/\D/g, '').slice(-4);
  const cacheKey = `ghn:${cleanCode}:${cleanPhone}`;
  if (!force) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await throttleGHN();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const requestBody: any = { order_code: cleanCode };
      if (cleanPhone) {
        requestBody.phone_verify = cleanPhone;
      }

      const response = await fetch("https://fe-online-gateway.ghn.vn/order-tracking/public-api/client/tracking-logs", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Origin": "https://ghn.vn",
          "Referer": "https://ghn.vn/"
        },
        body: JSON.stringify(requestBody)
      });
      clearTimeout(timeoutId);

      if (response.status === 429) {
        const backoffMs = 350 * Math.pow(2, attempt) + Math.floor(Math.random() * 150);
        await new Promise(r => setTimeout(r, backoffMs));
        continue;
      }

      const json = (await response.json()) as any;
      if (response.ok && json.code === 200 && json.data && json.data.order_info) {
        const info = json.data.order_info;
        const logs = json.data.tracking_logs || [];
        const mapped = mapGHNStatus(info.status, info.status_name);

        let scannedAtTime: string | undefined;
        const scanLog = logs.find((l: any) => l.status !== 'ready_to_pick' && l.action_at);
        if (scanLog) {
          scannedAtTime = formatDate(scanLog.action_at);
        } else if (info.picktime) {
          scannedAtTime = formatDate(info.picktime);
        }

        const timeline = logs.slice().reverse().map((l: any) => ({
          time: formatDate(l.action_at),
          statusText: l.status_name,
          location: l.location?.address || '',
          description: l.executor?.name ? `Nhân viên xử lý: ${l.executor.name}` : ''
        }));

        const topLog = logs[logs.length - 1];
        const detail = topLog?.location?.address || `Trạng thái: ${info.status_name}`;

        const resultData = {
          carrier: 'ghn',
          statusCategory: mapped.category,
          rawStatusText: info.status_name || mapped.label,
          statusDetail: detail,
          scannedAt: mapped.isScanned ? (scannedAtTime || formatDate(new Date().toISOString())) : undefined,
          recipientLocation: info.to_address,
          pickupAddress: info.from_address,
          timeline
        };

        setInCache(cacheKey, resultData);

        return {
          success: true,
          data: resultData
        };
      } else {
        if (json.code_message === 'PHONE_VERIFY_REQUIRED' || json.message?.includes('phone verify param') || json.code_message === 'PHONE_VERIFY_FAIL') {
          const detailMsg = json.code_message === 'PHONE_VERIFY_FAIL'
            ? 'Mã vận đơn tồn tại trên GHN (4 số cuối SĐT chưa khớp)'
            : 'Mã vận đơn hợp lệ trên GHN (GHN bật bảo mật 4 số cuối SĐT)';

          const resultData = {
            carrier: 'ghn',
            statusCategory: 'not_scanned',
            rawStatusText: 'Đã tạo đơn trên GHN (Bảo mật SĐT)',
            statusDetail: detailMsg,
            scannedAt: undefined,
            timeline: [
              {
                time: formatDate(new Date().toISOString()),
                statusText: 'Đơn hàng tồn tại trên hệ thống GHN',
                location: 'Cổng GHN',
                description: 'Bưu kiện đã được ghi nhận trên hệ thống GHN. Cần 4 số cuối SĐT nếu muốn mở khóa chi tiết người nhận và bưu tá giao.'
              }
            ]
          };

          return {
            success: true,
            data: resultData
          };
        }

        const errorMsg = json.message || 'Không tìm thấy thông tin đơn hàng trên GHN';
        return {
          success: false,
          error: errorMsg
        };
      }
    } catch (err: any) {
      if (attempt === 1) {
        return {
          success: false,
          error: err.message ? `Lỗi kết nối tới GHN: ${err.message}` : 'Lỗi kết nối cổng GHN'
        };
      }
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return {
    success: false,
    error: 'Hệ thống GHN không phản hồi, vui lòng thử lại'
  };
}

// SPX (Shopee Express) Live Tracking
function signSPXTracking(trackingNumber: string) {
  const ts = Math.floor(Date.now() / 1000);
  const secret = "MGViZmZmZTYzZDJhNDgxY2Y1N2ZlN2Q1ZWJkYzlmZDY=";
  const hash = crypto.createHash("sha256").update(`${trackingNumber}${ts}${secret}`).digest("hex");
  return `${trackingNumber}|${ts}${hash}`;
}

async function fetchSPXLive(orderCode: string, force: boolean = false): Promise<{ success: boolean; data?: any; error?: string }> {
  const cleanCode = orderCode.trim().toUpperCase();
  const cacheKey = `spx:${cleanCode}`;
  if (!force) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      let records: any[] = [];
      let slsTn = '';
      let clientOrderId = '';
      let recipientName = '';
      let fleetData: any = null;

      // 1. Query official SPX open order info API (used directly on spx.vn/track and spx.vn/vi)
      try {
        const orderInfoUrl = `https://spx.vn/shipment/order/open/order/get_order_info?spx_tn=${encodeURIComponent(cleanCode)}&language_code=vi`;
        const ctrl1 = new AbortController();
        const tId1 = setTimeout(() => ctrl1.abort(), 6000);
        const res1 = await fetch(orderInfoUrl, {
          signal: ctrl1.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": `https://spx.vn/track?${cleanCode}`,
            "Origin": "https://spx.vn",
            "Accept": "application/json, text/plain, */*"
          }
        });
        clearTimeout(tId1);
        if (res1.ok) {
          const json1 = await res1.json();
          if (json1.retcode === 0 && json1.data?.sls_tracking_info) {
            const info = json1.data.sls_tracking_info;
            slsTn = info.sls_tn || '';
            clientOrderId = info.client_order_id || '';
            recipientName = info.receiver_name || '';
            if (Array.isArray(info.records) && info.records.length > 0) {
              records = info.records;
            }
          }
        }
      } catch (err: any) {
        // Fallback to fleet_order below
      }

      // 2. Query SPX fleet order tracking API with signed HMAC token
      try {
        const signedParam = signSPXTracking(cleanCode);
        const fleetUrl = `https://spx.vn/api/v2/fleet_order/tracking/search?sls_tracking_number=${encodeURIComponent(signedParam)}`;
        const ctrl2 = new AbortController();
        const tId2 = setTimeout(() => ctrl2.abort(), 6000);
        const res2 = await fetch(fleetUrl, {
          signal: ctrl2.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": `https://spx.vn/track?${cleanCode}`,
            "Origin": "https://spx.vn",
            "x-language": "vi",
            "Accept": "application/json, text/plain, */*"
          }
        });
        clearTimeout(tId2);
        if (res2.ok) {
          const json2 = await res2.json();
          if (json2.retcode === 0 && json2.data) {
            fleetData = json2.data;
            if (!recipientName && fleetData.recipient_name) {
              recipientName = fleetData.recipient_name;
            }
          }
        }
      } catch (err: any) {
        // Continue with available data
      }

      const trackingList = Array.isArray(fleetData?.tracking_list) ? fleetData.tracking_list : [];
      const currentStatus = fleetData?.current_status || '';

      if (records.length === 0 && trackingList.length === 0 && !currentStatus) {
        return {
          success: false,
          error: "Không tìm thấy dữ liệu vận đơn trên cổng SPX Express (spx.vn)"
        };
      }

      // Construct timeline favoring detailed records from get_order_info
      let timeline: any[] = [];
      if (records.length > 0) {
        timeline = records.map((item: any) => {
          const locName = item.current_location?.location_name || item.current_location?.full_address || '';
          return {
            time: item.actual_time ? formatDate(item.actual_time) : '',
            statusText: (item.buyer_description || item.description || item.tracking_name || '').trim(),
            location: locName || 'Hệ thống Shopee Express (SPX)',
            description: item.tracking_code ? `Mã sự kiện: ${item.tracking_code}` : ''
          };
        });
      } else if (trackingList.length > 0) {
        timeline = trackingList.map((item: any) => {
          const locMatch = item.message ? item.message.match(/\[(.*?)\]/) : null;
          return {
            time: item.timestamp ? formatDate(item.timestamp) : '',
            statusText: item.message || item.status || 'Cập nhật hành trình',
            location: locMatch ? locMatch[1].trim() : 'Hệ thống Shopee Express (SPX)',
            description: ''
          };
        });
      }

      const latestRecord = records[0];
      const latestCode = latestRecord?.tracking_code || '';
      const latestMilestone = latestRecord?.milestone_code || 0;
      const latestDesc = (latestRecord?.buyer_description || latestRecord?.description || timeline[0]?.statusText || '').toLowerCase();

      const hasDelivered = currentStatus === 'Delivered' || 
                           latestCode === 'F980' || 
                           latestMilestone === 8 ||
                           latestDesc.includes('giao hàng thành công') || 
                           latestDesc.includes('đã giao') || 
                           latestDesc.includes('ký nhận') ||
                           trackingList.some((t: any) => t.status === 'Delivered' || t.message?.toLowerCase().includes('giao hàng thành công'));

      const hasCancelled = currentStatus?.toLowerCase() === 'cancelled' || 
                           latestCode === 'F950' ||
                           latestCode.startsWith('C') ||
                           latestMilestone === 9 ||
                           (latestRecord?.milestone_name || '').toLowerCase().includes('cancel') ||
                           (latestRecord?.tracking_name || '').toLowerCase().includes('cancel') ||
                           latestDesc.includes('hủy') || 
                           latestDesc.includes('huỷ') ||
                           latestDesc.includes('cancel') ||
                           records.some((r: any) => 
                             r.tracking_code === 'F950' || 
                             (r.tracking_code || '').startsWith('C') || 
                             r.milestone_code === 9 || 
                             (r.milestone_name || '').toLowerCase().includes('cancel') ||
                             (r.tracking_name || '').toLowerCase().includes('cancel') ||
                             (r.buyer_description || '').toLowerCase().includes('hủy') ||
                             (r.buyer_description || '').toLowerCase().includes('huỷ') ||
                             (r.seller_description || '').toLowerCase().includes('hủy') ||
                             (r.seller_description || '').toLowerCase().includes('huỷ')
                           ) ||
                           trackingList.some((t: any) => 
                             (t.status || '').toLowerCase() === 'cancelled' || 
                             (t.message || '').toLowerCase().includes('hủy') || 
                             (t.message || '').toLowerCase().includes('huỷ') ||
                             (t.message || '').toLowerCase().includes('cancel')
                           );

      const hasReturned = currentStatus === 'Returned' || 
                          ['F997', 'F671', 'F999'].includes(latestCode) ||
                          latestDesc.includes('hoàn') || 
                          latestDesc.includes('trả hàng') ||
                          trackingList.some((t: any) => t.status === 'Returned' || t.message?.toLowerCase().includes('hoàn') || t.message?.toLowerCase().includes('trả hàng'));

      const isPreparing = latestCode === 'F000' || 
                          latestCode === 'A000' ||
                          latestMilestone === 1 ||
                          latestDesc.includes('chuẩn bị hàng') ||
                          latestDesc.includes('người bán đang chuẩn bị') ||
                          latestDesc.includes('chờ lấy') ||
                          currentStatus === 'Pending' ||
                          currentStatus === 'Created';

      const isDeliveringOrTransit = !isPreparing && (
                                   ['Delivering', 'Courier Delivery', 'Assigned', 'Transporting', 'Sorting', 'LMHub_Receive_Done', 'SOC_Receive_Done', 'Hub_Inbound_Done'].includes(currentStatus) ||
                                   ['F650', 'F699', 'F700', 'F800', 'F850'].includes(latestCode) ||
                                   /^F[4-8]\d{2}$/.test(latestCode) ||
                                   latestDesc.includes('đang giao') || 
                                   latestDesc.includes('đang phát') || 
                                   latestDesc.includes('phân loại') || 
                                   latestDesc.includes('phân tuyến') || 
                                   latestDesc.includes('luân chuyển') || 
                                   latestDesc.includes('đến kho') ||
                                   latestDesc.includes('rời kho') ||
                                   latestDesc.includes('đến bưu cục') ||
                                   latestDesc.includes('rời bưu cục') ||
                                   latestDesc.includes('lên xe') ||
                                   latestDesc.includes('sắp xếp tài xế') ||
                                   latestDesc.includes('sớm được giao') ||
                                   latestDesc.includes('sẵn sàng trung chuyển') ||
                                   latestDesc.includes('đến trạm') ||          // Đã đến trạm giao hàng cuối
                                   latestDesc.includes('trạm giao hàng') ||    // Trạm giao hàng khu vực
                                   latestDesc.includes('sẽ được giao') ||      // Sẽ được giao trong vòng...
                                   latestDesc.includes('đang trên đường giao') ||
                                   latestDesc.includes('shipper đang') ||
                                   latestDesc.includes('bưu tá đang') ||
                                   trackingList.some((t: any) => {
                                     const m = (t.message || '').toLowerCase();
                                     return m.includes('đang giao') || m.includes('đang phát') || m.includes('phân loại') || m.includes('phân tuyến') || m.includes('luân chuyển') || m.includes('đến kho') || m.includes('rời kho') || m.includes('đến bưu cục') || m.includes('rời bưu cục') || m.includes('lên xe') || m.includes('đến trạm') || m.includes('trạm giao hàng') || m.includes('sẽ được giao') || m.includes('sớm được giao');
                                   })
      );

      const isPickupFailed = latestCode === 'F001' || 
                             latestDesc.includes('lấy hàng không thành công') ||
                             latestDesc.includes('chưa lấy được');

      const hasPickedUp = !isPreparing && !isPickupFailed && (
                          ['FMHub_Pickup_Done', 'Picked Up', 'Pickup_Done', 'Pickup_Success', 'FMHub_Pickup'].includes(currentStatus) ||
                          ['F100', 'F101', 'F050'].includes(latestCode) ||
                          (currentStatus.toLowerCase().includes('pickup') && !currentStatus.toLowerCase().includes('fail') && !currentStatus.toLowerCase().includes('pending')) ||
                          (currentStatus.toLowerCase().includes('picked') && !currentStatus.toLowerCase().includes('fail')) ||
                          latestDesc.includes('lấy hàng thành công') || 
                          latestDesc.includes('đã lấy hàng') || 
                          latestDesc.includes('đã nhận') || 
                          latestDesc.includes('tiếp nhận') || 
                          latestDesc.includes('quét mã tiếp nhận') ||
                          trackingList.some((t: any) => {
                            const m = (t.message || '').toLowerCase();
                            return t.status !== 'Created' && t.status !== 'Pending' && !m.includes('chuẩn bị') && !m.includes('không thành công') && (m.includes('đã lấy hàng') || m.includes('đã nhận') || m.includes('tiếp nhận') || m.includes('lấy hàng thành công'));
                          }));

      // Find earliest pickup timestamp (must NOT be creation or failed pickup attempt)
      let pickTime: string | undefined = undefined;
      const nonPickupCodes = ['F000', 'A000', 'F001', 'F002', ''];
      const nonPickupStatuses = ['created', 'manifested', 'pending', 'pending_receive', 'ready_to_ship', 'preparing to ship'];

      const pickupRecord = records.slice().reverse().find((r: any) => 
        !nonPickupCodes.includes(r.tracking_code) && 
        !nonPickupStatuses.includes((r.milestone_name || '').toLowerCase()) &&
        !nonPickupStatuses.includes((r.tracking_name || '').toLowerCase()) &&
        r.actual_time
      );
      if (pickupRecord?.actual_time) {
        pickTime = formatDate(pickupRecord.actual_time);
      } else {
        const pickEvent = trackingList.slice().reverse().find((t: any) => 
          !nonPickupStatuses.includes((t.status || '').toLowerCase()) && 
          !t.message?.toLowerCase().includes('không thành công') && 
          !t.message?.toLowerCase().includes('chuẩn bị hàng') &&
          t.timestamp
        );
        if (pickEvent?.timestamp) {
          pickTime = formatDate(pickEvent.timestamp);
        }
      }

      let statusCategory = 'not_scanned';
      let rawStatusText = timeline[0]?.statusText || 'Người bán đang chuẩn bị hàng';
      let statusDetail = 'Đơn hàng mới tạo mã vận đơn trên Shopee, SPX chưa quét nhận hàng';
      let scannedAt: string | undefined = undefined;

      if (hasDelivered) {
        statusCategory = 'delivered';
        rawStatusText = timeline[0]?.statusText || 'Giao hàng thành công (SPX)';
        statusDetail = 'Bưu kiện đã được phát thành công tới người nhận';
        scannedAt = pickTime;
      } else if (hasCancelled) {
        statusCategory = 'cancelled';
        const cancelRecord = records.find((r: any) => 
          r.tracking_code === 'F950' || 
          r.tracking_code === 'F585' ||
          (r.buyer_description || '').toLowerCase().includes('hủy') ||
          (r.buyer_description || '').toLowerCase().includes('huỷ') ||
          (r.seller_description || '').toLowerCase().includes('hủy') ||
          (r.seller_description || '').toLowerCase().includes('huỷ') ||
          (r.milestone_name || '').toLowerCase().includes('cancel')
        );
        const cancelDesc = cancelRecord?.buyer_description || cancelRecord?.seller_description || cancelRecord?.tracking_name;

        // If the latest event is return warehouse flow (F671, F677) after cancel
        if (latestCode === 'F671' || latestCode === 'F677' || (latestDesc.includes('đến kho') && timeline[0]?.location)) {
          const loc = timeline[0]?.location ? ` [${timeline[0].location}]` : '';
          rawStatusText = `Đã hủy - Đang chuyển kho hoàn${loc}`;
          statusDetail = cancelDesc 
            ? `SPX xác nhận hủy đơn: "${cancelDesc}". Kiện đang xử lý tại kho hoàn.`
            : 'Đơn hàng đã bị hủy trên hệ thống Shopee / SPX (Đang lưu/chuyển kho hoàn)';
        } else {
          rawStatusText = cancelDesc || timeline[0]?.statusText || 'Đơn vị vận chuyển thông báo đơn hàng đã bị hủy';
          statusDetail = 'Đơn hàng đã bị hủy trên hệ thống Shopee / SPX (Cần giữ lại/thu hồi kiện hàng)';
        }
        scannedAt = pickTime;
      } else if (hasReturned) {
        statusCategory = 'returned';
        rawStatusText = timeline[0]?.statusText || 'Chuyển hoàn đơn hàng SPX';
        statusDetail = 'Bưu kiện đang trong quá trình chuyển hoàn lại người gửi';
        scannedAt = pickTime;
      } else if (isDeliveringOrTransit) {
        statusCategory = 'in_transit';
        rawStatusText = timeline[0]?.statusText || 'Đang vận chuyển qua hệ thống SPX';
        statusDetail = 'Bưu kiện đang luân chuyển qua mạng lưới bưu cục/kho SPX SOC';
        scannedAt = pickTime;
      } else if (hasPickedUp) {
        statusCategory = 'scanned';
        rawStatusText = timeline[0]?.statusText || 'Đã lấy hàng - SPX đã nhận kiện';
        statusDetail = 'Tài xế / Bưu tá SPX đã lấy hàng và quét mã thành công';
        scannedAt = pickTime;
      } else if (isPickupFailed) {
        statusCategory = 'not_scanned';
        rawStatusText = timeline[0]?.statusText || 'Lấy hàng không thành công';
        const failReason = records[0]?.reason_desc || records[0]?.seller_description || '';
        statusDetail = failReason 
          ? `Bưu tá SPX lấy hàng không thành công: ${failReason} (Kiện hàng vẫn ở kho/chưa scan lấy)`
          : 'Bưu tá SPX lấy hàng không thành công (Kiện hàng vẫn ở kho/chưa scan lấy)';
        scannedAt = undefined;
      } else {
        statusCategory = 'not_scanned';
        rawStatusText = timeline[0]?.statusText || 'Người bán đang chuẩn bị hàng';
        statusDetail = 'Đơn hàng đã tạo trên Shopee, bưu tá SPX chưa tới lấy kiện';
        scannedAt = undefined;
      }

      let recipientInfo = '';
      if (recipientName) recipientInfo = `Khách: ${recipientName}`;
      if (slsTn) recipientInfo = recipientInfo ? `${recipientInfo} | Mã phụ: ${slsTn}` : `Mã SLS: ${slsTn}`;

      const resultData = {
        carrier: 'spx',
        statusCategory,
        rawStatusText,
        statusDetail,
        updatedAt: timeline[0]?.time,
        scannedAt,
        recipientLocation: recipientInfo || undefined,
        timeline
      };

      setInCache(cacheKey, resultData);
      return {
        success: true,
        data: resultData
      };
    } catch (err: any) {
      if (attempt === 1) {
        return {
          success: false,
          error: err.message || "Lỗi kết nối tới SPX Express"
        };
      }
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return {
    success: false,
    error: "Hệ thống SPX tạm thời bận, vui lòng thử lại"
  };
}

// Ninja Van Live Tracking
async function fetchNinjaVanLive(trackingId: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const cleanCode = trackingId.trim().toUpperCase();
  const cacheKey = `ninjavan:${cleanCode}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return { success: true, data: cached };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const response = await fetch(`https://api.ninjavan.co/vn/dash/1.2/public/orders?tracking_id=${encodeURIComponent(cleanCode)}`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `Ninja Van API HTTP ${response.status}`
      };
    }

    const json = (await response.json()) as any;
    if (json.orders && json.orders.length > 0) {
      const order = json.orders[0];
      const events = order.events || [];
      const status = order.status || '';
      
      const timeline = events.map((e: any) => ({
        time: formatDate(e.time),
        statusText: e.description || e.status,
        location: e.location || 'Mạng lưới Ninja Van',
        description: ''
      }));

      const isDelivered = status === 'Completed' || status === 'Delivered';
      const isCancelled = status === 'Cancelled';
      const isReturned = status === 'Returned_To_Sender';
      const isTransit = status === 'On_Vehicle_For_Delivery' || status === 'Arrived_At_Sorting_Hub' || status === 'Departed_From_Sorting_Hub';
      const isScanned = status === 'Parcel_Collected' || status === 'Parcel_Received' || events.length > 1;

      let statusCategory = 'not_scanned';
      if (isDelivered) statusCategory = 'delivered';
      else if (isCancelled) statusCategory = 'cancelled';
      else if (isReturned) statusCategory = 'returned';
      else if (isTransit) statusCategory = 'in_transit';
      else if (isScanned) statusCategory = 'scanned';

      const resultData = {
        carrier: 'ninjavan',
        statusCategory,
        rawStatusText: status,
        statusDetail: timeline[0]?.statusText || status,
        scannedAt: events.length > 0 ? formatDate(events[events.length - 1].time) : undefined,
        timeline
      };

      setInCache(cacheKey, resultData);
      return { success: true, data: resultData };
    } else {
      return {
        success: false,
        error: 'Không tìm thấy thông tin đơn hàng trên Ninja Van'
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: 'Lỗi kết nối tới Ninja Van: ' + err.message
    };
  }
}

// ----------------------------------------------------
// VNPost / EMS Integration Service
// ----------------------------------------------------
function mapVNPostStatus(summaryStatus: string, logs: any[] = []) {
  const latestLog = logs && logs.length > 0 ? logs[logs.length - 1] : null;
  const statusRaw = latestLog?.TRANG_THAI || (summaryStatus !== 'Chưa có thông tin' ? summaryStatus : '') || '';
  const text = statusRaw.toLowerCase();

  // 1. Giao hàng thành công
  if (
    text.includes('phát thành công') ||
    text.includes('đã phát') ||
    text.includes('delivered') ||
    text.includes('ký nhận') ||
    text.includes('hoàn thành phát')
  ) {
    return {
      category: 'delivered',
      label: statusRaw || 'Phát hàng thành công',
      isScanned: true
    };
  }

  // 2. Chuyển hoàn / Hoàn hàng
  if (
    text.includes('chuyển hoàn') ||
    text.includes('hoàn hàng') ||
    text.includes('trả lại') ||
    text.includes('không phát được') ||
    text.includes('phát không thành công') ||
    text.includes('hoàn trả') ||
    text.includes('chờ chuyển hoàn')
  ) {
    return {
      category: 'returned',
      label: statusRaw || 'Bưu gửi chuyển hoàn',
      isScanned: true
    };
  }

  // 3. Đã hủy
  if (text.includes('hủy') || text.includes('huỷ') || text.includes('cancelled')) {
    return {
      category: 'cancelled',
      label: statusRaw || 'Đơn hàng đã hủy',
      isScanned: false
    };
  }

  // 4. Kiểm tra có log lấy hàng / bưu điện nhận kiện / vận chuyển hay chưa
  const hasPickupScan = logs.some(l => {
    const t = (l.TRANG_THAI || '').toLowerCase();
    // Exclude pre-pickup dispatch/assignment notes or failed pickup
    if (t.includes('phân hướng') || t.includes('yêu cầu thu gom') || t.includes('chưa lấy') || t.includes('không thành công')) return false;

    return (
      t.includes('chấp nhận gửi') ||
      t.includes('posting') ||
      t.includes('collection') ||
      t.includes('đã nhận hàng') ||
      t.includes('nhận kiện hàng') ||
      t.includes('picked up') ||
      t.includes('đi khỏi bưu cục') ||
      t.includes('departure') ||
      t.includes('đến bưu cục') ||
      t.includes('nhập bưu cục') ||
      t.includes('arrival') ||
      t.includes('vận chuyển') ||
      t.includes('giao bưu tá phát') ||
      t.includes('đang giao') ||
      t.includes('đang phát') ||
      t.includes('trung chuyển')
    );
  });

  if (hasPickupScan) {
    // Nếu chỉ mới vừa chấp nhận gửi (chưa rời bưu cục, không có departure / transit)
    const hasDepartureOrTransit = logs.some(l => {
      const t = (l.TRANG_THAI || '').toLowerCase();
      return t.includes('đi khỏi bưu cục') || t.includes('departure') || t.includes('trung chuyển') || t.includes('đến bưu cục') || t.includes('giao bưu tá');
    });

    if (!hasDepartureOrTransit && logs.length <= 4) {
      return {
        category: 'scanned',
        label: statusRaw || 'Bưu điện đã nhận hàng (Đã scan)',
        isScanned: true
      };
    }

    return {
      category: 'in_transit',
      label: statusRaw || 'Đang vận chuyển',
      isScanned: true
    };
  }

  // 5. Chưa scan lấy hàng (chỉ mới có: Điều tin, Đã phân hướng lấy hàng, Đang đi thu gom, hoặc chưa có log)
  return {
    category: 'not_scanned',
    label: statusRaw || 'Chờ VNPost/EMS lấy hàng (Chưa scan)',
    isScanned: false
  };
}

// Single VNPost / EMS Live Tracking
async function fetchVNPostLive(orderCode: string, force: boolean = false): Promise<{ success: boolean; data?: any; error?: string }> {
  const cleanCode = orderCode.trim().toUpperCase();
  const cacheKey = `vnpost:${cleanCode}`;
  if (!force) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }
  }

  const itemCode = cleanCode.endsWith('EMS') ? cleanCode : (cleanCode + 'EMS');

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`https://api.myems.vn/TrackAndTraceItemCode?itemcode=${encodeURIComponent(itemCode)}&language=0`, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
          "Origin": "https://ems.com.vn",
          "Referer": "https://ems.com.vn/"
        }
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        if (attempt === 1) {
          return { success: false, error: `VNPost API HTTP ${res.status}` };
        }
        await new Promise(r => setTimeout(r, 300));
        continue;
      }

      const json = (await res.json()) as any;
      if (json && (json.Code === "00" || json.TBL_INFO || (Array.isArray(json.List_TBL_DINH_VI) && json.List_TBL_DINH_VI.length > 0))) {
        const info = json.TBL_INFO || {};
        const dinhViLogs = json.List_TBL_DINH_VI || [];

        const mapped = mapVNPostStatus(info.TRANG_THAI || '', dinhViLogs);

        let scannedAtTime: string | undefined;
        const pickupLog = dinhViLogs.find((l: any) => {
          const t = (l.TRANG_THAI || '').toLowerCase();
          return (
            t.includes('chấp nhận gửi') ||
            t.includes('posting') ||
            t.includes('collection') ||
            t.includes('nhận hàng') ||
            t.includes('picked up') ||
            t.includes('đi khỏi bưu cục') ||
            t.includes('departure')
          );
        });
        if (pickupLog) {
          scannedAtTime = formatDate(pickupLog.NGAY_TRANG_THAI || `${pickupLog.NGAY} ${pickupLog.GIO}`);
        } else if (mapped.isScanned && dinhViLogs.length > 0) {
          const firstValid = dinhViLogs.find((l: any) => {
            const t = (l.TRANG_THAI || '').toLowerCase();
            return !t.includes('điều tin') && !t.includes('phân hướng') && !t.includes('thu gom');
          });
          if (firstValid) {
            scannedAtTime = formatDate(firstValid.NGAY_TRANG_THAI || `${firstValid.NGAY} ${firstValid.GIO}`);
          }
        }

        const timeline = dinhViLogs.slice().reverse().map((l: any) => ({
          time: formatDate(l.NGAY_TRANG_THAI || `${l.NGAY} ${l.GIO}`),
          statusText: l.TRANG_THAI?.replace(/\s+/g, ' ').trim() || '',
          location: l.VI_TRI?.replace(/\s+/g, ' ').trim() || '',
          description: l.DIEN_THOAI ? `Hotline/SĐT: ${l.DIEN_THOAI}` : ''
        }));

        const latestLog = dinhViLogs[dinhViLogs.length - 1];
        const statusText = latestLog?.TRANG_THAI?.replace(/\s+/g, ' ').trim() || (info.TRANG_THAI !== 'Chưa có thông tin' ? info.TRANG_THAI : '') || 'Chờ bưu điện lấy hàng';
        const locationText = latestLog?.VI_TRI?.replace(/\s+/g, ' ').trim();

        const resultData = {
          carrier: 'vnpost',
          statusCategory: mapped.category,
          rawStatusText: statusText,
          statusDetail: locationText ? `${statusText} - ${locationText}` : statusText,
          scannedAt: mapped.isScanned ? (scannedAtTime || formatDate(new Date().toISOString())) : undefined,
          updatedAt: timeline[0]?.time || formatDate(new Date().toISOString()),
          recipientLocation: info.DIA_CHI_NHAN?.replace(/\s+/g, ' ').trim(),
          recipientName: info.HO_TEN_NHAN?.replace(/\s+/g, ' ').trim(),
          senderName: info.HO_TEN_GUI?.replace(/\s+/g, ' ').trim(),
          weight: info.KHOI_LUONG ? `${info.KHOI_LUONG}g` : undefined,
          refCode: info.MA_THAM_CHIEU,
          timeline
        };

        setInCache(cacheKey, resultData);
        return { success: true, data: resultData };
      } else {
        // Đơn hàng chưa có hành trình trên VNPost / EMS (Bưu tá chưa đến lấy hoặc đơn mới tạo)
        const notScannedResult = {
          carrier: 'vnpost',
          statusCategory: 'not_scanned',
          rawStatusText: 'Chờ VNPost/EMS lấy hàng (Chưa scan)',
          statusDetail: 'Mã vận đơn đã tạo trên hệ thống, đang chờ bưu tá VNPost/EMS đến lấy kiện',
          scannedAt: undefined,
          updatedAt: formatDate(new Date().toISOString()),
          timeline: []
        };
        setInCache(cacheKey, notScannedResult);
        return {
          success: true,
          data: notScannedResult
        };
      }
    } catch (err: any) {
      if (attempt === 1) {
        // Nếu lỗi kết nối mạng, trả về not_scanned kèm statusDetail đang kết nối để không làm treo hoặc báo lỗi đơn
        return {
          success: true,
          data: {
            carrier: 'vnpost',
            statusCategory: 'not_scanned',
            rawStatusText: 'Chờ VNPost/EMS lấy hàng (Chưa scan)',
            statusDetail: 'Hệ thống đang kết nối với cổng Bưu điện VNPost/EMS, vui lòng thử lại sau giây lát',
            scannedAt: undefined,
            updatedAt: formatDate(new Date().toISOString()),
            timeline: []
          }
        };
      }
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return {
    success: true,
    data: {
      carrier: 'vnpost',
      statusCategory: 'not_scanned',
      rawStatusText: 'Chờ VNPost/EMS lấy hàng (Chưa scan)',
      statusDetail: 'Đang đồng bộ với cổng VNPost/EMS...',
      scannedAt: undefined,
      updatedAt: formatDate(new Date().toISOString()),
      timeline: []
    }
  };
}

// VNPost Batch Tracking
async function fetchVNPostBatchLive(
  trackingCodes: string[],
  force: boolean = false
): Promise<Record<string, { success: boolean; data?: any; error?: string; carrier?: string }>> {
  const cleanCodes = Array.from(new Set(trackingCodes.map(c => (c || '').trim().toUpperCase()).filter(Boolean)));
  if (cleanCodes.length === 0) return {};

  const results: Record<string, { success: boolean; data?: any; error?: string; carrier?: string }> = {};

  const CONCURRENCY = 10;
  for (let i = 0; i < cleanCodes.length; i += CONCURRENCY) {
    const chunk = cleanCodes.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (code) => {
        results[code] = await fetchVNPostLive(code, force);
      })
    );
    if (i + CONCURRENCY < cleanCodes.length) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  return results;
}

// ----------------------------------------------------
// BEST Express Integration Service
// ----------------------------------------------------

interface BestCaptchaToken {
  instanceId: string;
  code: string;
  validate: string;
  expiresAt: number;
}

async function getBestCaptchaToken(): Promise<BestCaptchaToken> {
  const appKey = 'ef49c150db25a98c410bae455cc3ec79';
  const captchaServerUrl = 'https://captcha-sg.800best.com/api';

  const initRes = await fetch(`${captchaServerUrl}/captcha/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'best-captcha-source': 'web' },
    body: `appKey=${appKey}&type=slide_pic`
  });
  const initJson = (await initRes.json()) as any;
  if (!initJson?.success || !initJson.data?.instanceId) {
    throw new Error('Best captcha init failed');
  }
  const instanceId = initJson.data.instanceId;

  await fetch(`${captchaServerUrl}/captcha/resource?t=${Date.now()}&source=web&appKey=${appKey}&instanceId=${instanceId}`, {
    headers: { 'best-captcha-source': 'web' }
  });

  // Probe secret target
  const probeRes = await fetch(`${captchaServerUrl}/captcha/verify/first`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'best-captcha-source': 'web' },
    body: `appKey=${appKey}&instanceId=${instanceId}&verifyReq=50`
  });
  const probeJson = (await probeRes.json()) as any;
  const targetInt = parseFloat(probeJson.data?.currVerifyReq);
  if (isNaN(targetInt)) {
    throw new Error('Best captcha probe failed to reveal currVerifyReq');
  }

  // Verify with candidate offsets around targetInt (target - 0.5 is almost always the exact match)
  const deltas = [-0.5, 0.5, -0.4, 0.4, -0.6, 0.6, -0.3, 0.3, 0.0, -0.2, 0.2, -0.7, 0.7, -0.8, 0.8];
  for (const delta of deltas) {
    const candidate = +(targetInt + delta).toFixed(2);
    const verifyRes = await fetch(`${captchaServerUrl}/captcha/verify/first`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'best-captcha-source': 'web' },
      body: `appKey=${appKey}&instanceId=${instanceId}&verifyReq=${candidate}`
    });
    const verifyJson = (await verifyRes.json()) as any;
    if (verifyJson && verifyJson.success && verifyJson.data?.code) {
      return {
        instanceId,
        code: verifyJson.data.code,
        validate: verifyJson.data.validate,
        expiresAt: Date.now() + 60000
      };
    }
  }
  throw new Error('Best captcha verification failed all candidates');
}

function formatBestTime(timeVal?: number | string): string | undefined {
  if (!timeVal) return undefined;
  const num = typeof timeVal === 'number' ? timeVal : parseInt(String(timeVal), 10);
  if (isNaN(num) || num <= 0) return undefined;
  const d = new Date(num);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function mapBestStatus(statusTypeCode?: string, rawRemark?: string, hasPickupEvent?: boolean, hasTraces: boolean = false) {
  const st = (statusTypeCode || '').toLowerCase().trim();
  const rm = (rawRemark || '').toLowerCase().trim();

  // 1. Returned / Hoàn hàng
  if (
    st.includes('return') ||
    rm.includes('hoàn hàng') ||
    rm.includes('chuyển hoàn') ||
    rm.includes('trả hàng') ||
    rm.includes('đang hoàn') ||
    rm.includes('trả lại')
  ) {
    return {
      category: 'returned' as const,
      label: rawRemark || (st.includes('signed') ? 'Đã chuyển hoàn thành công' : 'Đang chuyển hoàn'),
      isScanned: true
    };
  }

  // 2. Delivered / Giao thành công
  if (
    st === 'sign' ||
    st.includes('sign') ||
    rm.includes('đã ký nhận') ||
    rm.includes('giao hàng thành công') ||
    rm.includes('giao thành công') ||
    rm.includes('ký nhận') ||
    rm.includes('phát thành công') ||
    rm.includes('người nhận đã nhận')
  ) {
    return {
      category: 'delivered' as const,
      label: rawRemark || 'Giao hàng thành công (Đã ký nhận)',
      isScanned: true
    };
  }

  // 3. Delayed Pickup / Goods not ready / Pickup failed (CRITICAL: Prioritize over transit/station keywords!)
  const isPickupDelay = rm.includes('delayed pickup') ||
                        rm.includes('delay pickup') ||
                        rm.includes('not ready') ||
                        rm.includes('goods are not ready') ||
                        rm.includes('there is an order but no goods') ||
                        rm.includes('order but no goods') ||
                        rm.includes('chưa có hàng') ||
                        rm.includes('chưa chuẩn bị hàng') ||
                        rm.includes('hẹn lấy lại') ||
                        rm.includes('hẹn lại ngày lấy') ||
                        rm.includes('người gửi hẹn') ||
                        rm.includes('lấy không thành công') ||
                        rm.includes('lấy hàng không thành công') ||
                        rm.includes('không lấy được') ||
                        rm.includes('chưa lấy được') ||
                        rm.includes('lấy thất bại');

  // Check if there is genuine POST-pickup station transit subsequent to any delay
  const hasTruePostPickupTransit = st === 'transit' || st === '02' || st === '03' || st === '04' || st === 'station_out' ||
                                   rm.includes('xuất bưu cục') || rm.includes('rời bưu cục') ||
                                   rm.includes('trung chuyển') || rm.includes('đang giao hàng') ||
                                   rm.includes('đang phát') || rm.includes('delivery on the way');

  if (isPickupDelay && !hasTruePostPickupTransit) {
    return {
      category: 'not_scanned' as const,
      label: rawRemark || 'Chờ BEST Express lấy hàng (Chưa chuẩn bị hàng / Hẹn lấy lại)',
      isScanned: false
    };
  }

  // 4. In transit / Delivering / Station Arrive / Dispatch
  if (
    st === 'on the way' ||
    st === 'dispatch' ||
    st === 'station_in' ||
    st === 'station_out' ||
    st === 'arrive' ||
    st === 'transit' ||
    st === '02' ||
    st === '03' ||
    st === '04' ||
    rm.includes('arrive') ||
    rm.includes('hub') ||
    rm.includes('trung chuyển') ||
    rm.includes('xuất bưu cục') ||
    rm.includes('rời bưu cục') ||
    rm.includes('đến bưu cục') ||
    rm.includes('nhập bưu cục') ||
    rm.includes('đang vận chuyển') ||
    rm.includes('delivery on the way') ||
    rm.includes('on the way to') ||
    rm.includes('đang giao') ||
    rm.includes('đang phát')
  ) {
    return {
      category: 'in_transit' as const,
      label: rawRemark || (st === 'dispatch' || rm.includes('delivery') ? 'Đang giao hàng' : 'Đang vận chuyển'),
      isScanned: true
    };
  }

  // 5. Scanned / Collected / Pickup
  if (
    !isPickupDelay && (
      st === 'collected' ||
      st === '01' ||
      (st === 'pickup' && !rm.includes('delay')) ||
      hasPickupEvent ||
      (rm.includes('đã lấy hàng') && !rm.includes('không')) ||
      rm.includes('lấy hàng thành công') ||
      rm.includes('tiếp nhận') ||
      rm.includes('đã nhận hàng')
    )
  ) {
    return {
      category: 'scanned' as const,
      label: rawRemark || 'Đã lấy hàng & tiếp nhận BEST',
      isScanned: true
    };
  }

  // 6. Not scanned / Created / Delayed pickup
  return {
    category: 'not_scanned' as const,
    label: rawRemark || 'Chờ BEST Express lấy hàng (Chưa scan)',
    isScanned: false
  };
}

// Single BEST Express Live Tracking
async function fetchBestLive(orderCode: string, force: boolean = false): Promise<{ success: boolean; data?: any; error?: string; carrier?: string }> {
  const batchRes = await fetchBestBatchLive([orderCode], force);
  const cleanCode = (orderCode || '').trim().toUpperCase();
  return batchRes[cleanCode] || {
    success: false,
    error: 'Không tìm thấy kết quả BEST Express',
    carrier: 'best'
  };
}

// BEST Express Batch Tracking (up to 20 codes per API call)
async function fetchBestBatchLive(
  trackingCodes: string[],
  force: boolean = false
): Promise<Record<string, { success: boolean; data?: any; error?: string; carrier?: string }>> {
  const cleanCodes = Array.from(new Set(trackingCodes.map(c => (c || '').trim().toUpperCase()).filter(Boolean)));
  if (cleanCodes.length === 0) return {};

  const results: Record<string, { success: boolean; data?: any; error?: string; carrier?: string }> = {};
  const uncachedCodes: string[] = [];

  if (!force) {
    for (const code of cleanCodes) {
      const cached = getFromCache(`best:${code}`);
      if (cached) {
        results[code] = { success: true, data: cached, carrier: 'best' };
      } else {
        uncachedCodes.push(code);
      }
    }
  } else {
    uncachedCodes.push(...cleanCodes);
  }

  if (uncachedCodes.length === 0) {
    return results;
  }

  const BEST_CHUNK_SIZE = 20;
  for (let i = 0; i < uncachedCodes.length; i += BEST_CHUNK_SIZE) {
    const chunk = uncachedCodes.slice(i, i + BEST_CHUNK_SIZE);
    try {
      let token = await getBestCaptchaToken();
      let queryUrl = `https://www.best-inc.vn/express-cc/express/expresslistinfo?code=${encodeURIComponent(token.code)}&instanceId=${encodeURIComponent(token.instanceId)}&validate=${encodeURIComponent(token.validate)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      let res = await fetch(queryUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'Origin': 'https://www.best-inc.vn',
          'Referer': 'https://www.best-inc.vn/track?bills=' + chunk.join(','),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'X-Auth-Type': 'WEB',
          'X-Lan': 'VN',
          'X-Nat': 'VN',
          'X-Timezone-Offset': '420',
          'lang-type': 'vi_VN'
        },
        body: JSON.stringify({ expressIds: chunk })
      });
      clearTimeout(timeoutId);

      let json = (await res.json()) as any;

      // If token expired or risk returned, force refresh token once and retry
      if (json && (json.errorCode === 'risk_001' || !json.success)) {
        token = await getBestCaptchaToken(true);
        queryUrl = `https://www.best-inc.vn/express-cc/express/expresslistinfo?code=${encodeURIComponent(token.code)}&instanceId=${encodeURIComponent(token.instanceId)}&validate=${encodeURIComponent(token.validate)}`;

        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => retryController.abort(), 12000);
        res = await fetch(queryUrl, {
          method: 'POST',
          signal: retryController.signal,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'Origin': 'https://www.best-inc.vn',
            'Referer': 'https://www.best-inc.vn/track?bills=' + chunk.join(','),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'X-Auth-Type': 'WEB',
            'X-Lan': 'VN',
            'X-Nat': 'VN',
            'X-Timezone-Offset': '420',
            'lang-type': 'vi_VN'
          },
          body: JSON.stringify({ expressIds: chunk })
        });
        clearTimeout(retryTimeoutId);
        json = (await res.json()) as any;
      }

      const returnedList = (json?.success && Array.isArray(json.data?.expressList)) ? json.data.expressList : [];
      const notMatchList = (json?.success && Array.isArray(json.data?.notMatchCodeList)) ? json.data.notMatchCodeList : [];

      for (const item of returnedList) {
        const code = (item.expressId || '').toUpperCase().trim();
        const currentScanType = item.currentScanType || '';
        const rawTraces = Array.isArray(item.traceDetails) ? item.traceDetails : [];

        let scannedAt: string | undefined = undefined;
        let hasPickupEvent = false;

        for (const t of rawTraces) {
          const rm = (t.remark || '').toLowerCase();
          const scanName = (t.scanTypeName || '').toLowerCase();

          const isDelayNotice = rm.includes('delayed pickup') ||
                                rm.includes('delay pickup') ||
                                rm.includes('not ready') ||
                                rm.includes('goods are not ready') ||
                                rm.includes('there is an order but no goods') ||
                                rm.includes('order but no goods') ||
                                rm.includes('chưa có hàng') ||
                                rm.includes('chưa chuẩn bị hàng') ||
                                rm.includes('hẹn lấy') ||
                                rm.includes('lấy không thành công') ||
                                rm.includes('không lấy được') ||
                                rm.includes('chưa lấy được');
          if (isDelayNotice) {
            continue; // Skip pre-pickup delay notices
          }

          if (
            t.scanTypeCode === '01' ||
            (scanName.includes('pickup') && !scanName.includes('delay')) ||
            (rm.includes('pick up') && !rm.includes('delay')) ||
            (rm.includes('pickup') && !rm.includes('delay')) ||
            (rm.includes('đã lấy') && !rm.includes('không')) ||
            rm.includes('lấy hàng thành công') ||
            (rm.includes('tiếp nhận') && !rm.includes('yêu cầu'))
          ) {
            hasPickupEvent = true;
            if (t.acceptTime) {
              scannedAt = formatBestTime(t.acceptTime);
            }
            break;
          }
        }

        const latestTrace = rawTraces.length > 0 ? rawTraces[rawTraces.length - 1] : null;
        const latestRemark = latestTrace?.remark || '';
        const mapped = mapBestStatus(currentScanType, latestRemark, hasPickupEvent, rawTraces.length > 0);

        if (mapped.category === 'not_scanned') {
          scannedAt = undefined;
        } else if (!scannedAt && mapped.isScanned && latestTrace?.acceptTime) {
          scannedAt = formatBestTime(latestTrace.acceptTime);
        }

        const timeline = rawTraces.map((t: any) => ({
          time: formatBestTime(t.acceptTime) || '',
          statusText: t.scanTypeName || t.scanTypeCode || currentScanType,
          description: (t.remark || '') + (t.scanPhone ? ` (SĐT: ${t.scanPhone})` : '')
        })).reverse();

        const orderData = {
          carrier: 'best',
          statusCategory: mapped.category,
          rawStatusText: mapped.label,
          statusDetail: latestRemark || mapped.label,
          scannedAt,
          updatedAt: formatBestTime(latestTrace?.acceptTime) || formatBestTime(Date.now()),
          timeline,
          trackUrl: `https://best-inc.vn/track?bills=${encodeURIComponent(code)}`
        };

        setInCache(`best:${code}`, orderData, 300 * 1000);
        results[code] = { success: true, data: orderData, carrier: 'best' };
      }

      for (const missingCode of notMatchList) {
        const notFoundData = {
          carrier: 'best',
          statusCategory: 'not_scanned' as const,
          rawStatusText: 'Chưa tìm thấy trên hệ thống BEST Express',
          statusDetail: 'Mã vận đơn đã tạo trên hệ thống, bưu tá BEST chưa lấy hàng',
          scannedAt: undefined,
          updatedAt: formatBestTime(Date.now()),
          timeline: [],
          trackUrl: `https://best-inc.vn/track?bills=${encodeURIComponent(missingCode)}`
        };
        setInCache(`best:${missingCode}`, notFoundData, 120 * 1000);
        results[missingCode] = { success: true, data: notFoundData, carrier: 'best' };
      }

      for (const c of chunk) {
        if (!results[c]) {
          const fallbackData = {
            carrier: 'best',
            statusCategory: 'not_scanned' as const,
            rawStatusText: 'Chờ BEST Express lấy hàng (Chưa scan)',
            statusDetail: 'Đang chờ bưu tá BEST Express cập nhật trạng thái',
            scannedAt: undefined,
            updatedAt: formatBestTime(Date.now()),
            timeline: [],
            trackUrl: `https://best-inc.vn/track?bills=${encodeURIComponent(c)}`
          };
          setInCache(`best:${c}`, fallbackData, 60 * 1000);
          results[c] = { success: true, data: fallbackData, carrier: 'best' };
        }
      }
    } catch (err: any) {
      console.error('[BEST Batch Error]:', err.message);
      for (const c of chunk) {
        if (!results[c]) {
          results[c] = {
            success: false,
            error: err.message || 'Lỗi tra cứu BEST Express',
            carrier: 'best'
          };
        }
      }
    }
  }

  return results;
}

// ----------------------------------------------------
// Viettel Post (VTP) Logistics Service & Tracking
// ----------------------------------------------------
const VTP_STATUS_MAP: Record<string, { category: 'not_scanned' | 'scanned' | 'in_transit' | 'delivered' | 'cancelled' | 'returned'; text: string }> = {
  "-100": { category: "not_scanned", text: "Mới tạo" },
  "-101": { category: "not_scanned", text: "Yêu cầu gửi" },
  "100": { category: "not_scanned", text: "Đã duyệt - Chờ bưu tá lấy hàng" },
  "102": { category: "not_scanned", text: "Đã duyệt - Chờ bưu tá lấy hàng" },
  "103": { category: "not_scanned", text: "Đã duyệt - Chờ bưu tá lấy hàng" },
  "104": { category: "not_scanned", text: "Đã duyệt - Chờ bưu tá lấy hàng" },
  "-108": { category: "not_scanned", text: "Đã duyệt - Chờ lấy hàng" },
  "-109": { category: "scanned", text: "Đã gửi tại bưu cục Viettel Post" },
  "-110": { category: "scanned", text: "Đã gửi tại bưu cục Viettel Post" },
  "105": { category: "scanned", text: "Đã lấy hàng - Bưu tá VTP đã nhận" },
  "107": { category: "cancelled", text: "Đã hủy" },
  "201": { category: "cancelled", text: "Đã hủy" },
  "503": { category: "cancelled", text: "Đã hủy" },
  "200": { category: "in_transit", text: "Đang vận chuyển" },
  "202": { category: "in_transit", text: "Đang vận chuyển" },
  "300": { category: "in_transit", text: "Đang vận chuyển liên tỉnh" },
  "301": { category: "in_transit", text: "Đang vận chuyển" },
  "302": { category: "in_transit", text: "Đang vận chuyển" },
  "303": { category: "in_transit", text: "Đang vận chuyển" },
  "320": { category: "in_transit", text: "Đang vận chuyển" },
  "400": { category: "in_transit", text: "Đến bưu cục phát" },
  "500": { category: "in_transit", text: "Đang phát hàng" },
  "506": { category: "in_transit", text: "Đang giao hàng" },
  "507": { category: "in_transit", text: "Đang giao hàng" },
  "509": { category: "in_transit", text: "Đang giao hàng" },
  "511": { category: "in_transit", text: "Đang giao hàng" },
  "501": { category: "delivered", text: "Giao thành công" },
  "504": { category: "returned", text: "Hoàn thành công" },
  "502": { category: "returned", text: "Duyệt hoàn" },
  "505": { category: "returned", text: "Chờ chuyển hoàn" },
  "515": { category: "returned", text: "Duyệt hoàn" },
  "551": { category: "returned", text: "Đang chuyển hoàn" },
  "508": { category: "in_transit", text: "Phát tiếp" },
  "550": { category: "in_transit", text: "Phát tiếp" },
};

async function fetchViettelPostCaptcha(): Promise<{ success: boolean; id?: string; captcha?: string; error?: string }> {
  try {
    const res = await fetch('https://api.viettelpost.vn/api/orders/getCaptcha', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://viettelpost.vn',
        'Referer': 'https://viettelpost.vn/'
      }
    });
    const json: any = await res.json();
    if (json.status === 200 && json.data) {
      return {
        success: true,
        id: json.data.id,
        captcha: json.data.captcha
      };
    }
    return { success: false, error: json.message || 'Không thể lấy captcha Viettel Post' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi kết nối Viettel Post captcha' };
  }
}

async function queryViettelPostLive(
  orderCodes: string[], 
  id?: string, 
  captcha?: string
): Promise<{ success: boolean; results: Record<string, any>; error?: string }> {
  const cleanCodes = Array.from(new Set(orderCodes.map(c => (c || '').trim().toUpperCase()).filter(Boolean)));
  if (cleanCodes.length === 0) return { success: true, results: {} };

  const results: Record<string, any> = {};

  // If captcha and ID provided, call official API
  if (id && captcha) {
    try {
      const ordersStr = cleanCodes.join(',');
      const res = await fetch('https://api.viettelpost.vn/api/orders/viewTrackingOrders3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Origin': 'https://viettelpost.vn',
          'Referer': 'https://viettelpost.vn/'
        },
        body: JSON.stringify({
          id,
          captcha,
          orders: ordersStr
        })
      });

      const json: any = await res.json();
      if (json.error || json.status === 201) {
        return { success: false, results: {}, error: json.message || 'Mã captcha không chính xác' };
      }

      const list = Array.isArray(json.data) ? json.data : (json.data ? [json.data] : []);
      for (const item of list) {
        const code = (item.ORDER_NUMBER || '').trim().toUpperCase();
        if (!code) continue;

        const trackings = Array.isArray(item.TRACKINGS) ? item.TRACKINGS : [];
        const timeline = trackings.map((t: any) => ({
          time: t.STATUS_DATE || '',
          statusText: t.STATUS_NAME || '',
          description: [t.NOTE, t.LOCATION_CURRENT, t.POST_OFFICE_NAME].filter(Boolean).join(' - ')
        }));

        const rawStatus = item.STATUS_NAME || trackings[0]?.STATUS_NAME || 'Chờ Viettel Post lấy hàng';
        const statusCode = String(item.TRANG_THAI || trackings[0]?.TRANG_THAI || '');

        let cat: any = 'not_scanned';
        let statusText = rawStatus;
        if (VTP_STATUS_MAP[statusCode]) {
          cat = VTP_STATUS_MAP[statusCode].category;
          statusText = VTP_STATUS_MAP[statusCode].text;
        } else {
          const lower = rawStatus.toLowerCase();
          if (lower.includes('thành công') || lower.includes('đã giao')) cat = 'delivered';
          else if (lower.includes('hủy')) cat = 'cancelled';
          else if (lower.includes('hoàn')) cat = 'returned';
          else if (lower.includes('vận chuyển') || lower.includes('đang giao')) cat = 'in_transit';
          else if (lower.includes('đã lấy') || lower.includes('bưu cục') || lower.includes('nhận')) cat = 'scanned';
        }

        const scannedTime = trackings.find((t: any) => {
          const s = String(t.TRANG_THAI || '');
          const txt = (t.STATUS_NAME || '').toLowerCase();
          return s === '105' || s === '-109' || s === '-110' || txt.includes('đã lấy') || txt.includes('nhận');
        })?.STATUS_DATE;

        const orderData = {
          carrier: 'viettelpost',
          statusCategory: cat,
          rawStatusText: statusText,
          statusDetail: trackings[0] ? [trackings[0].STATUS_NAME, trackings[0].LOCATION_CURRENT].filter(Boolean).join(' - ') : '',
          scannedAt: scannedTime,
          updatedAt: trackings[0]?.STATUS_DATE || new Date().toISOString(),
          timeline,
          trackUrl: `https://viettelpost.com.vn/tra-cuu-hanh-trinh-don/?order_number=${encodeURIComponent(code)}`
        };

        setInCache(`vtp:${code}`, orderData, 300 * 1000);
        results[code] = { success: true, data: orderData, carrier: 'viettelpost' };
      }
    } catch (err: any) {
      return { success: false, results: {}, error: err.message || 'Lỗi kết nối Viettel Post API' };
    }
  }

  // For any codes not matched or when no captcha provided, return cached or graceful not_scanned status
  for (const c of cleanCodes) {
    if (!results[c]) {
      const cached = getFromCache(`vtp:${c}`);
      if (cached) {
        results[c] = { success: true, data: cached, carrier: 'viettelpost' };
      } else {
        const defaultData = {
          carrier: 'viettelpost',
          statusCategory: 'not_scanned' as const,
          rawStatusText: 'Chờ Viettel Post lấy hàng (Chưa scan)',
          statusDetail: 'Mã vận đơn đã tạo, đang chờ bưu tá Viettel Post quét mã lấy hàng',
          scannedAt: undefined,
          updatedAt: new Date().toISOString(),
          timeline: [],
          trackUrl: `https://viettelpost.com.vn/tra-cuu-hanh-trinh-don/?order_number=${encodeURIComponent(c)}`
        };
        setInCache(`vtp:${c}`, defaultData, 60 * 1000);
        results[c] = { success: true, data: defaultData, carrier: 'viettelpost' };
      }
    }
  }

  return { success: true, results };
}

async function fetchViettelPostLive(
  orderCode: string, 
  force: boolean = false
): Promise<{ success: boolean; data?: any; error?: string; carrier?: string }> {
  const cleanCode = (orderCode || '').trim().toUpperCase();
  if (!cleanCode) return { success: false, error: 'Mã vận đơn rỗng', carrier: 'viettelpost' };

  if (!force) {
    const cached = getFromCache(`vtp:${cleanCode}`);
    if (cached) return { success: true, data: cached, carrier: 'viettelpost' };
  }

  const res = await queryViettelPostLive([cleanCode]);
  return res.results[cleanCode] || {
    success: true,
    data: {
      carrier: 'viettelpost',
      statusCategory: 'not_scanned',
      rawStatusText: 'Chờ Viettel Post lấy hàng (Chưa scan)',
      statusDetail: 'Mã vận đơn đã tạo, đang chờ bưu tá Viettel Post quét mã lấy hàng',
      scannedAt: undefined,
      updatedAt: new Date().toISOString(),
      timeline: [],
      trackUrl: `https://viettelpost.com.vn/tra-cuu-hanh-trinh-don/?order_number=${encodeURIComponent(cleanCode)}`
    },
    carrier: 'viettelpost'
  };
}

// ----------------------------------------------------
// YunWMS (WMS Cloud) Integration Service
// ----------------------------------------------------
let yunWMSSessionCookie: string | null = null;
let yunWMSSessionExpiry: number = 0;
let yunWMSLoginPromise: Promise<string> | null = null;

const WMS_STATUS_MAP: Record<string, string> = {
  '0': 'Đã xóa',
  '1': 'Bản nháp',
  '2': 'Đã xác nhận',
  '3': 'Bất thường',
  '4': 'Đã nộp (Chờ xử lý)',
  '5': 'Đã hạ kệ',
  '6': 'Hoàn thành hạ kệ',
  '7': 'Đã dán nhãn',
  '78': 'Đã đối soát',
  '8': 'Đã xuất kho',
  '14': 'Đã cắt đơn'
};

function extractCookiesFromHeaders(headers: any): Record<string, string> {
  const cookiesMap: Record<string, string> = {};
  let setCookies: string[] = [];

  if (typeof headers.getSetCookie === 'function') {
    setCookies = headers.getSetCookie();
  } else if (typeof headers.raw === 'function') {
    setCookies = headers.raw()['set-cookie'] || [];
  } else if (typeof headers.get === 'function') {
    const headerVal = headers.get('set-cookie');
    if (headerVal) {
      setCookies = headerVal.split(/,(?=\s*[a-zA-Z0-9_\-]+=)/);
    }
  }

  for (const c of setCookies) {
    if (!c) continue;
    const cookiePart = c.split(';')[0];
    const eqIdx = cookiePart.indexOf('=');
    if (eqIdx !== -1) {
      const name = cookiePart.substring(0, eqIdx).trim();
      const val = cookiePart.substring(eqIdx + 1).trim();
      cookiesMap[name] = val;
    }
  }
  return cookiesMap;
}

const WMS_WAREHOUSE_MAP: Record<string, string> = {
  '7': 'VN02 [Kho Hồ Chí Minh]',
  '4': 'VN01 [Kho VN01 Hải Ngoại]'
};

async function getYunWMSCookie(userName: string = 'David', userPass: string = '12345abc', forceNew: boolean = false): Promise<string> {
  if (!forceNew && yunWMSSessionCookie && Date.now() < yunWMSSessionExpiry) {
    return yunWMSSessionCookie;
  }

  if (yunWMSLoginPromise) {
    return yunWMSLoginPromise;
  }

  yunWMSLoginPromise = (async () => {
    try {
      const baseUrl = 'https://czwh.wms.yunwms.com';
      const initRes = await fetch(baseUrl + '/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const cookiesMap = extractCookiesFromHeaders(initRes.headers);

      const body = new URLSearchParams();
      body.append('userName', userName);
      body.append('userPass', Buffer.from(userPass).toString('base64'));

      const cookieStr = Object.entries(cookiesMap).map(([k, v]) => `${k}=${v}`).join('; ');
      const loginRes = await fetch(baseUrl + '/login.html', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Cookie': cookieStr,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': baseUrl + '/'
        },
        body: body.toString()
      });

      const loginJson: any = await loginRes.json();
      if (!loginJson.state) {
        throw new Error(loginJson.message || 'Đăng nhập YunWMS không thành công. Vui lòng kiểm tra tài khoản/mật khẩu.');
      }

      const loginCookies = extractCookiesFromHeaders(loginRes.headers);
      Object.assign(cookiesMap, loginCookies);

      yunWMSSessionCookie = Object.entries(cookiesMap).map(([k, v]) => `${k}=${v}`).join('; ');
      yunWMSSessionExpiry = Date.now() + 1800000; // 30 mins session validity
      return yunWMSSessionCookie;
    } finally {
      yunWMSLoginPromise = null;
    }
  })();

  return yunWMSLoginPromise;
}

export function computeYunWMSDateRange(
  dateInterval?: string,
  customDateFor?: string,
  customDateTo?: string,
  searchDateType: string = 'createDate',
  excludeToday: boolean = false
): { dateFor: string; dateTo: string; searchDateType: string } | null {
  const now = new Date();
  const vnFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const todayStr = vnFormatter.format(now);
  const oneDayMs = 24 * 60 * 60 * 1000;
  const yesterdayStr = vnFormatter.format(new Date(now.getTime() - oneDayMs));
  const effectiveSearchDateType = searchDateType || 'createDate';

  const formatStartDay = (d: string) => {
    const trimmed = (d || '').trim();
    if (!trimmed) return '';
    return trimmed.includes(':') ? trimmed : `${trimmed} 00:00`;
  };
  const formatEndDay = (d: string) => {
    const trimmed = (d || '').trim();
    if (!trimmed) return '';
    return trimmed.includes(':') ? trimmed : `${trimmed} 23:59`;
  };

  if (customDateFor) {
    let rawFrom = customDateFor.trim();
    let rawTo = (customDateTo || '').trim();

    // If customDateTo is empty or equal to customDateFor (user selected a single day like day 17)
    if (!rawTo) {
      rawTo = rawFrom;
    }

    // When user explicitly provides a custom date range, ALWAYS respect their chosen dates
    // Do not alter or truncate rawTo with yesterdayStr!
    return {
      dateFor: formatStartDay(rawFrom),
      dateTo: formatEndDay(rawTo),
      searchDateType: effectiveSearchDateType
    };
  }

  if (excludeToday) {
    // Exclude today: dateTo is always yesterdayStr 23:59 (shipper -1 ngày)
    if (!dateInterval || dateInterval === 'all' || dateInterval === '0') {
      return {
        dateFor: '2020-01-01 00:00',
        dateTo: `${yesterdayStr} 23:59`,
        searchDateType: effectiveSearchDateType
      };
    }

    const days = parseInt(dateInterval, 10);
    if (isNaN(days) || days <= 0) {
      return {
        dateFor: '2020-01-01 00:00',
        dateTo: `${yesterdayStr} 23:59`,
        searchDateType: effectiveSearchDateType
      };
    }

    // Interval ending yesterday
    const pastMs = now.getTime() - (days * oneDayMs);
    const fromStr = vnFormatter.format(new Date(pastMs));
    return {
      dateFor: `${fromStr} 00:00`,
      dateTo: `${yesterdayStr} 23:59`,
      searchDateType: effectiveSearchDateType
    };
  }

  if (!dateInterval || dateInterval === 'all' || dateInterval === '0') {
    return null; // All orders
  }

  const days = parseInt(dateInterval, 10);
  if (isNaN(days) || days <= 0) {
    return null;
  }

  const pastMs = now.getTime() - (days - 1) * oneDayMs;
  const fromStr = vnFormatter.format(new Date(pastMs));

  return {
    dateFor: `${fromStr} 00:00`,
    dateTo: `${todayStr} 23:59`,
    searchDateType: effectiveSearchDateType
  };
}

async function fetchYunWMSOrdersList({
  userName = 'David',
  userPass = '12345abc',
  page = 1,
  pageSize = 50,
  dateInterval = '3',
  dateFor = '',
  dateTo = '',
  searchDateType = 'createDate',
  customerCode = '',
  orderStatus = '',
  warehouseId = '7', // Default to 7: VN02 [越南胡志明仓库]
  searchCode = '',
  only8623AndSpxvn = false,
  excludeToday = false,
  carrierFilterMode = '',
  selectedCarriers = [],
  customPrefixes = []
}: {
  userName?: string;
  userPass?: string;
  page?: number;
  pageSize?: number;
  dateInterval?: string;
  dateFor?: string;
  dateTo?: string;
  searchDateType?: string;
  customerCode?: string;
  orderStatus?: string;
  warehouseId?: string;
  searchCode?: string;
  only8623AndSpxvn?: boolean;
  excludeToday?: boolean;
  carrierFilterMode?: string;
  selectedCarriers?: string[];
  customPrefixes?: string[];
}) {
  let cookie = await getYunWMSCookie(userName, userPass);
  const baseUrl = 'https://czwh.wms.yunwms.com';

  const postData = new URLSearchParams();
  const dateRange = computeYunWMSDateRange(dateInterval, dateFor, dateTo, searchDateType, excludeToday);
  if (dateRange) {
    postData.append('searchDateType', dateRange.searchDateType);
    postData.append('dateFor', dateRange.dateFor);
    postData.append('dateTo', dateRange.dateTo);
  } else {
    postData.append('date_interval', '');
  }

  if (customerCode) postData.append('E3', customerCode);
  if (orderStatus) postData.append('E11', orderStatus);
  if (warehouseId) postData.append('E4', warehouseId);
  if (searchCode) postData.append('searchCode', searchCode);

  let ordersRes = await fetch(`${baseUrl}/order/orders/list/page/${page}/pageSize/${pageSize}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `${baseUrl}/order/orders/list`
    },
    body: postData.toString()
  });

  let json = await ordersRes.json();
  if (!json || json.state !== 1) {
    cookie = await getYunWMSCookie(userName, userPass, true);
    ordersRes = await fetch(`${baseUrl}/order/orders/list/page/${page}/pageSize/${pageSize}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${baseUrl}/order/orders/list`
      },
      body: postData.toString()
    });
    json = await ordersRes.json();
  }

  // Get current date string in VN GMT+7 for strict filtering
  const now = new Date();
  const vnFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const todayStr4 = vnFormatter.format(now); // e.g. "2026-09-08"
  const todayStr2 = todayStr4.substring(2);  // e.g. "26-09-08"

  const rawList = Array.isArray(json.data) ? json.data : [];
  const rawCount = rawList.length;

  const normalized = rawList.map((item: any) => {
    const rawTrackNo = (item.tracking_number || '').trim();
    const wmsStatusCode = String(item.E11 || '');
    const wmsWarehouseId = String(item.E4 || warehouseId || '');
    return {
      orderNo: item.E1 || '',
      refNo: item.E17 || '',
      trackingNumber: rawTrackNo,
      platformOrderNo: item.refrence_no_platforms || item.E1 || '',
      customerCode: item.E3 || '',
      warehouseId: wmsWarehouseId,
      warehouseName: WMS_WAREHOUSE_MAP[wmsWarehouseId] || (wmsWarehouseId === '7' ? 'VN02 [Kho Hồ Chí Minh]' : wmsWarehouseId === '4' ? 'VN01 [Kho VN01 Hải Ngoại]' : `Kho ${wmsWarehouseId}`),
      carrierChannel: item.E7 || item.E32 || '',
      recipientName: item.oab_firstname || '',
      wmsStatus: WMS_STATUS_MAP[wmsStatusCode] || `Trạng thái ${wmsStatusCode}`,
      wmsStatusCode,
      createDate: item.warehouse_E14 || item.E14 || '',
      shipTime: item.warehouse_ship_time || item.ship_time || '',
      packTime: item.warehouse_pack_time || item.pack_time || '',
      printTime: item.process_time || '',
      syncWmsTime: item.sync_owms_time || '',
      productsCount: Array.isArray(item.productList) ? item.productList.length : 1,
      buyersMessage: item.buyers_message || '',
      country: item.E23 || 'VN'
    };
  }).filter((order: any) => {
    // 1. Filter: Kiểm tra đầu mã vận đơn theo cấu hình người dùng
    const track = (order.trackingNumber || '').trim().toUpperCase();
    const effectiveMode = (carrierFilterMode as any) || (only8623AndSpxvn ? 'spx_jt' : 'all');
    const isMatchedPrefix = matchesTrackingPrefixFilter(track, {
      carrierFilterMode: effectiveMode,
      selectedCarriers,
      customPrefixes,
      only8623AndSpxvn
    });
    if (!isMatchedPrefix) {
      return false;
    }

    // 2. Filter: Loại trừ đơn hôm nay (chỉ khi dùng chế độ preset excludeToday và không phải customDate)
    if (excludeToday && !dateFor && !dateTo) {
      const orderDate = (order.createDate || '').trim();
      if (orderDate.startsWith(todayStr4) || orderDate.startsWith(todayStr2)) {
        return false;
      }
    }

    return true;
  });

  const rawTotal = json.total ?? json.totalCount ?? json.recordsTotal ?? json.records ?? json.count ?? json.data_count ?? (json.pagination && json.pagination.total);
  const parsedTotal = Number(rawTotal);
  const finalTotal = (!isNaN(parsedTotal) && parsedTotal > 0) ? parsedTotal : 0;

  return {
    total: finalTotal,
    page,
    pageSize,
    warehouseId,
    rawCount,
    hasMore: rawCount >= pageSize,
    orders: normalized
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 5000;

  app.use(express.json({ limit: "150mb" }));
  app.use(express.urlencoded({ limit: "150mb", extended: true }));

  // API health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Initialize SQLite database
  await initSqliteDb();

  // In-memory RAM Cache for high-speed serving (1-5ms response instead of 13s DB queries)
  let cachedOrdersPayload: string | null = null;
  let cachedOrdersGzip: Buffer | null = null;
  let cachedOrdersTimestamp: number = 0;
  let cachedOrdersStats: any = null;
  const ORDERS_CACHE_TTL = 60000; // 60s cache TTL

  const invalidateOrdersCache = () => {
    cachedOrdersPayload = null;
    cachedOrdersGzip = null;
    cachedOrdersTimestamp = 0;
    cachedOrdersStats = null;
  };

  // Get orders from SQLite (Instant RAM Cache + GZIP, zero DB query bottleneck)
  const handleGetOrders = async (req: express.Request, res: express.Response) => {
    try {
      const now = Date.now();
      if (!cachedOrdersGzip || (now - cachedOrdersTimestamp > ORDERS_CACHE_TTL)) {
        const orders = await getAllSqliteOrders();
        const stats = await getSqliteStats();
        cachedOrdersStats = stats;
        const payloadString = JSON.stringify({
          success: true,
          orders,
          count: orders.length,
          stats,
          lastSaved: new Date().toISOString()
        });

        cachedOrdersPayload = payloadString;
        cachedOrdersGzip = zlib.gzipSync(payloadString);
        cachedOrdersTimestamp = now;
      }

      const acceptEncoding = (req.headers["accept-encoding"] || "") as string;
      if (acceptEncoding.includes("gzip") && cachedOrdersGzip) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Content-Encoding", "gzip");
        res.setHeader("Vary", "Accept-Encoding");
        res.setHeader("Cache-Control", "public, max-age=10");
        return res.send(cachedOrdersGzip);
      }

      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.send(cachedOrdersPayload);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  app.get("/api/orders", handleGetOrders);
  app.get("/api/orders/state", handleGetOrders);

  // Lazy-load timeline for single tracking code
  app.get("/api/orders/:code/timeline", async (req: express.Request, res: express.Response) => {
    try {
      const code = req.params.code;
      if (!code) {
        return res.status(400).json({ success: false, error: "Missing tracking code" });
      }
      const timeline = await getOrderTimeline(code);
      return res.json({
        success: true,
        trackingCode: code,
        timeline: timeline || []
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Fast stats endpoint (using RAM cache if valid)
  app.get("/api/orders/stats", async (req, res) => {
    try {
      if (cachedOrdersStats && (Date.now() - cachedOrdersTimestamp <= ORDERS_CACHE_TTL)) {
        return res.json({ success: true, stats: cachedOrdersStats });
      }
      const stats = await getSqliteStats();
      cachedOrdersStats = stats;
      return res.json({ success: true, stats });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Batch UPSERT orders into SQLite (Atomically update/overwrite in milliseconds)
  const handleUpsertOrders = async (req: express.Request, res: express.Response) => {
    try {
      const { orders } = req.body;
      if (!Array.isArray(orders)) {
        return res.status(400).json({ success: false, error: "orders must be an array" });
      }
      const updatedCount = await upsertSqliteOrders(orders);
      invalidateOrdersCache();
      const stats = await getSqliteStats();
      return res.json({
        success: true,
        count: orders.length,
        updated: updatedCount,
        stats,
        lastSaved: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  app.post("/api/orders", handleUpsertOrders);
  app.post("/api/orders/upsert", handleUpsertOrders);
  app.post("/api/orders/state", handleUpsertOrders);

  // Clear orders from SQLite
  const handleClearOrders = async (req: express.Request, res: express.Response) => {
    try {
      await clearSqliteOrders();
      invalidateOrdersCache();
      const legacyState = path.join(process.cwd(), "data", "orders_state.json");
      if (fs.existsSync(legacyState)) {
        try { fs.unlinkSync(legacyState); } catch {}
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  };

  app.delete("/api/orders", handleClearOrders);
  app.delete("/api/orders/state", handleClearOrders);

  // YunWMS Test Auth endpoint
  app.post("/api/yunwms/test-auth", async (req, res) => {
    try {
      const { userName = "David", userPass = "12345abc" } = req.body;
      const cookie = await getYunWMSCookie(userName, userPass, true);
      res.json({ success: true, message: "Đăng nhập YunWMS thành công!", hasSession: !!cookie });
    } catch (err: any) {
      res.status(401).json({ success: false, error: err.message || "Lỗi đăng nhập YunWMS" });
    }
  });

  // YunWMS Fetch Orders endpoint
  app.post("/api/yunwms/orders", async (req, res) => {
    try {
      const {
        userName = "David",
        userPass = "12345abc",
        page = 1,
        pageSize = 50,
        dateInterval = "3",
        dateFor = "",
        dateTo = "",
        searchDateType = "createDate",
        customerCode = "",
        orderStatus = "",
        warehouseId = "7",
        searchCode = "",
        only8623AndSpxvn = false,
        excludeToday = false,
        carrierFilterMode = "",
        selectedCarriers = [],
        customPrefixes = []
      } = req.body;

      const result = await fetchYunWMSOrdersList({
        userName,
        userPass,
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 50,
        dateInterval,
        dateFor,
        dateTo,
        searchDateType,
        customerCode,
        orderStatus,
        warehouseId: req.body.E4 !== undefined ? req.body.E4 : warehouseId,
        searchCode,
        only8623AndSpxvn: Boolean(only8623AndSpxvn),
        excludeToday: Boolean(excludeToday),
        carrierFilterMode: String(carrierFilterMode || ''),
        selectedCarriers: Array.isArray(selectedCarriers) ? selectedCarriers : [],
        customPrefixes: Array.isArray(customPrefixes) ? customPrefixes : []
      });

      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Lỗi khi lấy dữ liệu đơn từ YunWMS" });
    }
  });

  // YunWMS Bulk Sync endpoint (Fetch all pages for chosen date interval)
  app.post("/api/yunwms/sync", async (req, res) => {
    try {
      const {
        userName = "David",
        userPass = "12345abc",
        limit = 0,
        dateInterval = "7",
        dateFor = "",
        dateTo = "",
        searchDateType = "createDate",
        customerCode = "",
        orderStatus = "",
        warehouseId = "7",
        searchCode = "",
        only8623AndSpxvn = false,
        excludeToday = false,
        carrierFilterMode = "",
        selectedCarriers = [],
        customPrefixes = []
      } = req.body;

      const parsedLimit = Number(limit);
      const isUnlimited = parsedLimit <= 0;
      const targetLimit = isUnlimited ? 200000 : parsedLimit;
      const pageSize = 100;
      let allOrders: any[] = [];
      let totalWmsOrders = 0;
      const effectiveWarehouseId = req.body.E4 !== undefined ? req.body.E4 : warehouseId;

      for (let p = 1; ; p++) {
        const fetchSize = (!isUnlimited && targetLimit - allOrders.length < pageSize) 
          ? Math.max(1, targetLimit - allOrders.length) 
          : pageSize;

        const pageResult = await fetchYunWMSOrdersList({
          userName,
          userPass,
          page: p,
          pageSize: fetchSize,
          dateInterval,
          dateFor,
          dateTo,
          searchDateType,
          customerCode,
          orderStatus,
          warehouseId: effectiveWarehouseId,
          searchCode,
          only8623AndSpxvn: Boolean(only8623AndSpxvn),
          excludeToday: Boolean(excludeToday),
          carrierFilterMode: String(carrierFilterMode || ''),
          selectedCarriers: Array.isArray(selectedCarriers) ? selectedCarriers : [],
          customPrefixes: Array.isArray(customPrefixes) ? customPrefixes : []
        });

        totalWmsOrders = pageResult.total || totalWmsOrders;
        if (pageResult.orders && pageResult.orders.length > 0) {
          allOrders = allOrders.concat(pageResult.orders);
        }

        // If WMS returned fewer raw items than fetchSize or rawCount === 0, WMS reached end of data
        if (!pageResult.rawCount || pageResult.rawCount < fetchSize) {
          break;
        }

        if (!isUnlimited && allOrders.length >= targetLimit) {
          allOrders = allOrders.slice(0, targetLimit);
          break;
        }

        if (totalWmsOrders > 0 && p * pageSize >= totalWmsOrders) {
          break;
        }
      }

      res.json({
        success: true,
        totalWmsOrders,
        syncedCount: allOrders.length,
        warehouseId: effectiveWarehouseId,
        warehouseName: WMS_WAREHOUSE_MAP[effectiveWarehouseId] || (effectiveWarehouseId === '7' ? 'VN02 [Kho Hồ Chí Minh]' : effectiveWarehouseId === '4' ? 'VN01 [Kho VN01 Hải Ngoại]' : 'Tất cả kho'),
        orders: allOrders
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Lỗi khi đồng bộ đơn từ YunWMS" });
    }
  });

  // High-Speed Multi-Threaded SSE Sync Stream for YunWMS
  app.post("/api/yunwms/sync-stream", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const sendSSE = (payload: any) => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    };

    let isClosed = false;
    res.on("close", () => {
      if (!res.writableEnded) {
        isClosed = true;
      }
    });

    try {
      const {
        userName = "David",
        userPass = "12345abc",
        limit = 0,
        dateInterval = "7",
        dateFor = "",
        dateTo = "",
        searchDateType = "createDate",
        customerCode = "",
        orderStatus = "",
        warehouseId = "7",
        searchCode = "",
        concurrency = 20,
        pageSize = 100,
        only8623AndSpxvn = false,
        excludeToday = false,
        carrierFilterMode = "",
        selectedCarriers = [],
        customPrefixes = []
      } = req.body;

      const effectiveWarehouseId = req.body.E4 !== undefined ? req.body.E4 : warehouseId;
      const parsedLimit = Number(limit);
      const isUnlimited = parsedLimit <= 0;
      const effectiveThreads = Math.max(2, Math.min(30, Number(concurrency) || 20));
      const effectivePageSize = Math.max(50, Math.min(200, Number(pageSize) || 100));

      // 1. Initial probe: fetch Page 1 to inspect data & start batch
      const page1 = await fetchYunWMSOrdersList({
        userName,
        userPass,
        page: 1,
        pageSize: effectivePageSize,
        dateInterval,
        dateFor,
        dateTo,
        searchDateType,
        customerCode,
        orderStatus,
        warehouseId: effectiveWarehouseId,
        searchCode,
        only8623AndSpxvn: Boolean(only8623AndSpxvn),
        excludeToday: Boolean(excludeToday),
        carrierFilterMode: String(carrierFilterMode || ''),
        selectedCarriers: Array.isArray(selectedCarriers) ? selectedCarriers : [],
        customPrefixes: Array.isArray(customPrefixes) ? customPrefixes : []
      });

      const reportedTotal = page1.total || 0;
      const targetCount = isUnlimited ? (reportedTotal > 0 ? reportedTotal : 0) : Math.min(parsedLimit, reportedTotal > 0 ? reportedTotal : parsedLimit);
      let loadedCount = page1.orders.length;

      sendSSE({
        type: "init",
        totalWmsOrders: reportedTotal || (page1.rawCount === effectivePageSize ? 999999 : loadedCount),
        targetCount: targetCount || (reportedTotal > 0 ? reportedTotal : (page1.rawCount === effectivePageSize ? 999999 : loadedCount)),
        pageSize: effectivePageSize,
        concurrency: effectiveThreads,
        orders: page1.orders,
        loaded: loadedCount,
        progress: targetCount > 0 ? Math.min(100, Math.round((loadedCount / targetCount) * 100)) : (page1.rawCount < effectivePageSize ? 100 : 1),
        warehouseName: WMS_WAREHOUSE_MAP[effectiveWarehouseId] || `Kho ${effectiveWarehouseId}`
      });

      // Stop after page 1 ONLY if YunWMS itself has no more records (rawCount < effectivePageSize),
      // or if user had an explicit limit and we already met it.
      // (NEVER stop just because filtered orders count is less than pageSize!)
      const wmsHasMorePages = page1.rawCount >= effectivePageSize && (reportedTotal === 0 || reportedTotal > effectivePageSize);
      const limitReached = !isUnlimited && targetCount > 0 && loadedCount >= targetCount;

      if (!wmsHasMorePages || limitReached) {
        sendSSE({ type: "done", totalLoaded: loadedCount });
        res.end();
        return;
      }

      // 2. Dynamic Concurrent Multi-Threading Engine for Subsequent Pages
      let nextPageNumber = 2;
      let hasReachedEnd = false;
      const totalWmsPages = reportedTotal > 0 ? Math.ceil(reportedTotal / effectivePageSize) : 5000;
      const maxPagesAllowed = totalWmsPages;

      const runWorker = async (workerId: number) => {
        while (!hasReachedEnd && !isClosed) {
          if (!isUnlimited && targetCount > 0 && loadedCount >= targetCount) {
            hasReachedEnd = true;
            break;
          }

          const currentPage = nextPageNumber++;
          if (currentPage > maxPagesAllowed) {
            hasReachedEnd = true;
            break;
          }

          let pageData: any = null;
          for (let attempt = 0; attempt < 3; attempt++) {
            if (isClosed || hasReachedEnd) break;
            try {
              pageData = await fetchYunWMSOrdersList({
                userName,
                userPass,
                page: currentPage,
                pageSize: effectivePageSize,
                dateInterval,
                dateFor,
                dateTo,
                searchDateType,
                customerCode,
                orderStatus,
                warehouseId: effectiveWarehouseId,
                searchCode,
                only8623AndSpxvn: Boolean(only8623AndSpxvn),
                excludeToday: Boolean(excludeToday),
                carrierFilterMode: String(carrierFilterMode || ''),
                selectedCarriers: Array.isArray(selectedCarriers) ? selectedCarriers : [],
                customPrefixes: Array.isArray(customPrefixes) ? customPrefixes : []
              });
              if (pageData && Array.isArray(pageData.orders)) {
                break;
              }
            } catch (err: any) {
              if (attempt === 2) {
                console.error(`Worker ${workerId} failed page ${currentPage}:`, err?.message || err);
              } else {
                await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
              }
            }
          }

          if (isClosed) break;

          // If WMS returned no raw data or 0 items, WMS has no more pages
          if (!pageData || !pageData.rawCount || pageData.rawCount === 0) {
            hasReachedEnd = true;
            break;
          }

          // If WMS returned fewer raw items than effectivePageSize, this is the last page
          if (pageData.rawCount < effectivePageSize) {
            hasReachedEnd = true;
          }

          // Accumulate filtered orders if any exist on this page (do NOT abort if 0 matching orders on this page!)
          if (Array.isArray(pageData.orders) && pageData.orders.length > 0) {
            loadedCount += pageData.orders.length;
          }

          const displayTarget = (!isUnlimited && targetCount > 0) ? targetCount : (reportedTotal > 0 ? reportedTotal : loadedCount);
          const progress = maxPagesAllowed > 0 ? Math.min(100, Math.round((currentPage / maxPagesAllowed) * 100)) : 100;

          sendSSE({
            type: "chunk",
            page: currentPage,
            workerId,
            orders: pageData.orders || [],
            loaded: loadedCount,
            targetCount: displayTarget,
            progress
          });

          if (!isUnlimited && targetCount > 0 && loadedCount >= targetCount) {
            hasReachedEnd = true;
            break;
          }
        }
      };

      const activeConcurrency = Math.min(effectiveThreads, 30);
      const workers = Array.from({ length: activeConcurrency }, (_, idx) => runWorker(idx + 1));
      await Promise.all(workers);

      if (!isClosed) {
        sendSSE({ type: "done", totalLoaded: loadedCount });
        res.end();
      }
    } catch (err: any) {
      if (!isClosed) {
        sendSSE({ type: "error", error: err.message || "Lỗi trong quá trình kéo đa luồng YunWMS" });
        res.end();
      }
    }
  });

  // Single track GHN endpoint
  app.post("/api/track/ghn", async (req, res) => {
    const { orderCode, cellphone } = req.body;
    if (!orderCode) {
      res.status(400).json({ success: false, error: "Missing orderCode" });
      return;
    }
    const result = await fetchGHNLive(orderCode, cellphone);
    res.json(result);
  });

  // Track J&T Express endpoint (auto-routes 530* Cargo codes to Cargo API)
  app.post("/api/track/jnt", async (req, res) => {
    const { billCode, billCodes, cellphone, force } = req.body;
    const rawCodes = billCodes || (typeof billCode === 'string' && billCode.includes(',') ? billCode.split(',') : [billCode]);
    const codes = (Array.isArray(rawCodes) ? rawCodes : [rawCodes]).map((c: any) => String(c).trim()).filter(Boolean);
    if (codes.length === 0) {
      res.status(400).json({ success: false, error: "Missing billCode or billCodes" });
      return;
    }
    const isForce = Boolean(force);
    // Separate Cargo codes (530*) from Express codes
    const cargoCodes = codes.filter((c: string) => /^530\d+$/.test(c) || /^53\d{9,11}$/.test(c));
    const expressCodes = codes.filter((c: string) => !cargoCodes.includes(c));

    if (cargoCodes.length > 0 && expressCodes.length === 0) {
      // All cargo codes
      if (cargoCodes.length === 1) {
        const result = await fetchJNTCargoLive(cargoCodes[0], isForce);
        res.json(result);
      } else {
        const results = await fetchJNTCargoBatchLive(cargoCodes, isForce);
        res.json({ success: true, results });
      }
    } else if (expressCodes.length > 0 && cargoCodes.length === 0) {
      // All express codes
      if (expressCodes.length === 1 && (!billCodes || billCodes.length === 1)) {
        const result = await fetchJNTLive(expressCodes[0], cellphone);
        res.json(result);
      } else {
        const results = await fetchJNTBatchLive(expressCodes, cellphone, isForce);
        res.json({ success: true, results });
      }
    } else {
      // Mixed: cargo + express
      const [cargoResults, expressResults] = await Promise.all([
        fetchJNTCargoBatchLive(cargoCodes, isForce),
        fetchJNTBatchLive(expressCodes, cellphone, isForce)
      ]);
      res.json({ success: true, results: { ...cargoResults, ...expressResults } });
    }
  });

  // Dedicated J&T Cargo tracking endpoint
  app.post("/api/track/jnt-cargo", async (req, res) => {
    const { billCode, billCodes, force } = req.body;
    const rawCodes = billCodes || (typeof billCode === 'string' && billCode.includes(',') ? billCode.split(',') : [billCode]);
    const codes = (Array.isArray(rawCodes) ? rawCodes : [rawCodes]).map((c: any) => String(c).trim()).filter(Boolean);
    if (codes.length === 0) {
      res.status(400).json({ success: false, error: "Missing billCode or billCodes" });
      return;
    }
    const isForce = Boolean(force);
    if (codes.length === 1 && (!billCodes || billCodes.length === 1)) {
      const result = await fetchJNTCargoLive(codes[0], isForce);
      res.json(result);
    } else {
      const results = await fetchJNTCargoBatchLive(codes, isForce);
      res.json({ success: true, results });
    }
  });

  // Single track SPX endpoint
  app.post("/api/track/spx", async (req, res) => {
    const { orderCode, force } = req.body;
    if (!orderCode) {
      res.status(400).json({ success: false, error: "Missing orderCode" });
      return;
    }
    const result = await fetchSPXLive(orderCode, Boolean(force));
    res.json(result);
  });

  // Single track Ninja Van endpoint
  app.post("/api/track/ninjavan", async (req, res) => {
    const { trackingId } = req.body;
    if (!trackingId) {
      res.status(400).json({ success: false, error: "Missing trackingId" });
      return;
    }
    const result = await fetchNinjaVanLive(trackingId);
    res.json(result);
  });

  // Single track VNPost / EMS endpoint
  app.post("/api/track/vnpost", async (req, res) => {
    const { orderCode, force } = req.body;
    if (!orderCode) {
      res.status(400).json({ success: false, error: "Missing orderCode" });
      return;
    }
    const result = await fetchVNPostLive(orderCode, Boolean(force));
    res.json(result);
  });

  // Single track Best Express endpoint
  app.post("/api/track/best", async (req, res) => {
    const { orderCode, force } = req.body;
    if (!orderCode) {
      res.status(400).json({ success: false, error: "Missing orderCode" });
      return;
    }
    const result = await fetchBestLive(orderCode, Boolean(force));
    res.json(result);
  });

  // Viettel Post Captcha endpoint
  app.get("/api/track/viettelpost/captcha", async (req, res) => {
    const capRes = await fetchViettelPostCaptcha();
    res.json(capRes);
  });

  // Viettel Post Live Tracking endpoint
  app.post("/api/track/viettelpost", async (req, res) => {
    const { orderCode, orders, force, id, captcha } = req.body;
    const codes = orders ? (Array.isArray(orders) ? orders : [orders]) : (orderCode ? [orderCode] : []);
    if (codes.length === 0) {
      res.status(400).json({ success: false, error: "Missing orderCode or orders" });
      return;
    }
    if (id && captcha) {
      const result = await queryViettelPostLive(codes, id, captcha);
      if (result.success && codes.length === 1) {
        res.json({ success: true, data: result.results[codes[0]], carrier: 'viettelpost' });
        return;
      }
      res.json(result);
      return;
    }
    const result = await fetchViettelPostLive(codes[0], Boolean(force));
    res.json(result);
  });

  // Clear tracking liveCache endpoint
  app.post("/api/track/clear-cache", (req, res) => {
    liveCache.clear();
    invalidateOrdersCache();
    res.json({ success: true, message: "Cleared live logistics cache and orders RAM cache" });
  });

  // Batch track endpoint (groups J&T in chunks of 10 for native multi-tracking, other carriers concurrent)
  app.post("/api/track/batch", async (req, res) => {
    const { orders, force } = req.body;
    if (!Array.isArray(orders)) {
      res.status(400).json({ success: false, error: "Invalid orders array" });
      return;
    }

    const isGlobalForce = Boolean(force);
    const results: Record<string, any> = {};

    // 1. Properly resolve carrier based on tracking code format first (prevents mislabelled J&T notes from breaking SPX/GHN/VNPost/BEST/VTP)
    const jtExpressItems: typeof orders = [];
    const jtCargoItems: typeof orders = [];
    const vnpostItems: typeof orders = [];
    const bestItems: typeof orders = [];
    const viettelpostItems: typeof orders = [];
    const otherItems: typeof orders = [];

    for (const item of orders) {
      const upper = (item.code || '').toUpperCase().trim();
      let resolvedCarrier = item.carrier;

      // Unambiguous tracking code formats MUST take precedence
      if (
        upper.startsWith('SPXVN') || 
        upper.startsWith('SPX') || 
        upper.startsWith('VNSPX') || 
        upper.startsWith('SPE') ||
        upper.startsWith('VNSP')
      ) {
        resolvedCarrier = 'spx';
      } else if (
        upper.startsWith('VNGH') || 
        upper.startsWith('GY') || 
        upper.startsWith('G8') || 
        upper.startsWith('GHN') ||
        upper.startsWith('NL_') ||
        (upper.length === 8 && /^[A-Z0-9]{8}$/.test(upper) && upper.startsWith('G'))
      ) {
        resolvedCarrier = 'ghn';
      } else if (
        upper.startsWith('NIVN') || 
        upper.startsWith('NLVN') || 
        upper.startsWith('NV') ||
        (upper.startsWith('SHP') && upper.length > 10)
      ) {
        resolvedCarrier = 'ninjavan';
      } else if (
        upper.startsWith('EMS') ||
        upper.startsWith('VNPOST') ||
        /^[A-Z]{2}\d{8,11}VN$/i.test(upper) ||
        /^[ECRV][A-Z0-9]{8,11}VN$/i.test(upper)
      ) {
        resolvedCarrier = 'vnpost';
      } else if (
        upper.startsWith('TTVN') ||
        upper.startsWith('BEST') ||
        upper.startsWith('VNBEST') ||
        upper.startsWith('BST') ||
        ((upper.startsWith('61') || upper.startsWith('81')) && upper.length === 12 && /^\d+$/.test(upper)) ||
        item.carrier === 'best' ||
        (item.carrierChannel && (item.carrierChannel.toUpperCase().includes('BEST') || item.carrierChannel.toUpperCase().includes('BST')))
      ) {
        resolvedCarrier = 'best';
      } else if (
        upper.startsWith('VT') || 
        upper.startsWith('VTP') || 
        upper.startsWith('SHOPEEVTP') ||
        item.carrier === 'viettelpost' ||
        (item.carrierChannel && item.carrierChannel.toUpperCase().includes('VTP'))
      ) {
        resolvedCarrier = 'viettelpost';
      } else if (
        // J&T Cargo: 530xxxxxxxxx (12-13 digit codes starting with 530)
        /^530\d+$/.test(upper) ||
        (/^53\d+$/.test(upper) && upper.length >= 11 && upper.length <= 13)
      ) {
        resolvedCarrier = 'jt_cargo';
      } else if (
        upper.startsWith('8') ||
        upper.startsWith('JT') || 
        upper.startsWith('JTE') || 
        upper.startsWith('JNT')
      ) {
        resolvedCarrier = 'jt';
      }

      item.carrier = resolvedCarrier;

      if (resolvedCarrier === 'jt_cargo') {
        jtCargoItems.push(item);
      } else if (resolvedCarrier === 'jt') {
        jtExpressItems.push(item);
      } else if (resolvedCarrier === 'vnpost') {
        vnpostItems.push(item);
      } else if (resolvedCarrier === 'best') {
        bestItems.push(item);
      } else if (resolvedCarrier === 'viettelpost') {
        viettelpostItems.push(item);
      } else {
        otherItems.push(item);
      }
    }

    // Process Viettel Post (VTP) orders in parallel
    if (viettelpostItems.length > 0) {
      await Promise.all(
        viettelpostItems.map(async (item) => {
          const itemForce = isGlobalForce || item.force;
          const vtpRes = await fetchViettelPostLive(item.code, itemForce);
          results[item.code] = vtpRes;
        })
      );
    }

    // Process J&T Cargo (530* codes) - parallel with concurrency 5
    const cargoCodes = jtCargoItems.map(o => o.code);
    const cargoResults = await fetchJNTCargoBatchLive(cargoCodes, isGlobalForce);
    for (const [code, resObj] of Object.entries(cargoResults)) {
      results[code] = resObj;
    }

    // Process VNPost / EMS in parallel
    const vnpostCodes = vnpostItems.map(o => o.code);
    const vnpostResults = await fetchVNPostBatchLive(vnpostCodes, isGlobalForce);
    for (const [code, resObj] of Object.entries(vnpostResults)) {
      results[code] = resObj;
    }

    // Process Best Express in parallel
    const bestCodes = bestItems.map(o => o.code);
    const bestResults = await fetchBestBatchLive(bestCodes, isGlobalForce);
    for (const [code, resObj] of Object.entries(bestResults)) {
      results[code] = resObj;
    }

    // Process J&T Express in chunks of up to 10 codes (1 HTTP call per 10 codes)
    const JT_CHUNK_SIZE = 10;
    const jtChunks: (typeof jtExpressItems)[] = [];
    for (let i = 0; i < jtExpressItems.length; i += JT_CHUNK_SIZE) {
      jtChunks.push(jtExpressItems.slice(i, i + JT_CHUNK_SIZE));
    }
    await Promise.all(
      jtChunks.map(async (jtChunk) => {
        const codes = jtChunk.map(o => o.code);
        const phone = jtChunk.find(o => o.cellphone)?.cellphone;
        const batchRes = await fetchJNTBatchLive(codes, phone, isGlobalForce);
        for (const [code, resObj] of Object.entries(batchRes)) {
          results[code] = resObj;
        }
      })
    );

    // Process other carriers in parallel with concurrency
    const concurrency = 25;
    for (let i = 0; i < otherItems.length; i += concurrency) {
      const chunk = otherItems.slice(i, i + concurrency);
      await Promise.all(
        chunk.map(async (item) => {
          const upper = (item.code || '').toUpperCase().trim();
          const itemForce = Boolean(isGlobalForce || item.force);
          if (item.carrier === 'spx' || upper.startsWith('SPX') || upper.startsWith('VNSPX') || upper.startsWith('SPE') || upper.startsWith('VNSP')) {
            const spxRes = await fetchSPXLive(item.code, itemForce);
            results[item.code] = spxRes;
          } else if (
            item.carrier === 'ghn' || 
            upper.startsWith('VNGH') || 
            upper.startsWith('GY') || 
            upper.startsWith('G8') || 
            upper.startsWith('GHN') ||
            upper.startsWith('NL_') ||
            (upper.length === 8 && /^[A-Z0-9]{8}$/.test(upper) && upper.startsWith('G'))
          ) {
            const ghnRes = await fetchGHNLive(item.code, item.cellphone, itemForce);
            results[item.code] = ghnRes;
          } else if (item.carrier === 'ninjavan' || upper.startsWith('NIVN') || upper.startsWith('SHP')) {
            const nvRes = await fetchNinjaVanLive(item.code);
            results[item.code] = nvRes;
          } else if (
            item.carrier === 'vnpost' ||
            upper.startsWith('EMS') ||
            upper.startsWith('VNPOST') ||
            /^[A-Z]{2}\d{8,11}VN$/i.test(upper) ||
            /^[ECRV][A-Z0-9]{8,11}VN$/i.test(upper)
          ) {
            const vnpostRes = await fetchVNPostLive(item.code, itemForce);
            results[item.code] = vnpostRes;
          } else if (
            item.carrier === 'best' ||
            upper.startsWith('TTVN') ||
            upper.startsWith('BEST') ||
            upper.startsWith('VNBEST') ||
            upper.startsWith('BST') ||
            ((upper.startsWith('61') || upper.startsWith('81')) && upper.length === 12 && /^\d+$/.test(upper))
          ) {
            const bestRes = await fetchBestLive(item.code, itemForce);
            results[item.code] = bestRes;
          } else if (
            item.carrier === 'viettelpost' ||
            upper.startsWith('VT') ||
            upper.startsWith('VTP') ||
            upper.startsWith('SHOPEEVTP')
          ) {
            const vtpRes = await fetchViettelPostLive(item.code, itemForce);
            results[item.code] = vtpRes;
          } else {
            results[item.code] = {
              success: false,
              error: `Chưa có API tra cứu tự động cho hãng ${item.carrier || 'này'}`
            };
          }
        })
      );
    }

    res.json({ success: true, results });
  });

  // Vite middleware for development vs Production static serving
  const distPath = path.join(process.cwd(), "dist");
  const hasDist = fs.existsSync(path.join(distPath, "index.html"));
  const isProduction = process.env.NODE_ENV === "production" || hasDist;

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        watch: {
          ignored: [
            "**/data/**",
            "**/*.sqlite*",
            "**/*.sqlite-wal*",
            "**/*.sqlite-shm*",
            "**/*.json",
            "**/batch_results*"
          ]
        }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
