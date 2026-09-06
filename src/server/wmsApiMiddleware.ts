import { IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import { fetchWmsOrders, getWmsSessionCookie, pollLatestWmsOrders } from '../services/wmsService';

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

  next();
}
