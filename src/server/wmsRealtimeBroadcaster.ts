import { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import { getWmsSessionCookie, httpsRequest } from '../services/wmsService';

interface ClientConnection {
  id: string;
  res: ServerResponse;
  warehouse: string;
}

interface PulseStatusResult {
  total: number;
  topOrder: string;
}

class WmsRealtimeBroadcaster {
  private clients: Set<ClientConnection> = new Set();
  private pulseTimer: any = null;
  private isChecking = false;
  private lastCounts: Record<string, number> = { '4': 0, '5': 0 };
  private lastTops: Record<string, string> = { '4': '', '5': '' };

  public addClient(req: IncomingMessage, res: ServerResponse, warehouse = '7') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    });

    const client: ClientConnection = {
      id: Math.random().toString(36).substring(2, 9),
      res,
      warehouse,
    };

    this.clients.add(client);

    // Gửi ngay trạng thái khởi tạo
    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.sendToClient(client, 'init', {
      connected: true,
      protocol: 'SSE_REALTIME',
      counts: this.lastCounts,
      timestamp: nowStr,
    });

    // Bắt đầu background pulse nếu có client
    if (this.clients.size === 1) {
      this.startPulseLoop();
    }

    req.on('close', () => {
      this.clients.delete(client);
      if (this.clients.size === 0) {
        this.stopPulseLoop();
      }
    });
  }

  private sendToClient(client: ClientConnection, event: string, data: any) {
    try {
      client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      this.clients.delete(client);
    }
  }

  public broadcast(event: string, data: any) {
    for (const client of this.clients) {
      this.sendToClient(client, event, data);
    }
  }

  private startPulseLoop() {
    if (this.pulseTimer) return;
    this.checkPulseNow();
    // Quét thời gian thực mỗi 2 giây
    this.pulseTimer = setInterval(() => {
      this.checkPulseNow();
    }, 2000);
  }

  private stopPulseLoop() {
    if (this.pulseTimer) {
      clearInterval(this.pulseTimer);
      this.pulseTimer = null;
    }
  }

  private async checkStatusQuick(cookie: string, warehouse: string, status: string): Promise<PulseStatusResult> {
    const postData = `E4=${encodeURIComponent(warehouse)}&E11=${encodeURIComponent(status)}`;
    const res = await httpsRequest({
      hostname: 'czwh.wms.yunwms.com',
      path: '/order/orders/list/page/1/pageSize/15',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://czwh.wms.yunwms.com/order/orders/list',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, postData);

    try {
      const data = JSON.parse(res.body);
      const total = parseInt(String(data.total || 0), 10);
      const topOrder = data.data?.[0]?.E1 || data.data?.[0]?.E17 || '';
      return { total, topOrder };
    } catch {
      return { total: 0, topOrder: '' };
    }
  }

  private async checkPulseNow() {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      const cookie = await getWmsSessionCookie('David', '12345abc');
      const [res4, res5] = await Promise.all([
        this.checkStatusQuick(cookie, '7', '4'),
        this.checkStatusQuick(cookie, '7', '5')
      ]);

      const count4Changed = res4.total > 0 && res4.total !== this.lastCounts['4'];
      const top4Changed = Boolean(res4.topOrder && res4.topOrder !== this.lastTops['4']);

      const count5Changed = res5.total > 0 && res5.total !== this.lastCounts['5'];
      const top5Changed = Boolean(res5.topOrder && res5.topOrder !== this.lastTops['5']);

      const isFirst = this.lastCounts['4'] === 0 && this.lastCounts['5'] === 0;
      const hasChange = count4Changed || top4Changed || count5Changed || top5Changed;

      this.lastCounts = { '4': res4.total, '5': res5.total };
      this.lastTops = { '4': res4.topOrder, '5': res5.topOrder };

      const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      if (hasChange || isFirst) {
        this.broadcast('wms_pulse', {
          counts: this.lastCounts,
          status4: { total: res4.total, topOrder: res4.topOrder, changed: count4Changed || top4Changed },
          status5: { total: res5.total, topOrder: res5.topOrder, changed: count5Changed || top5Changed },
          timestamp: nowStr,
        });
      } else {
        // Gửi nhịp tim (heartbeat) định kỳ
        this.broadcast('heartbeat', {
          counts: this.lastCounts,
          timestamp: nowStr,
        });
      }
    } catch (err: any) {
      // Bỏ qua lỗi tạm thời
    } finally {
      this.isChecking = false;
    }
  }
}

export const wmsRealtimeBroadcaster = new WmsRealtimeBroadcaster();
