import crypto from 'crypto';

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

function mapGHNStatus(ghnStatus: string, rawStatusName: string) {
  const s = (ghnStatus || '').toLowerCase().trim();
  const name = (rawStatusName || '').toLowerCase().trim();

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

  if (
    s === 'ready_to_pick' || 
    s === 'picking' ||
    name.includes('chờ lấy hàng') || 
    name.includes('chưa lấy') ||
    name.includes('đang đến lấy') ||
    name.includes('chờ ghn lấy')
  ) {
    return {
      category: 'not_scanned',
      label: rawStatusName || 'Chờ lấy hàng (Chưa scan)',
      isScanned: false
    };
  }

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

  if (
    s === 'delivery_fail' || 
    s === 'damage' || 
    s === 'lost' || 
    s === 'exception' ||
    name.includes('thất lạc') || 
    name.includes('hư hỏng') || 
    name.includes('không thành công') ||
    name.includes('thất bại') ||
    name.includes('sự cố')
  ) {
    return {
      category: 'error',
      label: rawStatusName || 'Sự cố vận chuyển',
      isScanned: true
    };
  }

  return {
    category: 'scanned',
    label: rawStatusName || 'Đã scan xử lý',
    isScanned: true
  };
}

function mapJNTStatus(topText: string, hasPickupScan: boolean = false) {
  const t = (topText || '').toLowerCase();

  if (t.includes('chuyển hoàn') || t.includes('trả hàng') || t.includes('hoàn hàng') || t.includes('đang hoàn')) {
    return {
      category: 'returned',
      label: topText || 'Chuyển hoàn J&T',
      isScanned: true
    };
  }

  if (t.includes('đã ký nhận') || t.includes('ký nhận') || t.includes('giao hàng thành công') || t.includes('giao thành công')) {
    return {
      category: 'delivered',
      label: topText || 'Giao hàng thành công (Đã ký nhận)',
      isScanned: true
    };
  }

  if (t.includes('hủy') || t.includes('huỷ')) {
    return {
      category: 'cancelled',
      label: topText || 'Đã hủy phiếu gửi J&T',
      isScanned: false
    };
  }

  if (t.includes('kiện vấn đề') || t.includes('kiện khó') || t.includes('vấn đề')) {
    if (hasPickupScan) {
      return {
        category: 'error',
        label: topText || 'Sự cố vận chuyển / Kiện vấn đề',
        isScanned: true
      };
    } else {
      return {
        category: 'not_scanned',
        label: topText || 'Chưa lấy hàng (Kiện vấn đề lấy hàng / Kiện khó)',
        isScanned: false
      };
    }
  }

  if (t.includes('chờ lấy') || t.includes('chưa lấy') || t.includes('tạo đơn') || t.includes('tạo phiếu gửi') || t.includes('chờ nhận')) {
    return {
      category: 'not_scanned',
      label: topText || 'Chờ J&T lấy hàng (Chưa scan)',
      isScanned: false
    };
  }

  if (t.includes('đang giao hàng') || t.includes('đang phát') || t.includes('sẵn sàng giao')) {
    return {
      category: 'in_transit',
      label: topText || 'Đang giao hàng',
      isScanned: true
    };
  }

  if (t.includes('đang chuyển hàng đến') || t.includes('đã được chuyển đến') || t.includes('ttkt') || t.includes('kho trung chuyển') || t.includes('đgp')) {
    return {
      category: 'in_transit',
      label: topText || 'Đang trung chuyển',
      isScanned: true
    };
  }

  if (
    t.includes('đã nhận hàng') || 
    t.includes('nhận kiện hàng') || 
    t.includes('nhập bưu cục') || 
    t.includes('lấy hàng thành công') ||
    t.includes('đã lấy hàng') ||
    t.includes('tiếp nhận')
  ) {
    return {
      category: 'scanned',
      label: topText || 'Đã lấy hàng & nhập bưu cục J&T',
      isScanned: true
    };
  }

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

const liveCache = new Map<string, { data: any; expiresAt: number }>();

function getFromCache(key: string) {
  const item = liveCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    liveCache.delete(key);
    return null;
  }
  if (item.data) {
    const raw = (item.data.rawStatusText || '').toLowerCase();
    if ((raw.includes('kiện vấn đề') || raw.includes('kiện khó')) && !item.data.scannedAt && item.data.statusCategory === 'scanned') {
      item.data.statusCategory = 'not_scanned';
    }
  }
  return item.data;
}

function setInCache(key: string, data: any, ttlMs: number = 7200000) {
  liveCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

let ghnLastReqTime = 0;
let jtLastReqTime = 0;

async function throttleGHN() {
  const now = Date.now();
  const minInterval = 20;
  const elapsed = now - ghnLastReqTime;
  if (elapsed < minInterval) {
    await new Promise(r => setTimeout(r, minInterval - elapsed));
  }
  ghnLastReqTime = Date.now();
}

async function throttleJT() {
  const now = Date.now();
  const minInterval = 100;
  const elapsed = now - jtLastReqTime;
  if (elapsed < minInterval) {
    await new Promise(r => setTimeout(r, minInterval - elapsed));
  }
  jtLastReqTime = Date.now();
}

function formatDate(input?: string | number | Date, includeSeconds: boolean = true): string {
  if (!input) return '';
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return '';
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

function parseJNTMultiHtml(html: string, expectedCodes: string[]): Record<string, { items: { time: string; text: string }[] }> {
  const results: Record<string, { items: { time: string; text: string }[] }> = {};

  for (const code of expectedCodes) {
    const cleanCode = code.trim().toUpperCase();
    results[cleanCode] = { items: [] };

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

export async function fetchJNTBatchLive(
  billCodes: string[], 
  cellphone?: string
): Promise<Record<string, { success: boolean; data?: any; error?: string; carrier?: string }>> {
  const cleanCodes = Array.from(new Set(billCodes.map(c => (c || '').trim().toUpperCase()).filter(Boolean)));
  if (cleanCodes.length === 0) return {};

  const cleanPhone = cellphone ? cellphone.replace(/\D/g, '').slice(-4) : '';
  const results: Record<string, { success: boolean; data?: any; error?: string; carrier?: string }> = {};
  const uncachedCodes: string[] = [];

  for (const code of cleanCodes) {
    const candidateKeys = [
      cleanPhone ? `jnt:${code}:${cleanPhone}` : '',
      `jnt:${code}:8836`,
      `jnt:${code}:8036`,
      `jnt:${code}:default`
    ].filter(Boolean);

    let cachedData = null;
    for (const key of candidateKeys) {
      const cached = getFromCache(key);
      if (cached) {
        cachedData = cached;
        break;
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

  const phonesToTry: string[] = [];
  if (cleanPhone) {
    phonesToTry.push(cleanPhone);
    if (cleanPhone !== '8836') phonesToTry.push('8836');
  } else {
    phonesToTry.push('8836');
  }

  const BATCH_SIZE = 10;
  for (let i = 0; i < uncachedCodes.length; i += BATCH_SIZE) {
    const batch = uncachedCodes.slice(i, i + BATCH_SIZE);
    let remainingInBatch = [...batch];

    for (const phone of phonesToTry) {
      if (remainingInBatch.length === 0) break;

      const targetUrl = `https://jtexpress.vn/vi/tracking?type=track&billcode=${encodeURIComponent(remainingInBatch.join(','))}${phone ? `&cellphone=${encodeURIComponent(phone)}` : ''}`;

      let html = '';
      try {
        await throttleJT();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(targetUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
            "Referer": "https://jtexpress.vn/vi/tracking"
          }
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          html = await response.text();
        } else if (response.status === 429) {
          await new Promise(r => setTimeout(r, 500));
        }
      } catch {
        // Continue to proxy fallback
      }

      if (!html) {
        try {
          const proxyController = new AbortController();
          const pTimeout = setTimeout(() => proxyController.abort(), 4500);
          const proxyRes = await fetch(`https://proxy.cors.sh/${targetUrl}`, {
            signal: proxyController.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
            }
          });
          clearTimeout(pTimeout);
          if (proxyRes.ok) {
            html = await proxyRes.text();
          }
        } catch {
          // Fallthrough
        }
      }

      if (html) {
        const parsedBatch = parseJNTMultiHtml(html, remainingInBatch);
        const resolvedCodes: string[] = [];

        for (const code of remainingInBatch) {
          const parsed = parsedBatch[code];
          if (parsed && parsed.items.length > 0) {
            const topItem = parsed.items[0];

            const pickupItem = parsed.items.slice().reverse().find(item => {
              const txt = item.text.toLowerCase();
              const isIssue = txt.includes('kiện vấn đề') || 
                              txt.includes('kiện khó') || 
                              txt.includes('vấn đề') || 
                              txt.includes('tạo đơn') || 
                              txt.includes('khởi tạo') ||
                              txt.includes('chuẩn bị');
              if (isIssue) return false;

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

            const CACHE_TTL_MS = 300000;
            if (phone) setInCache(`jnt:${code}:${phone}`, resultData, CACHE_TTL_MS);
            setInCache(`jnt:${code}:default`, resultData, CACHE_TTL_MS);

            results[code] = { success: true, data: resultData };
            resolvedCodes.push(code);
          }
        }

        remainingInBatch = remainingInBatch.filter(c => !resolvedCodes.includes(c));
      }
    }

    for (const code of remainingInBatch) {
      const isCargo = code.startsWith('530') || code.startsWith('53');
      results[code] = {
        success: false,
        carrier: 'jt',
        error: isCargo 
          ? "Chưa có dữ liệu hành trình trên hệ thống J&T Cargo"
          : "Không tìm thấy dữ liệu trên cổng J&T Express"
      };
    }
  }

  return results;
}

export async function fetchJNTLive(billCode: string, cellphone?: string): Promise<{ success: boolean; data?: any; error?: string; carrier?: string }> {
  const cleanBillCode = billCode.trim().toUpperCase();
  const batchRes = await fetchJNTBatchLive([cleanBillCode], cellphone);
  return batchRes[cleanBillCode] || {
    success: false,
    carrier: 'jt',
    error: "Không tìm thấy dữ liệu trên cổng J&T Express"
  };
}

export async function fetchGHNLive(orderCode: string, cellphone?: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const cleanCode = orderCode.trim().toUpperCase();
  const cleanPhone = (cellphone || '').replace(/\D/g, '').slice(-4);
  const cacheKey = `ghn:${cleanCode}:${cleanPhone}`;
  const cached = getFromCache(cacheKey);
  if (cached) {
    return { success: true, data: cached };
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

        setInCache(cacheKey, resultData, 7200000);

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
                description: 'Bưu kiện đã được ghi nhận trên hệ thống GHN.'
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

function signSPXTracking(trackingNumber: string) {
  const ts = Math.floor(Date.now() / 1000);
  const secret = "MGViZmZmZTYzZDJhNDgxY2Y1N2ZlN2Q1ZWJkYzlmZDY=";
  const hash = crypto.createHash("sha256").update(`${trackingNumber}${ts}${secret}`).digest("hex");
  return `${trackingNumber}|${ts}${hash}`;
}

export async function fetchSPXLive(orderCode: string, force: boolean = false): Promise<{ success: boolean; data?: any; error?: string }> {
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
      let recipientName = '';
      let fleetData: any = null;

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
            recipientName = info.receiver_name || '';
            if (Array.isArray(info.records) && info.records.length > 0) {
              records = info.records;
            }
          }
        }
      } catch {
        // Fallthrough
      }

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
      } catch {
        // Fallthrough
      }

      const trackingList = Array.isArray(fleetData?.tracking_list) ? fleetData.tracking_list : [];
      const currentStatus = fleetData?.current_status || '';

      if (records.length === 0 && trackingList.length === 0 && !currentStatus) {
        return {
          success: false,
          error: "Không tìm thấy dữ liệu vận đơn trên cổng SPX Express (spx.vn)"
        };
      }

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

      const hasCancelled = currentStatus === 'Cancelled' || 
                           latestCode === 'C001' ||
                           latestDesc.includes('hủy') || 
                           latestDesc.includes('huỷ') ||
                           trackingList.some((t: any) => t.status === 'Cancelled' || t.message?.toLowerCase().includes('hủy') || t.message?.toLowerCase().includes('huỷ'));

      const hasReturned = currentStatus === 'Returned' || 
                          ['F997', 'F671', 'F999'].includes(latestCode) ||
                          latestDesc.includes('hoàn') || 
                          latestDesc.includes('trả hàng') ||
                          trackingList.some((t: any) => t.status === 'Returned' || t.message?.toLowerCase().includes('hoàn') || t.message?.toLowerCase().includes('trả hàng'));

      const isDeliveringOrTransit = ['Delivering', 'Courier Delivery', 'Assigned', 'Transporting', 'Pending', 'Sorting', 'LMHub_Receive_Done', 'SOC_Receive_Done', 'Hub_Inbound_Done'].includes(currentStatus) ||
                                   ['F650', 'F699', 'F700', 'F800', 'F850'].includes(latestCode) ||
                                   latestDesc.includes('đang giao') || 
                                   latestDesc.includes('đang phát') || 
                                   latestDesc.includes('phân loại') || 
                                   latestDesc.includes('phân tuyến') || 
                                   latestDesc.includes('luân chuyển') || 
                                   latestDesc.includes('đến kho') ||
                                   trackingList.some((t: any) => {
                                     const m = (t.message || '').toLowerCase();
                                     return m.includes('đang giao') || m.includes('đang phát') || m.includes('phân loại') || m.includes('phân tuyến') || m.includes('luân chuyển') || m.includes('đến kho');
                                   });

      const hasPickedUp = ['FMHub_Pickup_Done', 'Picked Up', 'Pending_Receive', 'Pickup_Done', 'Pickup_Success', 'FMHub_Pickup'].includes(currentStatus) ||
                          ['F100', 'F001', 'F050'].includes(latestCode) ||
                          currentStatus.toLowerCase().includes('pickup') ||
                          currentStatus.toLowerCase().includes('picked') ||
                          latestDesc.includes('đã lấy hàng') || 
                          latestDesc.includes('đã nhận') || 
                          latestDesc.includes('tiếp nhận') || 
                          latestDesc.includes('picked') ||
                          trackingList.some((t: any) => {
                            const m = (t.message || '').toLowerCase();
                            return t.status !== 'Created' && (m.includes('đã lấy hàng') || m.includes('đã nhận') || m.includes('tiếp nhận') || m.includes('picked'));
                          });

      let pickTime: string | undefined = undefined;
      const pickupRecord = records.slice().reverse().find((r: any) => !['F000', 'A000'].includes(r.tracking_code) && r.actual_time);
      if (pickupRecord?.actual_time) {
        pickTime = formatDate(pickupRecord.actual_time);
      } else {
        const pickEvent = trackingList.slice().reverse().find((t: any) => t.status !== 'Created' && t.timestamp);
        if (pickEvent?.timestamp) {
          pickTime = formatDate(pickEvent.timestamp);
        }
      }

      let statusCategory = 'not_scanned';
      let rawStatusText = timeline[0]?.statusText || 'Người bán đang chuẩn bị hàng';
      let statusDetail = 'Đơn hàng mới tạo mã vận đơn trên Shopee';
      let scannedAt: string | undefined = undefined;

      if (hasDelivered) {
        statusCategory = 'delivered';
        rawStatusText = timeline[0]?.statusText || 'Giao hàng thành công (SPX)';
        statusDetail = 'Bưu kiện đã được phát thành công tới người nhận';
        scannedAt = pickTime;
      } else if (hasCancelled) {
        statusCategory = 'cancelled';
        rawStatusText = 'Đơn hàng đã hủy';
        statusDetail = 'Đơn hàng đã bị hủy trên hệ thống Shopee';
      } else if (hasReturned) {
        statusCategory = 'returned';
        rawStatusText = timeline[0]?.statusText || 'Chuyển hoàn đơn hàng SPX';
        statusDetail = 'Bưu kiện đang trong quá trình chuyển hoàn';
        scannedAt = pickTime;
      } else if (isDeliveringOrTransit) {
        statusCategory = 'in_transit';
        rawStatusText = timeline[0]?.statusText || 'Đang vận chuyển qua hệ thống SPX';
        statusDetail = 'Bưu kiện đang luân chuyển qua mạng lưới SPX';
        scannedAt = pickTime;
      } else if (hasPickedUp) {
        statusCategory = 'scanned';
        rawStatusText = timeline[0]?.statusText || 'Đã lấy hàng - SPX đã nhận kiện';
        statusDetail = 'SPX đã lấy hàng và quét mã thành công';
        scannedAt = pickTime;
      } else {
        statusCategory = 'not_scanned';
        rawStatusText = timeline[0]?.statusText || 'Người bán đang chuẩn bị hàng';
        statusDetail = 'Đơn hàng mới tạo, SPX chưa tới lấy';
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

      setInCache(cacheKey, resultData, 7200000);
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

export async function fetchNinjaVanLive(trackingId: string): Promise<{ success: boolean; data?: any; error?: string }> {
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
        updatedAt: timeline[0]?.time,
        timeline
      };

      setInCache(cacheKey, resultData, 7200000);
      return {
        success: true,
        data: resultData
      };
    }

    return {
      success: false,
      error: "Không tìm thấy thông tin đơn trên cổng Ninja Van"
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Lỗi kết nối cổng Ninja Van"
    };
  }
}
