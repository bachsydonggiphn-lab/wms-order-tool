import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Bot,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Bell,
  BellOff,
  Copy,
  Check,
  Search,
  Sparkles,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import {
  TelegramBotConfig,
  loadTelegramConfig,
  fetchServerTelegramConfig,
  saveTelegramConfig,
  formatTelegramReport,
  sendTelegramMessage,
  fetchTelegramRecentChats,
  TelegramChatCandidate,
  WmsStatusCounts,
} from '../services/telegramService';

interface TelegramBotSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusCounts: Record<string, number | undefined>;
  warehouse?: string;
  onConfigUpdated?: (config: TelegramBotConfig) => void;
}

export const TelegramBotSettingsModal: React.FC<TelegramBotSettingsModalProps> = ({
  isOpen,
  onClose,
  statusCounts,
  warehouse = '7',
  onConfigUpdated,
}) => {
  const [config, setConfig] = useState<TelegramBotConfig>(() => loadTelegramConfig());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Danh sách chat tìm thấy từ bot getUpdates
  const [isDetectingChat, setIsDetectingChat] = useState(false);
  const [detectedChats, setDetectedChats] = useState<TelegramChatCandidate[]>([]);
  const [detectError, setDetectError] = useState<string | null>(null);

  const [copiedBot, setCopiedBot] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Đồng bộ cấu hình khi mở modal từ VPS server
  useEffect(() => {
    if (isOpen) {
      const loaded = loadTelegramConfig();
      setConfig(loaded);
      setTestResult(null);
      setDetectError(null);
      setSaveSuccess(false);

      // Kéo cấu hình chính xác và mới nhất đang chạy trên VPS
      fetchServerTelegramConfig().then((serverCfg) => {
        if (serverCfg) {
          setConfig(serverCfg);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentCounts: WmsStatusCounts = {
    submitted: statusCounts['4'] ?? 0,
    shelved: statusCounts['5'] ?? 0,
    shipped: statusCounts['8'] ?? 0,
  };

  const previewHtml = formatTelegramReport(currentCounts, {
    ...config,
    warehouse: warehouse || config.warehouse,
  });

  // Xử lý copy tên bot
  const handleCopyBot = () => {
    navigator.clipboard.writeText('@WMSHCMBOT');
    setCopiedBot(true);
    setTimeout(() => setCopiedBot(false), 2000);
  };

  // Tự động tìm Chat ID từ các tin nhắn gần nhất
  const handleDetectChatId = async () => {
    setIsDetectingChat(true);
    setDetectError(null);
    try {
      const res = await fetchTelegramRecentChats(config.botToken);
      if (res.ok && res.chats.length > 0) {
        setDetectedChats(res.chats);
        // Tự động gán chat đầu tiên nếu chưa có
        const latest = res.chats[0];
        setConfig((prev) => ({
          ...prev,
          chatId: latest.id,
          chatTitle: latest.title,
        }));
        setTestResult({
          success: true,
          message: `Đã tìm thấy Chat: ${latest.title} (ID: ${latest.id})!`,
        });
      } else {
        setDetectError(
          'Chưa thấy tin nhắn nào gửi cho Bot! Bạn hãy mở link t.me/WMSHCMBOT, bấm nút START hoặc gửi 1 tin nhắn bất kỳ cho Bot rồi bấm lại nút này nhé.'
        );
      }
    } catch (err: any) {
      setDetectError(err?.message || 'Không thể lấy danh sách tin nhắn từ Bot');
    } finally {
      setIsDetectingChat(false);
    }
  };

  // Gửi thử nghiệm tin nhắn
  const handleTestSend = async () => {
    if (!config.chatId.trim()) {
      setTestResult({
        success: false,
        message: 'Vui lòng nhập Chat ID hoặc bấm "Tự Động Lấy Chat ID" trước khi gửi thử!',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const reportText = formatTelegramReport(currentCounts, {
        ...config,
        warehouse: warehouse || config.warehouse,
      });

      const res = await sendTelegramMessage({
        botToken: config.botToken,
        chatId: config.chatId.trim(),
        text: `🚀 <b>[THỬ NGHIỆM KẾT NỐI]</b>\n${reportText}`,
        silent: config.silent,
      });

      if (res.ok) {
        setTestResult({
          success: true,
          message: '✅ Đã gửi tin nhắn thử nghiệm thành công tới Telegram! Bạn hãy kiểm tra tin nhắn.',
        });
      } else {
        setTestResult({
          success: false,
          message: `❌ Telegram báo lỗi: ${res.description || 'Không thể gửi tin nhắn. Kiểm tra lại Chat ID.'}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Lỗi kết nối: ${err?.message || 'Không xác định'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Lưu cấu hình
  const handleSave = () => {
    const updated = {
      ...config,
      warehouse: warehouse || config.warehouse,
    };
    saveTelegramConfig(updated);
    setSaveSuccess(true);
    if (onConfigUpdated) {
      onConfigUpdated(updated);
    }
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-gradient-to-r from-sky-950/60 via-slate-900 to-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-inner">
              <Send className="w-5 h-5 -rotate-12 translate-x-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-wide">Cài Đặt Báo Cáo Telegram Bot</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  @WMSHCMBOT
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tự động gửi số lượng đơn Submitted (4), Shelved (5), Shipped (8) định kỳ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
          
          {/* KHỐI 1: CÔNG TẮC BẬT/TẮT TỔNG */}
          <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
            config.enabled
              ? 'bg-sky-500/10 border-sky-400/40 shadow-xs'
              : 'bg-slate-800/40 border-slate-700/60'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${config.enabled ? 'bg-sky-400 animate-ping' : 'bg-slate-600'}`} />
              <div>
                <div className="font-bold text-slate-200">
                  {config.enabled ? '🚀 Đang Bật Tự Động Gửi Báo Cáo' : '⏸️ Đang Tắt Tự Động Gửi'}
                </div>
                <div className="text-xs text-slate-400">
                  {config.enabled
                    ? `Hệ thống sẽ gửi tin nhắn theo chu kỳ mỗi ${config.intervalMinutes} phút`
                    : 'Bật công tắc để hệ thống tự động thông báo đơn hàng cho bạn qua Telegram'}
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
          </div>

          {/* KHỐI 2: THÔNG TIN BOT & CHAT ID */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/70 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
              <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <Bot className="w-4 h-4 text-sky-400" />
                Thông Tin Bot & Người Nhận
              </span>
              <a
                href="https://t.me/WMSHCMBOT"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold hover:underline"
              >
                Mở @WMSHCMBOT trên Telegram
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Bot Token */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Bot Token (HTTP API)
                </label>
                <input
                  type="text"
                  value={config.botToken}
                  onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
                  placeholder="Nhập Bot Token..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-hidden focus:border-sky-500 transition-colors"
                />
              </div>

              {/* Chat ID */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-400">
                    Chat ID / Group ID người nhận
                  </label>
                  {config.chatTitle && (
                    <span className="text-[11px] text-emerald-400 font-medium truncate max-w-[150px]">
                      {config.chatTitle}
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={config.chatId}
                    onChange={(e) => setConfig({ ...config, chatId: e.target.value, chatTitle: '' })}
                    placeholder="VD: 123456789 hoặc -100xxx"
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-hidden focus:border-sky-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={handleDetectChatId}
                    disabled={isDetectingChat}
                    title="Quét tin nhắn mới gửi cho bot để tự động điền Chat ID"
                    className="px-2.5 py-2 bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 border border-sky-500/50 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Search className={`w-3.5 h-3.5 ${isDetectingChat ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Lấy Chat ID</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Hướng dẫn lấy Chat ID nếu chưa có */}
            {detectError && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-400/30 text-amber-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <div className="flex-1">
                  {detectError}
                  <div className="mt-1 flex items-center gap-2">
                    <a
                      href="https://t.me/WMSHCMBOT"
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] inline-flex items-center gap-1"
                    >
                      Bấm vào đây để mở @WMSHCMBOT
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Danh sách chat nhận diện được */}
            {detectedChats.length > 0 && (
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700 text-xs space-y-1.5">
                <div className="text-slate-400 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Chọn người nhận hoặc nhóm từ tin nhắn gần đây:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {detectedChats.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setConfig({ ...config, chatId: c.id, chatTitle: c.title })}
                      className={`px-2 py-1 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                        config.chatId === c.id
                          ? 'bg-sky-500/30 text-sky-200 border-sky-400 font-bold'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <span>{c.type === 'group' || c.type === 'supergroup' ? '👥' : '👤'}</span>
                      <span>{c.title}</span>
                      <span className="font-mono text-[10px] text-slate-400">({c.id})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* KHỐI 3: TẦN SUẤT & ĐIỀU KIỆN GỬI */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/70 space-y-3">
            <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs uppercase tracking-wider border-b border-slate-700/60 pb-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Tần Suất & Quy Tắc Gửi
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              {/* Chu kỳ phút */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Chu kỳ gửi tự động
                </label>
                <select
                  value={config.intervalMinutes}
                  onChange={(e) => setConfig({ ...config, intervalMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 focus:outline-hidden focus:border-sky-500 cursor-pointer"
                >
                  <option value={5}>Mỗi 5 phút</option>
                  <option value={10}>Mỗi 10 phút</option>
                  <option value={15}>Mỗi 15 phút</option>
                  <option value={30}>Mỗi 30 phút (Khuyên dùng)</option>
                  <option value={60}>Mỗi 1 giờ</option>
                  <option value={120}>Mỗi 2 giờ</option>
                  <option value={240}>Mỗi 4 giờ</option>
                </select>
              </div>

              {/* Tùy chọn lọc & âm thanh */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={config.onlyOnChange}
                    onChange={(e) => setConfig({ ...config, onlyOnChange: e.target.checked })}
                    className="w-4 h-4 rounded text-sky-600 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
                  />
                  <span>Chỉ gửi khi có <strong>thay đổi số lượng đơn</strong> (tránh spam)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={config.silent}
                    onChange={(e) => setConfig({ ...config, silent: e.target.checked })}
                    className="w-4 h-4 rounded text-sky-600 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
                  />
                  <span>Gửi âm thầm (không làm chuông điện thoại reo)</span>
                </label>
              </div>
            </div>

            {/* Lựa chọn số liệu gửi */}
            <div className="pt-2 border-t border-slate-700/50 flex flex-wrap gap-4 text-xs">
              <span className="text-slate-400 font-semibold">Chỉ số gửi:</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-blue-300">
                <input
                  type="checkbox"
                  checked={config.includeSubmitted}
                  onChange={(e) => setConfig({ ...config, includeSubmitted: e.target.checked })}
                  className="rounded text-blue-600 bg-slate-900 border-slate-700 cursor-pointer"
                />
                <span>⚡ Submitted (E11=4)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-amber-300">
                <input
                  type="checkbox"
                  checked={config.includeShelved}
                  onChange={(e) => setConfig({ ...config, includeShelved: e.target.checked })}
                  className="rounded text-amber-600 bg-slate-900 border-slate-700 cursor-pointer"
                />
                <span>⭐ Shelved (E11=5)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-emerald-300">
                <input
                  type="checkbox"
                  checked={config.includeShipped}
                  onChange={(e) => setConfig({ ...config, includeShipped: e.target.checked })}
                  className="rounded text-emerald-600 bg-slate-900 border-slate-700 cursor-pointer"
                />
                <span>🚚 Shipped Hôm Nay (E11=8)</span>
              </label>
            </div>
          </div>

          {/* KHỐI 4: XEM TRƯỚC TIN NHẮN (LIVE PREVIEW) */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                Xem trước tin nhắn Telegram thực tế:
              </span>
              <span className="text-[11px] text-slate-500">HTML Format</span>
            </div>
            <div
              className="p-3 rounded-lg bg-[#182533] border border-sky-900/40 text-slate-200 text-xs font-sans leading-relaxed whitespace-pre-wrap select-text"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>

          {/* HIỂN THỊ KẾT QUẢ GỬI THỬ */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-400/40 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-400/40 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span className="flex-1 font-medium">{testResult.message}</span>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between p-3.5 sm:px-5 sm:py-3 border-t border-slate-800 bg-slate-950/70 gap-2">
          <button
            type="button"
            onClick={handleTestSend}
            disabled={isTesting}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 -rotate-12" />}
            <span>Gửi Tin Nhắn Thử Ngay</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-center"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-none px-5 py-2.5 sm:py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-sky-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {saveSuccess ? <Check className="w-4 h-4 text-white" /> : null}
              <span>{saveSuccess ? 'Đã Lưu!' : 'Lưu Cài Đặt'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
