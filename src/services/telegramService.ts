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

const STORAGE_KEY = 'wms_telegram_bot_config_v1';

export function loadTelegramConfig(): TelegramBotConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_TELEGRAM_CONFIG, ...parsed };
    }
  } catch (err) {
    console.error('Lỗi đọc telegram config từ localStorage:', err);
  }
  return { ...DEFAULT_TELEGRAM_CONFIG };
}

export async function fetchServerTelegramConfig(): Promise<TelegramBotConfig> {
  try {
    const res = await fetch('/api/wms/telegram-config');
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.config) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.config));
        return { ...DEFAULT_TELEGRAM_CONFIG, ...data.config };
      }
    }
  } catch (err) {
    console.warn('[telegramService] Lỗi kéo telegram config từ VPS server:', err);
  }
  return loadTelegramConfig();
}

export function saveTelegramConfig(config: TelegramBotConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    // Đồng bộ lên server nếu có endpoint
    fetch('/api/wms/telegram-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }).catch(() => {
      // Bỏ qua lỗi mạng lên server nếu chạy offline
    });
  } catch (err) {
    console.error('Lỗi lưu telegram config:', err);
  }
}

export interface WmsStatusCounts {
  submitted?: number;
  shelved?: number;
  shipped?: number;
}

export function formatTelegramReport(
  counts: WmsStatusCounts,
  config: Partial<TelegramBotConfig> = {}
): string {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

export async function sendTelegramMessage(params: {
  botToken: string;
  chatId: string;
  text: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  silent?: boolean;
}): Promise<{ ok: boolean; description?: string; result?: any }> {
  const { botToken, chatId, text, parseMode = 'HTML', silent = false } = params;
  if (!botToken || !chatId) {
    return { ok: false, description: 'Thiếu Bot Token hoặc Chat ID!' };
  }

  // Thử gửi qua backend endpoint trước để tránh CORS và adblocker
  try {
    const res = await fetch('/api/wms/telegram-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: botToken,
        chatId,
        text,
        parseMode,
        silent,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok) return data;
      if (data.description) return data;
    }
  } catch (backendErr) {
    console.warn('Backend telegram send failed, falling back to direct API:', backendErr);
  }

  // Dự phòng gửi trực tiếp từ trình duyệt tới api.telegram.org
  try {
    const directRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_notification: silent,
        disable_web_page_preview: true,
      }),
    });
    return await directRes.json();
  } catch (err: any) {
    return { ok: false, description: err?.message || 'Lỗi mạng khi kết nối Telegram API' };
  }
}

export interface TelegramChatCandidate {
  id: string;
  title: string;
  type: string;
  lastMessage?: string;
  date?: string;
}

export async function fetchTelegramRecentChats(botToken: string): Promise<{
  ok: boolean;
  chats: TelegramChatCandidate[];
  error?: string;
}> {
  if (!botToken) {
    return { ok: false, chats: [], error: 'Chưa có Bot Token' };
  }

  let updates: any[] = [];
  // 1. Thử qua backend
  try {
    const res = await fetch(`/api/wms/telegram-updates?token=${encodeURIComponent(botToken)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.result)) {
        updates = data.result;
      }
    }
  } catch {
    // ignore
  }

  // 2. Dự phòng trực tiếp
  if (updates.length === 0) {
    try {
      const direct = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`);
      if (direct.ok) {
        const d = await direct.json();
        if (d.ok && Array.isArray(d.result)) {
          updates = d.result;
        }
      }
    } catch (e: any) {
      return { ok: false, chats: [], error: e?.message || 'Lỗi gọi getUpdates' };
    }
  }

  // Trích xuất danh sách các chat duy nhất
  const chatMap = new Map<string, TelegramChatCandidate>();
  for (const up of updates) {
    const msg = up.message || up.edited_message || up.channel_post || up.my_chat_member;
    const chat = msg?.chat;
    if (chat && chat.id) {
      const idStr = String(chat.id);
      let title = '';
      if (chat.title) {
        title = chat.title;
      } else if (chat.first_name || chat.last_name) {
        title = [chat.first_name, chat.last_name].filter(Boolean).join(' ');
      }
      if (chat.username) {
        title = title ? `${title} (@${chat.username})` : `@${chat.username}`;
      }
      if (!title) title = `Chat ${idStr}`;

      chatMap.set(idStr, {
        id: idStr,
        title,
        type: chat.type || 'private',
        lastMessage: msg?.text || '(Tin nhắn hoặc lệnh /start)',
        date: msg?.date ? new Date(msg.date * 1000).toLocaleTimeString('vi-VN') : undefined,
      });
    }
  }

  const list = Array.from(chatMap.values()).reverse();
  return { ok: true, chats: list };
}
