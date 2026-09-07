import { IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import { fetchWmsOrders, getWmsSessionCookie, pollLatestWmsOrders } from '../services/wmsService';
import { fetchGHNLive, fetchJNTLive, fetchJNTBatchLive, fetchSPXLive, fetchNinjaVanLive } from './trackingBackend';

// Helper parse JSON body (tương thích cả Vite dev server lẫn Express body-parser)
function parseJsonBody(req: any): Promise<any> {
  // Nếu Express đã parse sẵn body thành object
  if (req.body && typeof req.body === 'object') {
    return Promise.resolve(req.body);
  }
  // Nếu stream đã kết thúc
  if (req.readableEnded || req._body) {
    return Promise.resolve(req.body || {});
  }

  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : (req.body || {}));
      } catch (e) {
        resolve(req.body || {});
      }
    });

    // An toàn tuyệt đối: Timeout 2 giây tự động trả về req.body nếu stream không phát ra sự kiện end
    setTimeout(() => {
      resolve(req.body || {});
    }, 2000);
  });
}

function sendJson(res: ServerResponse, status: number, data: any) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

export function handleWmsApi(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const parsedUrl = parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '';

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  // 1. Endpoint kiểm tra kết nối & session
  if (pathname === '/api/wms/status') {
    getWmsSessionCookie('David', '12345abc')
      .then(() => {
        sendJson(res, 200, {
          success: true,
          connected: true,
          message: 'Kết nối YunWMS (czwh.wms.yunwms.com) sẵn sàng'
        });
      })
      .catch((err) => {
        sendJson(res, 200, {
          success: false,
          connected: false,
          message: err?.message || 'Không thể kết nối YunWMS'
        });
      });
    return;
  }

  // 2. Endpoint lấy danh sách đơn hàng
  if (pathname === '/api/wms/orders' && (req.method === 'POST' || req.method === 'GET')) {
    const handleOrders = async () => {
      let options: any = {};
      if (req.method === 'POST') {
        options = await parseJsonBody(req);
      } else {
        options = parsedUrl.query;
      }

      const warehouse = String(options.warehouse ?? '7'); // 7 = VN02
      const status = String(options.status ?? '4');       // 4 = Submitted
      const pageSize = Math.min(1000, Math.max(10, parseInt(String(options.pageSize || 500), 10)));
      const maxPages = parseInt(String(options.maxPages || 0), 10);
      const username = String(options.username || 'David');
      const password = String(options.password || '12345abc');

      const result = await fetchWmsOrders({
        warehouse,
        status,
        pageSize,
        maxPages,
        username,
        password,
        skuGroups: options.skuGroups
      });

      sendJson(res, 200, result);
    };

    handleOrders().catch((err) => {
      sendJson(res, 500, {
        success: false,
        message: err?.message || 'Lỗi xử lý khi lấy đơn từ YunWMS'
      });
    });
    return;
  }

  // 3. Endpoint Bắt Đơn Mới Thời Gian Thực (Real-Time Polling siêu tốc)
  if (pathname === '/api/wms/poll-new' && (req.method === 'POST' || req.method === 'GET')) {
    const handlePollNew = async () => {
      let options: any = {};
      if (req.method === 'POST') {
        options = await parseJsonBody(req);
      } else {
        options = parsedUrl.query;
      }

      const knownOrderNos: string[] = Array.isArray(options.knownOrderNos) ? options.knownOrderNos : [];
      const warehouse = String(options.warehouse ?? '7');
      const status = String(options.status ?? '4');
      const username = String(options.username || 'David');
      const password = String(options.password || '12345abc');

      const result = await pollLatestWmsOrders(knownOrderNos, {
        warehouse,
        status,
        username,
        password,
        skuGroups: options.skuGroups
      });

      sendJson(res, 200, result);
    };

    handlePollNew().catch((err) => {
      sendJson(res, 500, {
        success: false,
        message: err?.message || 'Lỗi polling đơn mới WMS'
      });
    });
    return;
  }

  // 4. Endpoint SSE Stream tiến độ thời gian thực
  if (pathname === '/api/wms/sync-stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const sendSse = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const warehouse = String(parsedUrl.query.warehouse ?? '7');
    const status = String(parsedUrl.query.status ?? '4');
    const pageSize = Math.min(1000, Math.max(10, parseInt(String(parsedUrl.query.pageSize || 500), 10)));
    const maxPages = parseInt(String(parsedUrl.query.maxPages || 0), 10);
    const username = String(parsedUrl.query.username || 'David');
    const password = String(parsedUrl.query.password || '12345abc');

    sendSse('start', { message: 'Đang kết nối tới YunWMS...' });

    fetchWmsOrders({
      warehouse,
      status,
      pageSize,
      maxPages,
      username,
      password,
    }, (progress) => {
      sendSse('progress', progress);
    })
      .then((result) => {
        sendSse('complete', result);
        res.end();
      })
      .catch((err) => {
        sendSse('error', { message: err?.message || 'Lỗi kéo đơn WMS' });
        res.end();
      });

    return;
  }

  // 5. Tracking API Proxy Routes
  if (pathname === '/api/track/ghn' && req.method === 'POST') {
    parseJsonBody(req).then(async (body) => {
      const { orderCode, cellphone } = body;
      if (!orderCode) {
        sendJson(res, 400, { success: false, error: 'Missing orderCode' });
        return;
      }
      const result = await fetchGHNLive(orderCode, cellphone);
      sendJson(res, 200, result);
    }).catch(err => sendJson(res, 500, { success: false, error: err.message }));
    return;
  }

  if (pathname === '/api/track/jnt' && req.method === 'POST') {
    parseJsonBody(req).then(async (body) => {
      const { billCode, billCodes, cellphone } = body;
      const rawCodes = billCodes || (typeof billCode === 'string' && billCode.includes(',') ? billCode.split(',') : [billCode]);
      const codes = (Array.isArray(rawCodes) ? rawCodes : [rawCodes]).map((c: any) => String(c).trim()).filter(Boolean);
      if (codes.length === 0) {
        sendJson(res, 400, { success: false, error: 'Missing billCode or billCodes' });
        return;
      }
      if (codes.length === 1 && (!billCodes || billCodes.length === 1)) {
        const result = await fetchJNTLive(codes[0], cellphone);
        sendJson(res, 200, result);
      } else {
        const results = await fetchJNTBatchLive(codes, cellphone);
        sendJson(res, 200, { success: true, results });
      }
    }).catch(err => sendJson(res, 500, { success: false, error: err.message }));
    return;
  }

  if (pathname === '/api/track/spx' && req.method === 'POST') {
    parseJsonBody(req).then(async (body) => {
      const { orderCode, force } = body;
      if (!orderCode) {
        sendJson(res, 400, { success: false, error: 'Missing orderCode' });
        return;
      }
      const result = await fetchSPXLive(orderCode, Boolean(force));
      sendJson(res, 200, result);
    }).catch(err => sendJson(res, 500, { success: false, error: err.message }));
    return;
  }

  if (pathname === '/api/track/ninjavan' && req.method === 'POST') {
    parseJsonBody(req).then(async (body) => {
      const { trackingId } = body;
      if (!trackingId) {
        sendJson(res, 400, { success: false, error: 'Missing trackingId' });
        return;
      }
      const result = await fetchNinjaVanLive(trackingId);
      sendJson(res, 200, result);
    }).catch(err => sendJson(res, 500, { success: false, error: err.message }));
    return;
  }

  if (pathname === '/api/track/batch' && req.method === 'POST') {
    parseJsonBody(req).then(async (body) => {
      const { orders } = body;
      if (!Array.isArray(orders)) {
        sendJson(res, 400, { success: false, error: 'Invalid orders array' });
        return;
      }

      const results: Record<string, any> = {};
      const jtItems: typeof orders = [];
      const otherItems: typeof orders = [];

      for (const item of orders) {
        const upper = (item.code || '').toUpperCase().trim();
        let resolvedCarrier = item.carrier;

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
          upper.startsWith('JT') || 
          upper.startsWith('JTE') || 
          upper.startsWith('JNT') || 
          upper.startsWith('530') || 
          ((upper.startsWith('86') || upper.startsWith('84') || upper.startsWith('53')) && upper.length === 12 && /^\d+$/.test(upper)) ||
          /^\d{12}$/.test(upper)
        ) {
          resolvedCarrier = 'jt';
        }

        item.carrier = resolvedCarrier;

        if (resolvedCarrier === 'jt') {
          jtItems.push(item);
        } else {
          otherItems.push(item);
        }
      }

      // Process J&T in batch chunks of 10
      const JT_CHUNK_SIZE = 10;
      const jtChunks: (typeof jtItems)[] = [];
      for (let i = 0; i < jtItems.length; i += JT_CHUNK_SIZE) {
        jtChunks.push(jtItems.slice(i, i + JT_CHUNK_SIZE));
      }
      await Promise.all(
        jtChunks.map(async (jtChunk) => {
          const codes = jtChunk.map(o => o.code);
          const phone = jtChunk.find(o => o.cellphone)?.cellphone;
          const batchRes = await fetchJNTBatchLive(codes, phone);
          for (const [code, resObj] of Object.entries(batchRes)) {
            results[code] = resObj;
          }
        })
      );

      // Process other carriers in parallel
      const concurrency = 20;
      for (let i = 0; i < otherItems.length; i += concurrency) {
        const chunk = otherItems.slice(i, i + concurrency);
        await Promise.all(
          chunk.map(async (item) => {
            const upper = (item.code || '').toUpperCase().trim();
            if (item.carrier === 'spx' || upper.startsWith('SPX') || upper.startsWith('VNSPX') || upper.startsWith('SPE')) {
              results[item.code] = await fetchSPXLive(item.code);
            } else if (
              item.carrier === 'ghn' || 
              upper.startsWith('VNGH') || 
              upper.startsWith('GY') || 
              upper.startsWith('G8') || 
              upper.startsWith('GHN') ||
              (upper.length === 8 && upper.startsWith('G'))
            ) {
              results[item.code] = await fetchGHNLive(item.code, item.cellphone);
            } else if (item.carrier === 'ninjavan' || upper.startsWith('NIVN') || upper.startsWith('SHP')) {
              results[item.code] = await fetchNinjaVanLive(item.code);
            } else {
              results[item.code] = {
                success: false,
                error: `Chưa có API tra cứu tự động cho hãng ${item.carrier || 'này'}`
              };
            }
          })
        );
      }

      sendJson(res, 200, { success: true, results });
    }).catch(err => sendJson(res, 500, { success: false, error: err.message }));
    return;
  }

  next();
}

