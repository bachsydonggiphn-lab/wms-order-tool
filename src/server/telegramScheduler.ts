import fs from 'fs';
import path from 'path';
import https from 'https';
import { getWmsSessionCookie, httpsRequest, getVnTodayString } from '../services/wmsService';

export interface TelegramBotConfig {
  enabled: boolean;
  botToken: string;
  botUsername: string;
  chatId: string;
  chatTitle?: string;
  intervalMinutes: number; // 5, 10, 15, 30, 60, 120, 240
  scheduleTimes: string[]; // e.g. ['08:00', '11:30', '14:00', '17:00', '20:00']
  mode: 'interval' | 'schedule'; // 'interval' | 'schedule'
  onlyOnChange: boolean;
  includeSubmitted: boolean;
  includeShelved: boolean;
  includeShipped: boolean;
  warehouse: string; // '7' (VN02) | '4' (VN01)
  silent: boolean;
  lastSentAt?: string;
  lastCounts?: {
    submitted?: number;
    shelved?: number;
    shipped?: number;
  };
}

export const DEFAULT_TELEGRAM_CONFIG: TelegramBotConfig = {
  enabled: true,
  botToken: '8867073708:AAFnVPbjWujCH66ygemKQa2VRKU1y5H6FBA',
  botUsername: 'WMSHCMBOT',
  chatId: '6271188961',
  chatTitle: 'David (@BachDong_DAVID)',
  intervalMinutes: 30,
  scheduleTimes: ['08:00', '11:30', '14:00', '17:00', '20:00'],
  mode: 'interval',
  onlyOnChange: true,
  includeSubmitted: true,
  includeShelved: true,
  includeShipped: true,
  warehouse: '7',
  silent: false,
};

export interface WmsStatusCounts {
  submitted?: number;
  shelved?: number;
  shipped?: number;
}

export class TelegramScheduler {
  private configPath: string;
  private config: TelegramBotConfig;
  private timer: NodeJS.Timeout | null = null;
  private isChecking: boolean = false;
  private lastSentMinuteKey: string = '';

  constructor() {
    this.configPath = path.resolve(process.cwd(), 'data', 'telegram_config.json');
    this.config = this.loadConfig();
  }

  public getConfig(): TelegramBotConfig {
    return { ...this.config };
  }

  public loadConfig(): TelegramBotConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.config = { ...DEFAULT_TELEGRAM_CONFIG, ...parsed };
        return this.config;
      }
    } catch (err) {
      console.error('[TelegramScheduler] Lỗi đọc file config:', err);
    }
    this.config = { ...DEFAULT_TELEGRAM_CONFIG };
    this.saveConfig(this.config);
    return this.config;
  }

  public saveConfig(newConfig: Partial<TelegramBotConfig>): TelegramBotConfig {
    try {
      this.config = { ...this.config, ...newConfig };
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
      console.log(`[TelegramScheduler] Đã lưu cấu hình mới. Bật: ${this.config.enabled}, Chế độ: ${this.config.mode}, Chu kỳ: ${this.config.intervalMinutes}m`);
    } catch (err) {
      console.error('[TelegramScheduler] Lỗi ghi file config:', err);
    }
    return this.config;
  }

  public start() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    console.log('[TelegramScheduler] Khởi động tiến trình chạy ngầm gửi báo cáo Telegram trên VPS 24/7...');
    // Quét mỗi 25 giây để đón đúng phút theo lịch và chu kỳ
    this.timer = setInterval(() => {
      this.checkAndExecuteSchedule().catch((err) => {
        console.error('[TelegramScheduler] Lỗi trong vòng lặp kiểm tra:', err);
      });
    }, 25000);
    if (this.timer && typeof this.timer.unref === 'function') {
      this.timer.unref();
    }

    // Chạy kiểm tra sau 5 giây khởi động
    const startTimeout = setTimeout(() => {
      this.checkAndExecuteSchedule().catch(() => {});
    }, 5000);
    if (startTimeout && typeof startTimeout.unref === 'function') {
      startTimeout.unref();
    }
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[TelegramScheduler] Đã dừng tiến trình TelegramScheduler');
  }

  public reloadConfig() {
    this.loadConfig();
    console.log('[TelegramScheduler] Đã nạp lại cấu hình Telegram mới nhất từ máy chủ');
  }

  /**
   * Truy vấn số lượng đơn nhanh từ YunWMS
   */
  private async fetchQuickCount(cookie: string, warehouse: string, status: string, extraParams: string = ''): Promise<number> {
    const postData = `E4=${encodeURIComponent(warehouse)}&E11=${encodeURIComponent(status)}${extraParams ? '&' + extraParams : ''}`;
    try {
      const res = await httpsRequest({
        hostname: 'czwh.wms.yunwms.com',
        path: '/order/orders/list/page/1/pageSize/1',
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

      const data = JSON.parse(res.body);
      return parseInt(String(data.total || 0), 10);
    } catch {
      return 0;
    }
  }

  /**
   * Kéo số lượng đầy đủ từ WMS cho các chỉ số được chọn
   */
  public async getLiveCounts(warehouse: string = '7'): Promise<WmsStatusCounts> {
    const cookie = await getWmsSessionCookie('David', '12345abc');
    const vnToday = getVnTodayString();

    const promises: Promise<any>[] = [];

    // 1. Status 4: Submitted
    if (this.config.includeSubmitted !== false) {
      promises.push(this.fetchQuickCount(cookie, warehouse, '4'));
    } else {
      promises.push(Promise.resolve(undefined));
    }

    // 2. Status 5: Shelved
    if (this.config.includeShelved !== false) {
      promises.push(this.fetchQuickCount(cookie, warehouse, '5'));
    } else {
      promises.push(Promise.resolve(undefined));
    }

    // 3. Status 8: Shipped Hôm nay
    if (this.config.includeShipped !== false) {
      const dateForStr = `${vnToday} 00:00`;
      const dateToStr = `${vnToday} 23:59`;
      const extraShipped = `searchDateType=packTime&dateFor=${encodeURIComponent(dateForStr)}&dateTo=${encodeURIComponent(dateToStr)}`;
      promises.push(this.fetchQuickCount(cookie, warehouse, '8', extraShipped));
    } else {
      promises.push(Promise.resolve(undefined));
    }

    const [submitted, shelved, shipped] = await Promise.all(promises);
    return { submitted, shelved, shipped };
  }

  /**
   * Định dạng tin nhắn chuẩn HTML Telegram
   */
  public formatReport(counts: WmsStatusCounts, config: TelegramBotConfig): string {
    const now = new Date();
    // Định dạng ngày giờ chuẩn múi giờ Việt Nam
    const timeStr = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(now);

    const dateStr = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(now);

    const whName = config.warehouse === '4' ? 'VN01 (Bắc Ninh/Hà Nội)' : 'VN02 (Hồ Chí Minh)';

    const lines: string[] = [
      `📦 <b>[WMS KHO ${whName}] BÁO CÁO ĐƠN HÀNG</b>`,
      `⏰ <i>${timeStr} - ${dateStr}</i>`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
    ];

    if (config.includeSubmitted !== false) {
      const sub = counts.submitted !== undefined ? counts.submitted.toLocaleString('vi-VN') : '---';
      lines.push(`⚡ <b>Submitted (E11=4):</b> <code>${sub}</code> đơn <i>(Chờ xử lý)</i>`);
    }

    if (config.includeShelved !== false) {
      const shel = counts.shelved !== undefined ? counts.shelved.toLocaleString('vi-VN') : '---';
      lines.push(`⭐ <b>Shelved (E11=5):</b> <code>${shel}</code> đơn <i>(Đã lên kệ)</i>`);
    }

    if (config.includeShipped !== false) {
      const ship = counts.shipped !== undefined ? counts.shipped.toLocaleString('vi-VN') : '---';
      lines.push(`🚚 <b>Shipped Hôm Nay (E11=8):</b> <code>${ship}</code> đơn <i>(Đã xuất kho)</i>`);
    }

    lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);

    const pending = (counts.submitted || 0) + (counts.shelved || 0);
    lines.push(`📊 <b>Tổng đơn tồn kho:</b> <code>${pending.toLocaleString('vi-VN')}</code> đơn`);
    lines.push(`🏭 <b>Kho hoạt động:</b> ${config.warehouse === '4' ? 'VN01' : 'VN02'}`);
    lines.push(`🌐 <a href="https://wms.gepoder.click">Mở Công Cụ WMS Kho</a>`);

    return lines.join('\n');
  }

  /**
   * Gửi tin nhắn qua Telegram API
   */
  public async sendTelegram(text: string, silent: boolean = false): Promise<boolean> {
    if (!this.config.botToken || !this.config.chatId) {
      console.warn('[TelegramScheduler] Không thể gửi: Thiếu botToken hoặc chatId');
      return false;
    }

    const postData = JSON.stringify({
      chat_id: this.config.chatId,
      text,
      parse_mode: 'HTML',
      disable_notification: silent,
      disable_web_page_preview: true,
    });

    return new Promise((resolve) => {
      const req = https.request({
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${this.config.botToken}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 15000
      }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (json.ok) {
              resolve(true);
            } else {
              console.error('[TelegramScheduler] Telegram API báo lỗi:', json.description);
              resolve(false);
            }
          } catch {
            resolve(res.statusCode === 200);
          }
        });
      });

      req.on('error', (err) => {
        console.error('[TelegramScheduler] Lỗi kết nối Telegram:', err.message);
        resolve(false);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Kiểm tra điều kiện thời gian và thực hiện gửi báo cáo
   */
  public async checkAndExecuteSchedule() {
    if (this.isChecking) return;
    if (!this.config.enabled || !this.config.botToken || !this.config.chatId) {
      return;
    }

    const now = new Date();
    // Lấy giờ phút chuẩn theo múi giờ Việt Nam
    const vnHourMinute = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now); // e.g. "08:30"

    const vnToday = getVnTodayString();
    const currentMinuteKey = `${vnToday}_${vnHourMinute}`;

    let isDue = false;

    if (this.config.mode === 'schedule') {
      // Chế độ gửi theo các khung giờ cố định
      const targetTimes = this.config.scheduleTimes || [];
      if (targetTimes.includes(vnHourMinute)) {
        if (this.lastSentMinuteKey !== currentMinuteKey) {
          isDue = true;
        }
      }
    } else {
      // Chế độ gửi định kỳ theo chu kỳ phút (mặc định)
      const intervalMs = (this.config.intervalMinutes || 30) * 60 * 1000;
      const lastSentTime = this.config.lastSentAt ? new Date(this.config.lastSentAt).getTime() : 0;
      const timeSinceLastSent = Date.now() - lastSentTime;

      // Nếu đã quá chu kỳ
      if (timeSinceLastSent >= intervalMs) {
        // Tránh gửi liên tục trong cùng 1 phút nếu có nhiều lần tick
        if (this.lastSentMinuteKey !== currentMinuteKey) {
          isDue = true;
        }
      }
    }

    if (!isDue) {
      return;
    }

    this.isChecking = true;

    try {
      const warehouse = this.config.warehouse || '7';
      const liveCounts = await this.getLiveCounts(warehouse);

      // Kiểm tra dữ liệu: Nếu tất cả đều = 0 hoặc undefined thì có thể mạng/session chưa sẵn sàng
      const totalCount = (liveCounts.submitted || 0) + (liveCounts.shelved || 0) + (liveCounts.shipped || 0);
      if (totalCount === 0) {
        console.log('[TelegramScheduler] Tổng số lượng đơn = 0 hoặc chưa kéo được dữ liệu WMS, hoãn gửi...');
        return;
      }

      // Kiểm tra onlyOnChange: Nếu bật thì chỉ gửi khi có số lượng thay đổi
      if (this.config.onlyOnChange && this.config.lastCounts) {
        const last = this.config.lastCounts;
        const subSame = liveCounts.submitted === last.submitted;
        const shelSame = liveCounts.shelved === last.shelved;
        const shipSame = liveCounts.shipped === last.shipped;

        if (subSame && shelSame && shipSame) {
          console.log(`[TelegramScheduler] [${vnHourMinute}] Bỏ qua vì số lượng không đổi (Submitted: ${liveCounts.submitted}, Shelved: ${liveCounts.shelved}, Shipped: ${liveCounts.shipped})`);
          // Cập nhật phút để không lặp lại trong phút này
          this.lastSentMinuteKey = currentMinuteKey;
          return;
        }
      }

      console.log(`[TelegramScheduler] [${vnHourMinute}] Đang gửi báo cáo định kỳ tới Telegram (Submitted: ${liveCounts.submitted}, Shelved: ${liveCounts.shelved}, Shipped: ${liveCounts.shipped})...`);
      const reportText = this.formatReport(liveCounts, this.config);
      const ok = await this.sendTelegram(reportText, this.config.silent);

      if (ok) {
        const sentIso = new Date().toISOString();
        this.lastSentMinuteKey = currentMinuteKey;
        this.saveConfig({
          lastSentAt: sentIso,
          lastCounts: liveCounts,
        });
        console.log(`[TelegramScheduler] ✅ Đã gửi thành công báo cáo lúc ${vnHourMinute} (${sentIso})`);
      } else {
        console.warn(`[TelegramScheduler] ❌ Gửi thất bại báo cáo lúc ${vnHourMinute}`);
      }
    } catch (err: any) {
      console.error('[TelegramScheduler] Lỗi khi thực hiện gửi báo cáo:', err?.message || err);
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Kích hoạt gửi ngay lập tức (dùng khi kiểm tra hoặc người dùng yêu cầu)
   */
  public async triggerSendNow(): Promise<{ success: boolean; message: string; counts?: WmsStatusCounts }> {
    try {
      const warehouse = this.config.warehouse || '7';
      const liveCounts = await this.getLiveCounts(warehouse);
      const reportText = this.formatReport(liveCounts, this.config);
      const ok = await this.sendTelegram(reportText, this.config.silent);

      if (ok) {
        const sentIso = new Date().toISOString();
        this.saveConfig({
          lastSentAt: sentIso,
          lastCounts: liveCounts,
        });
        return {
          success: true,
          message: 'Đã gửi báo cáo Telegram thành công!',
          counts: liveCounts
        };
      } else {
        return {
          success: false,
          message: 'Gửi thất bại tới Telegram API, vui lòng kiểm tra lại Bot Token và Chat ID!'
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Lỗi khi kích hoạt gửi báo cáo'
      };
    }
  }
}

// Singleton instance dùng xuyên suốt VPS backend
export const telegramScheduler = new TelegramScheduler();
