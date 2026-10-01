import { createClient, Client, InStatement } from "@libsql/client";
import path from "path";
import fs from "fs";
import { OrderItem } from "./src/types/tracking";
import { detectCarrier } from "./src/services/carrierDetector";
import { layNhomTuSKU } from "./src/utils/orderProcessor";
import { DEFAULT_SKU_GROUPS } from "./src/utils/skuData";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "tracking.sqlite");
const STATE_JSON_PATH = path.join(DATA_DIR, "orders_state.json");

let clientInstance: Client | null = null;
let isInitialized = false;

export function switchToLocalDb(): Client {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  console.log(`[Database] Đang chuyển sang SQLite Local: ${DB_PATH}`);
  clientInstance = createClient({
    url: `file:${DB_PATH}`
  });
  return clientInstance;
}

export function getSqliteDb(): Client {
  if (!clientInstance) {
    const tursoUrl = (process.env.TURSO_DATABASE_URL || "").trim();
    const tursoToken = (process.env.TURSO_AUTH_TOKEN || "").trim();

    if (tursoUrl) {
      console.log(`[Database] Đang kết nối tới Turso Cloud: ${tursoUrl}`);
      clientInstance = createClient({
        url: tursoUrl,
        authToken: tursoToken || undefined
      });
    } else {
      switchToLocalDb();
    }
  }

  return clientInstance;
}

export async function createAllTables(db: Client): Promise<void> {
  // 1. Bảng orders (Tracking & kiểm tra vận đơn)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      tracking_code TEXT UNIQUE NOT NULL,
      order_no TEXT,
      carrier TEXT NOT NULL,
      carrier_channel TEXT,
      status_category TEXT NOT NULL,
      raw_status_text TEXT,
      status_detail TEXT,
      scanned_at TEXT,
      updated_at TEXT,
      order_created_at TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      warehouse_id TEXT,
      warehouse_name TEXT,
      source TEXT,
      payload_json TEXT NOT NULL
    );
  `);
  await db.execute("CREATE INDEX IF NOT EXISTS idx_orders_tracking_code ON orders(tracking_code);");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_orders_carrier ON orders(carrier);");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status_category);");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(updated_at);");

  // 2. Bảng wms_shipped_orders: Đơn hàng đã xuất kho (Shipped - Mã 8, Kho VN02)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wms_shipped_orders (
      order_no TEXT PRIMARY KEY,
      tracking_no TEXT,
      ref_no TEXT,
      channel TEXT,
      customer_code TEXT,
      warehouse_id TEXT DEFAULT '7',
      warehouse_name TEXT DEFAULT 'VN02 [Kho Hồ Chí Minh]',
      carrier TEXT,
      creation_time TEXT,
      shipped_time TEXT,
      picking_list TEXT,
      total_qty INTEGER DEFAULT 0,
      sku_count INTEGER DEFAULT 0,
      is_single_sku INTEGER DEFAULT 0,
      status_e11 TEXT DEFAULT '8',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await db.execute("CREATE INDEX IF NOT EXISTS idx_shipped_orders_shipped_time ON wms_shipped_orders(shipped_time);");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_shipped_orders_creation_time ON wms_shipped_orders(creation_time);");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_shipped_orders_tracking_no ON wms_shipped_orders(tracking_no);");

  // 3. Bảng wms_shipped_order_items: Chi tiết từng SKU trong đơn xuất kho
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wms_shipped_order_items (
      id TEXT PRIMARY KEY,
      order_no TEXT NOT NULL,
      sku TEXT NOT NULL,
      qty INTEGER NOT NULL DEFAULT 1,
      product_title TEXT,
      group_name TEXT,
      shipped_time TEXT,
      creation_time TEXT,
      is_single_sku INTEGER DEFAULT 0
    );
  `);
  await db.execute("CREATE INDEX IF NOT EXISTS idx_shipped_items_sku ON wms_shipped_order_items(sku);");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_shipped_items_order_no ON wms_shipped_order_items(order_no);");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_shipped_items_shipped_time ON wms_shipped_order_items(shipped_time);");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_shipped_items_group_name ON wms_shipped_order_items(group_name);");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_items_covering_v2 ON wms_shipped_order_items(shipped_time, sku, qty, is_single_sku);");

  // 4. Bảng wms_sync_meta: Lưu thông tin lần đồng bộ cuối, checkpoint, thống kê
  await db.execute(`
    CREATE TABLE IF NOT EXISTS wms_sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function initSqliteDb(): Promise<void> {
  if (isInitialized) return;
  const db = getSqliteDb();

  try {
    // Tối ưu hóa SQLite cho hiệu năng cao & đọc/ghi đồng thời
    try {
      await db.execute("PRAGMA journal_mode = WAL;");
      await db.execute("PRAGMA synchronous = NORMAL;");
      await db.execute("PRAGMA busy_timeout = 10000;");
      await db.execute("PRAGMA cache_size = -64000;"); // 64MB cache RAM
    } catch (pragmaErr) {
      // Bỏ qua nếu chạy qua Turso Cloud HTTP không hỗ trợ PRAGMA cục bộ
    }

    // Create schema
    await createAllTables(db);
    isInitialized = true;

    // Migrate from legacy orders_state.json if database is currently empty
    await tryAutoMigrateFromJson(db);
  } catch (err: any) {
    if (err?.code === 'BLOCKED' || String(err?.message || '').includes('BLOCKED')) {
      console.warn(`[Database Warning] Turso Cloud quota bị chặn (${err.message}). Tự động chuyển sang SQLite Local: ${DB_PATH}`);
      try {
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        clientInstance = createClient({
          url: `file:${DB_PATH}`
        });
        const localDb = clientInstance;
        await createAllTables(localDb);
        isInitialized = true;
        await tryAutoMigrateFromJson(localDb);
      } catch (e) {
        console.error("[Local SQLite Fallback Error]", e);
      }
    } else {
      console.error("[Database Init Error]", err);
    }
  }
}

async function tryAutoMigrateFromJson(db: Client) {
  try {
    const res = await db.execute("SELECT count(*) as count FROM orders");
    const count = Number(res.rows[0]?.count ?? 0);
    if (count === 0 && fs.existsSync(STATE_JSON_PATH)) {
      const raw = fs.readFileSync(STATE_JSON_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      const ordersList: OrderItem[] = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.orders) ? parsed.orders : []);
      if (ordersList.length > 0) {
        console.log(`[SQLite Migration] Đang chuyển ${ordersList.length} đơn từ orders_state.json vào Database...`);
        await upsertSqliteOrders(ordersList);
        console.log(`[SQLite Migration] Chuyển đổi thành công ${ordersList.length} đơn vào database!`);
      }
    }
  } catch (err) {
    console.error("[SQLite Migration Error]", err);
  }
}

export async function getAllSqliteOrders(): Promise<OrderItem[]> {
  await initSqliteDb();
  const db = getSqliteDb();
  // SQL thuần truy vấn trực tiếp các cột cần thiết (Loại bỏ payload_json khổng lồ để đạt tốc độ tức thì)
  const res = await db.execute(`
    SELECT 
      id, tracking_code, order_no, carrier, carrier_channel, 
      status_category, raw_status_text, status_detail, 
      scanned_at, updated_at, order_created_at, 
      customer_name, customer_phone, warehouse_id, warehouse_name, 
      source 
    FROM orders 
    ORDER BY rowid ASC
  `);

  return res.rows.map(r => {
    let cat = (r.status_category || 'not_scanned') as any;
    let rawStatus = r.raw_status_text ? String(r.raw_status_text) : 'Chưa kiểm tra';
    const detail = (r.status_detail ? String(r.status_detail) : '').toLowerCase();
    let scannedAt = r.scanned_at ? String(r.scanned_at) : undefined;

    // Auto-heal delayed pickup / goods not ready / preparing orders wrongly saved as in_transit or scanned
    const comboText = (detail + ' ' + rawStatus).toLowerCase();
    const isDelayOrNotReady = 
      comboText.includes('delayed pickup') ||
      comboText.includes('delay pickup') ||
      comboText.includes('not ready') ||
      comboText.includes('goods are not ready') ||
      comboText.includes('there is an order but no goods') ||
      comboText.includes('order but no goods') ||
      comboText.includes('chưa có hàng') ||
      comboText.includes('chưa chuẩn bị') ||
      comboText.includes('chuẩn bị hàng') ||
      comboText.includes('người bán đang chuẩn bị') ||
      comboText.includes('chưa tới lấy') ||
      comboText.includes('chờ bưu tá') ||
      comboText.includes('hẹn lấy lại') ||
      comboText.includes('hẹn lại ngày lấy') ||
      comboText.includes('người gửi hẹn') ||
      comboText.includes('lấy không thành công') ||
      comboText.includes('không lấy được') ||
      comboText.includes('chưa lấy được');
    const hasGenuineTransit = comboText.includes('xuất bưu cục') || comboText.includes('rời bưu cục') || comboText.includes('nhập bưu cục') || comboText.includes('trung chuyển') || comboText.includes('đang giao hàng') || comboText.includes('ký nhận') || comboText.includes('giao thành công');

    if (isDelayOrNotReady && !hasGenuineTransit && (cat === 'in_transit' || cat === 'scanned')) {
      cat = 'not_scanned';
      rawStatus = comboText.includes('chuẩn bị') ? 'Người bán đang chuẩn bị hàng' : 'Chờ lấy hàng (Người gửi hẹn lại / Chưa có hàng)';
      scannedAt = undefined;
    }

    // Auto-heal misclassified error rows with valid scan info or network timeouts
    if (cat === 'error' || rawStatus.includes('Lỗi tra cứu') || rawStatus.includes('Lỗi kết nối')) {
      const hasPickup = Boolean(scannedAt || detail.includes('đã lấy hàng') || detail.includes('quét mã thành công') || detail.includes('bưu tá đã lấy') || detail.includes('đã nhận kiện'));
      const hasDelivered = detail.includes('ký nhận') || detail.includes('giao thành công') || detail.includes('đã giao hàng');
      const hasTransit = detail.includes('đang vận chuyển') || detail.includes('trung chuyển') || detail.includes('luân chuyển') || detail.includes('đang giao');

      if (hasDelivered) {
        cat = 'delivered';
        rawStatus = 'Giao thành công (Đã ký nhận)';
      } else if (hasTransit) {
        cat = 'in_transit';
        rawStatus = 'Đang vận chuyển';
      } else if (hasPickup) {
        cat = 'scanned';
        rawStatus = r.carrier === 'spx' ? 'Đã lấy hàng - SPX đã nhận kiện' : 'Đã lấy hàng - Bưu tá đã quét mã';
      } else {
        cat = 'not_scanned';
        rawStatus = 'Chưa scan (Chờ quét lại)';
      }
    }

    return {
      id: String(r.id || ''),
      trackingCode: String(r.tracking_code || ''),
      carrier: (r.carrier || 'unknown') as any,
      carrierChannel: r.carrier_channel ? String(r.carrier_channel) : undefined,
      statusCategory: cat,
      rawStatusText: rawStatus,
      statusDetail: r.status_detail ? String(r.status_detail) : undefined,
      scannedAt,
      updatedAt: r.updated_at ? String(r.updated_at) : undefined,
      directUrl: undefined,
      extraInfo: {
        orderNo: r.order_no ? String(r.order_no) : undefined,
        orderCreatedAt: r.order_created_at ? String(r.order_created_at) : undefined,
        customerName: r.customer_name ? String(r.customer_name) : undefined,
        customerPhone: r.customer_phone ? String(r.customer_phone) : undefined,
        warehouseId: r.warehouse_id ? String(r.warehouse_id) : undefined,
        warehouseName: r.warehouse_name ? String(r.warehouse_name) : undefined,
        source: r.source ? String(r.source) : undefined,
      },
      isChecking: false,
      timeline: [] // Lazy-loaded on demand when user clicks to inspect order details
    };
  });
}

/**
 * Lazy load detailed timeline events for a single tracking code
 */
export async function getOrderTimeline(trackingCode: string): Promise<any[] | null> {
  await initSqliteDb();
  const db = getSqliteDb();
  const cleanCode = (trackingCode || '').trim().toUpperCase();
  const res = await db.execute({
    sql: "SELECT payload_json FROM orders WHERE UPPER(tracking_code) = ? LIMIT 1",
    args: [cleanCode]
  });

  if (res.rows.length === 0) return null;
  try {
    const json = (res.rows[0].payload_json ?? (res.rows[0] as any)[0]) as string;
    if (json) {
      const parsed = JSON.parse(json);
      return parsed.timeline || [];
    }
  } catch {}
  return [];
}

export async function getSqliteStats() {
  await initSqliteDb();
  const db = getSqliteDb();

  try {
    const [totalRes, statusRes] = await Promise.all([
      db.execute("SELECT count(*) as total FROM orders"),
      db.execute("SELECT status_category, count(*) as count FROM orders GROUP BY status_category")
    ]);

    const total = Number(totalRes.rows[0]?.total ?? 0);
    const statsMap: Record<string, number> = {};
    for (const r of statusRes.rows) {
      const cat = String(r.status_category ?? "");
      const count = Number(r.count ?? 0);
      if (cat) statsMap[cat] = count;
    }

    return {
      total,
      scanned: statsMap["scanned"] || 0,
      not_scanned: statsMap["not_scanned"] || 0,
      cancelled: statsMap["cancelled"] || 0,
      in_transit: statsMap["in_transit"] || 0,
      delivered: statsMap["delivered"] || 0,
      returned: statsMap["returned"] || 0,
      error: statsMap["error"] || 0
    };
  } catch (err) {
    console.error("[getSqliteStats Error]", err);
    return {
      total: 0,
      scanned: 0,
      not_scanned: 0,
      cancelled: 0,
      in_transit: 0,
      delivered: 0,
      returned: 0,
      error: 0
    };
  }
}

export async function upsertSqliteOrders(orders: OrderItem[]): Promise<number> {
  if (!orders || orders.length === 0) return 0;
  await initSqliteDb();
  const db = getSqliteDb();

  // 1. Gather all tracking codes to fetch existing records in batches
  const codeList = orders.map(o => (o.trackingCode || "").trim()).filter(Boolean);
  const existingMap = new Map<string, OrderItem>();

  // Fetch in chunks of 400 to avoid query param limit
  const CHUNK_SIZE = 400;
  for (let i = 0; i < codeList.length; i += CHUNK_SIZE) {
    const chunk = codeList.slice(i, i + CHUNK_SIZE);
    const placeholders = chunk.map(() => "?").join(",");
    try {
      const res = await db.execute({
        sql: `SELECT tracking_code, payload_json FROM orders WHERE tracking_code IN (${placeholders})`,
        args: chunk
      });
      for (const row of res.rows) {
        const code = String(row.tracking_code || "");
        const jsonStr = String(row.payload_json || "");
        if (code && jsonStr) {
          try {
            existingMap.set(code, JSON.parse(jsonStr));
          } catch {}
        }
      }
    } catch {}
  }

  // 2. Prepare UPSERT statements with intelligent merge
  const statements: InStatement[] = [];

  for (const item of orders) {
    const cleanCode = (item.trackingCode || "").trim();
    if (!cleanCode) continue;

    let merged = item;
    const old = existingMap.get(cleanCode);

    if (old) {
      // If old was ALREADY scanned/in_transit/delivered/returned, an unscanned or error placeholder MUST NEVER overwrite it!
      const oldIsScanned = Boolean(
        (old.statusCategory && old.statusCategory !== 'not_scanned' && old.statusCategory !== 'error') ||
        old.scannedAt ||
        (Array.isArray(old.timeline) && old.timeline.length > 0 && old.timeline.some(t => !t.statusText?.includes('chuẩn bị') && !t.statusText?.includes('chờ lấy')))
      );

      const itemHasNewCarrierScan = Boolean(
        (item.statusCategory && item.statusCategory !== 'not_scanned' && item.statusCategory !== 'error') ||
        (item.scannedAt && item.statusCategory !== 'error') ||
        (Array.isArray(item.timeline) && item.timeline.length > 0 && item.timeline.some(t => !t.statusText?.includes('chuẩn bị') && !t.statusText?.includes('chờ lấy')))
      );

      if (oldIsScanned && (!itemHasNewCarrierScan || item.statusCategory === 'error') && item.statusCategory !== 'cancelled') {
        // Old was ALREADY scanned by courier/hub! Unscanned or error item MUST NOT overwrite scanned status!
        merged = {
          ...item,
          ...old,
          statusCategory: old.statusCategory,
          rawStatusText: old.rawStatusText,
          statusDetail: old.statusDetail,
          scannedAt: old.scannedAt,
          updatedAt: old.updatedAt || item.updatedAt,
          timeline: (Array.isArray(old.timeline) && old.timeline.length > 0) ? old.timeline : (item.timeline || []),
          orderNo: item.orderNo || old.orderNo,
          warehouseId: item.warehouseId || old.warehouseId,
          warehouseName: item.warehouseName || old.warehouseName,
          carrierChannel: item.carrierChannel || old.carrierChannel,
          wmsStatus: item.wmsStatus || old.wmsStatus,
          extraInfo: {
            ...(old.extraInfo || {}),
            ...(item.extraInfo || {})
          },
          isChecking: false
        };
      } else {
        const hasNewTimeline = Array.isArray(item.timeline) && item.timeline.length > 0;
        const mergedTimeline = hasNewTimeline ? item.timeline : (old.timeline || []);

        merged = {
          ...old,
          ...item,
          scannedAt: item.scannedAt || old.scannedAt,
          timeline: mergedTimeline,
          extraInfo: {
            ...(old.extraInfo || {}),
            ...(item.extraInfo || {})
          },
          orderNo: item.orderNo || old.orderNo,
          warehouseId: item.warehouseId || old.warehouseId,
          warehouseName: item.warehouseName || old.warehouseName,
          carrierChannel: item.carrierChannel || old.carrierChannel,
          wmsStatus: item.wmsStatus || old.wmsStatus,
          isChecking: false
        };
      }
    }

    // Ensure accurate carrier resolution (e.g. TTVN/BEST/VNBEST or explicit channel)
    const detected = detectCarrier(cleanCode, merged.carrierChannel || '');
    if (detected !== 'unknown' && (!merged.carrier || merged.carrier === 'unknown' || detected === 'best' || detected === 'spx' || detected === 'vnpost' || detected === 'jt_cargo')) {
      merged.carrier = detected;
    }

    const id = merged.id || `order_${cleanCode}`;
    const payloadJson = JSON.stringify(merged);

    statements.push({
      sql: `
        INSERT INTO orders (
          id, tracking_code, order_no, carrier, carrier_channel,
          status_category, raw_status_text, status_detail, scanned_at,
          updated_at, order_created_at, customer_name, customer_phone,
          warehouse_id, warehouse_name, source, payload_json
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?
        )
        ON CONFLICT(tracking_code) DO UPDATE SET
          carrier = excluded.carrier,
          status_category = excluded.status_category,
          raw_status_text = excluded.raw_status_text,
          status_detail = excluded.status_detail,
          scanned_at = COALESCE(excluded.scanned_at, orders.scanned_at),
          updated_at = excluded.updated_at,
          order_no = COALESCE(excluded.order_no, orders.order_no),
          carrier_channel = COALESCE(excluded.carrier_channel, orders.carrier_channel),
          warehouse_id = COALESCE(excluded.warehouse_id, orders.warehouse_id),
          warehouse_name = COALESCE(excluded.warehouse_name, orders.warehouse_name),
          source = COALESCE(excluded.source, orders.source),
          payload_json = excluded.payload_json;
      `,
      args: [
        id,
        cleanCode,
        merged.orderNo || null,
        merged.carrier || "unknown",
        merged.carrierChannel || null,
        merged.statusCategory || "not_scanned",
        merged.rawStatusText || "",
        merged.statusDetail || null,
        merged.scannedAt || null,
        merged.updatedAt || new Date().toISOString(),
        merged.extraInfo?.orderDate || null,
        merged.extraInfo?.shopName || null,
        merged.extraInfo?.customerPhone || null,
        merged.warehouseId || null,
        merged.warehouseName || null,
        merged.source || null,
        payloadJson
      ]
    });
  }

  // 3. Execute batch in chunks of 200 statements
  const BATCH_SIZE = 200;
  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    const chunk = statements.slice(i, i + BATCH_SIZE);
    await db.batch(chunk, "write");
  }

  return orders.length;
}

export async function clearSqliteOrders(): Promise<void> {
  await initSqliteDb();
  const db = getSqliteDb();
  await db.execute("DELETE FROM orders;");
}

// ==========================================
// WMS SHIPPED ORDERS & ITEMS (KHO VN02 - MÃ 8)
// ==========================================

export interface ShippedOrderItemInput {
  sku: string;
  qty: number;
  productTitle?: string;
  groupName?: string;
}

export interface ShippedOrderInput {
  orderNo: string;
  trackingNo?: string;
  refNo?: string;
  channel?: string;
  customerCode?: string;
  warehouseId?: string;
  warehouseName?: string;
  carrier?: string;
  creationTime?: string;
  shippedTime?: string;
  pickingList?: string;
  totalQty?: number;
  skuCount?: number;
  isSingleSku?: boolean;
  statusE11?: string;
  items: ShippedOrderItemInput[];
}

export interface ShippedSyncMeta {
  lastSyncedAt?: string;
  totalOrders: number;
  totalItems: number;
  minShippedTime?: string;
  maxShippedTime?: string;
  checkpointPage?: number;
  status?: string;
}

export interface HotSkuAnalysisItem {
  sku: string;
  productTitle: string;
  groupName: string;
  totalSold: number;
  orderCount: number;
  singleSkuOrders: number;
  mixSkuOrders: number;
  velocityDaily: number; // pcs / day (thực tế chia cho daysInPeriod)
  firstShipped?: string;
  lastShipped?: string;
  abcRank?: 'A' | 'B' | 'C';
  cumulativePercentage?: number;
  recommendedZone?: string;
  recommendedSlotting?: string;
  // Trộn cùng tồn kho YunWMS
  sellable?: number;
  onWay?: number;
  inUsed?: number;
  daysOfInventory?: number | null;
  stockoutWarning?: boolean;
  incomingWarning?: boolean;

  // Tính năng Chuẩn Hóa Ngày Đứt Hàng & Đặt Chỗ Kệ Kho
  stockoutDays?: number;              // Số ngày cạn tồn gần nhất
  effectiveSellingDays?: number;      // Số ngày thực tế có hàng để bán
  adjustedVelocity?: number;          // Tốc độ bán thực tế khi có hàng (pcs/ngày)
  potentialVolume?: number;           // Doanh số tiềm năng chuẩn hóa (Run-rate)
  daysOfSupplyIncoming?: number | null; // Số ngày dự kiến bán hết lượng hàng onWay
  isStockoutWithIncoming?: boolean;   // sellable = 0 && onWay > 0
  abcRankNormalized?: 'A' | 'B' | 'C'; // Hạng ABC chuẩn hóa
  abcRankActual?: 'A' | 'B' | 'C';     // Hạng ABC thực tế
  slotReservationZone?: string;       // Vị trí đặt chỗ kệ Zone A

  // Tính năng Chuyên Nghiệp: Tần Suất Chạm Kệ, Xu Hướng & Cặp Hàng Mua Kèm
  slottingScore?: number;             // Điểm ưu tiên vị trí kho (0 - 100 điểm)
  trendRatio?: number;                // Tỷ lệ gia tốc vận tốc: V_7d / V_period
  trendCategory?: 'viral' | 'up' | 'stable' | 'down'; // Nhãn xu hướng bán
  qty7d?: number;                     // Sản lượng bán trong 7 ngày gần nhất
  topPairedSkus?: PairedSkuInfo[];    // Top các mã thường xuyên xuất hiện cùng trong đơn ghép
}

export interface PairedSkuInfo {
  sku: string;
  pairCount: number;
  productTitle?: string;
}

export interface SlottingRelocationTask {
  id: string;
  sku: string;
  productTitle: string;
  actionType: 'promote_zone_a' | 'demote_zone_b' | 'reserve_incoming' | 'pair_skus';
  title: string;
  reason: string;
  currentZone: string;
  targetZone: string;
  urgency: 'high' | 'medium' | 'low';
  potentialVolume: number;
  trendCategory?: string;
  onWay?: number;
  pairedSku?: string;
}

export interface HotSkuAnalyticsResult {
  success: boolean;
  timeframe: string;
  rankingMode?: 'normalized' | 'actual';
  totalOrders: number;
  totalSoldVolume: number;
  totalUniqueSkus: number;
  daysInPeriod: number;
  startDate?: string;
  endDate?: string;
  classACount: number;
  classBCount: number;
  classCCount: number;
  classAVolume: number;
  classBVolume: number;
  classCVolume: number;
  stockoutIncomingCount?: number;
  stockoutIncomingVolume?: number;
  viralCount?: number;
  trendingUpCount?: number;
  coolingDownCount?: number;
  items: HotSkuAnalysisItem[];
  relocationTasks?: SlottingRelocationTask[];
  meta: ShippedSyncMeta;
}

/**
 * Nạp hàng loạt đơn hàng đã xuất kho vào database (bỏ qua đơn đã có)
 */
export async function insertShippedOrdersBatch(orders: ShippedOrderInput[]): Promise<{
  insertedOrders: number;
  insertedItems: number;
}> {
  if (!orders || orders.length === 0) return { insertedOrders: 0, insertedItems: 0 };
  await initSqliteDb();
  const db = getSqliteDb();

  const statements: InStatement[] = [];
  let totalItemsCount = 0;

  for (const o of orders) {
    const orderNo = (o.orderNo || '').trim();
    if (!orderNo) continue;

    const items = o.items || [];
    const isSingleSku = items.length === 1 && (items[0].qty || 1) === 1 ? 1 : (items.length === 1 ? 1 : 0);
    const totalQty = o.totalQty || items.reduce((sum, it) => sum + (Number(it.qty) || 1), 0);
    const skuCount = items.length;

    // 1. Thêm đơn hàng vào wms_shipped_orders (Bỏ qua nếu đã có)
    statements.push({
      sql: `
        INSERT OR IGNORE INTO wms_shipped_orders (
          order_no, tracking_no, ref_no, channel, customer_code,
          warehouse_id, warehouse_name, carrier, creation_time, shipped_time,
          picking_list, total_qty, sku_count, is_single_sku, status_e11, created_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
        );
      `,
      args: [
        orderNo,
        o.trackingNo || null,
        o.refNo || null,
        o.channel || null,
        o.customerCode || 'YD',
        o.warehouseId || '7',
        o.warehouseName || 'VN02 [Kho Hồ Chí Minh]',
        o.carrier || null,
        o.creationTime || null,
        o.shippedTime || null,
        o.pickingList || null,
        totalQty,
        skuCount,
        isSingleSku,
        o.statusE11 || '8'
      ]
    });

    // 2. Thêm từng sản phẩm vào wms_shipped_order_items (Bỏ qua nếu đã có)
    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      const sku = (it.sku || '').trim();
      if (!sku) continue;

      const itemId = `${orderNo}_${sku}_${idx}`;
      const groupName = it.groupName || layNhomTuSKU(sku, DEFAULT_SKU_GROUPS);
      const qty = Math.max(1, Number(it.qty) || 1);

      statements.push({
        sql: `
          INSERT OR IGNORE INTO wms_shipped_order_items (
            id, order_no, sku, qty, product_title, group_name, shipped_time, creation_time, is_single_sku
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        `,
        args: [
          itemId,
          orderNo,
          sku,
          qty,
          it.productTitle || null,
          groupName,
          o.shippedTime || null,
          o.creationTime || null,
          isSingleSku
        ]
      });
      totalItemsCount++;
    }
  }

  // Thực thi theo từng chunk 250 câu lệnh
  const BATCH_SIZE = 250;
  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    const chunk = statements.slice(i, i + BATCH_SIZE);
    await db.batch(chunk, "write");
  }

  // Xóa cache phân tích vì đã có đơn mới nạp vào
  clearAnalyticsCache();

  return {
    insertedOrders: orders.length,
    insertedItems: totalItemsCount
  };
}

/**
 * Lấy thông tin Metadata đồng bộ đơn xuất kho
 */
export async function getShippedSyncMeta(): Promise<ShippedSyncMeta> {
  await initSqliteDb();
  const db = getSqliteDb();

  try {
    const [metaRes, ordersCountRes, itemsCountRes, datesRes] = await Promise.all([
      db.execute("SELECT key, value FROM wms_sync_meta"),
      db.execute("SELECT count(*) as cnt FROM wms_shipped_orders"),
      db.execute("SELECT count(*) as cnt FROM wms_shipped_order_items"),
      db.execute("SELECT min(COALESCE(NULLIF(shipped_time, '0'), creation_time)) as min_date, max(COALESCE(NULLIF(shipped_time, '0'), creation_time)) as max_date FROM wms_shipped_orders WHERE (shipped_time IS NOT NULL AND shipped_time != '0') OR (creation_time IS NOT NULL AND creation_time != '')")
    ]);

    const metaMap: Record<string, string> = {};
    metaRes.rows.forEach(r => {
      metaMap[String(r.key)] = String(r.value);
    });

    const totalOrders = Number(ordersCountRes.rows[0]?.cnt || 0);
    const totalItems = Number(itemsCountRes.rows[0]?.cnt || 0);
    const minShippedTime = datesRes.rows[0]?.min_date ? String(datesRes.rows[0].min_date) : undefined;
    const maxShippedTime = datesRes.rows[0]?.max_date ? String(datesRes.rows[0].max_date) : undefined;

    return {
      lastSyncedAt: metaMap['last_shipped_sync_time'] || undefined,
      totalOrders,
      totalItems,
      minShippedTime,
      maxShippedTime,
      checkpointPage: metaMap['shipped_checkpoint_page'] ? parseInt(metaMap['shipped_checkpoint_page'], 10) : undefined,
      status: metaMap['shipped_sync_status'] || 'idle'
    };
  } catch (err) {
    console.error("[getShippedSyncMeta Error]", err);
    return {
      totalOrders: 0,
      totalItems: 0,
      status: 'idle'
    };
  }
}

/**
 * Cập nhật thông tin Metadata đồng bộ
 */
export async function updateShippedSyncMeta(updates: Record<string, string>): Promise<void> {
  await initSqliteDb();
  const db = getSqliteDb();

  const statements: InStatement[] = Object.entries(updates).map(([k, v]) => ({
    sql: `
      INSERT INTO wms_sync_meta (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP;
    `,
    args: [k, v]
  }));

  if (statements.length > 0) {
    await db.batch(statements, "write");
  }
}

// Cache trong bộ nhớ RAM cho phân tích đơn xuất kho (TTL 60s)
interface AnalyticsCacheEntry {
  timestamp: number;
  data: HotSkuAnalyticsResult;
}
const analyticsCache = new Map<string, AnalyticsCacheEntry>();
const ANALYTICS_CACHE_TTL = 60 * 1000;

export function clearAnalyticsCache() {
  analyticsCache.clear();
}

/**
 * Phân tích Sản Phẩm Bán Chạy & Đề Xuất Vị Trí Kho (ABC Classification & Slotting)
 */
export async function getShippedOrdersAnalytics(params: {
  timeframe?: string; // '7d' | '30d' | '90d' | 'all' | 'custom'
  fromDate?: string;  // YYYY-MM-DD
  toDate?: string;    // YYYY-MM-DD
  group?: string;     // Lọc theo nhóm hàng (vd: 'YD-A', 'YD-D',...)
} = {}): Promise<HotSkuAnalyticsResult> {
  const { timeframe = '30d', fromDate, toDate, group } = params;

  // 1. Kiểm tra cache RAM (phản hồi tức thì < 1ms khi người dùng chuyển đổi tab hoặc bấm lặp lại)
  const cacheKey = `${timeframe}_${fromDate || ''}_${toDate || ''}_${group || ''}`;
  const cached = analyticsCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < ANALYTICS_CACHE_TTL)) {
    return cached.data;
  }

  await initSqliteDb();
  const db = getSqliteDb();

  // Xác định khoảng thời gian lọc SQL
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  let effectiveStartDate = '';
  let effectiveEndDate = '';
  let daysInPeriod = 30;

  const formatDatePrefix = (d: Date) => {
    // Format dạng 2-digit YY-MM-DD tương thích định dạng YunWMS ("26-09-13" hoặc "2026-09-13")
    const y = d.getFullYear();
    const yy = String(y).slice(-2);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return { full: `${y}-${m}-${day}`, short: `${yy}-${m}-${day}` };
  };

  if (timeframe === '7d') {
    daysInPeriod = 7;
    const start = new Date(now.getTime() - 7 * oneDayMs);
    effectiveStartDate = formatDatePrefix(start).short;
  } else if (timeframe === '30d') {
    daysInPeriod = 30;
    const start = new Date(now.getTime() - 30 * oneDayMs);
    effectiveStartDate = formatDatePrefix(start).short;
  } else if (timeframe === '90d') {
    daysInPeriod = 90;
    const start = new Date(now.getTime() - 90 * oneDayMs);
    effectiveStartDate = formatDatePrefix(start).short;
  } else if (timeframe === 'custom' && fromDate) {
    effectiveStartDate = fromDate.slice(2); // VD: 2026-09-01 -> 26-09-01
    effectiveEndDate = toDate ? toDate.slice(2) : '';
    const startMs = new Date(fromDate).getTime();
    const endMs = toDate ? new Date(toDate).getTime() : now.getTime();
    daysInPeriod = Math.max(1, Math.ceil((endMs - startMs) / oneDayMs));
  } else {
    // 'all'
    daysInPeriod = 365; // Mặc định tính run-rate theo năm nếu xem all-time
  }

  // Xây dựng điều kiện WHERE trên bảng items
  const itemWhereClauses: string[] = ["1=1"];
  const itemArgs: any[] = [];

  const ordersWhereClauses: string[] = ["1=1"];
  const ordersArgs: any[] = [];

  if (effectiveStartDate) {
    itemWhereClauses.push("(i.shipped_time >= ?)");
    itemArgs.push(effectiveStartDate);

    ordersWhereClauses.push("(shipped_time >= ?)");
    ordersArgs.push(effectiveStartDate);
  }
  if (effectiveEndDate) {
    itemWhereClauses.push("(i.shipped_time <= ?)");
    itemArgs.push(`${effectiveEndDate} 23:59:59`);

    ordersWhereClauses.push("(shipped_time <= ?)");
    ordersArgs.push(`${effectiveEndDate} 23:59:59`);
  }
  if (group && group !== 'ALL') {
    itemWhereClauses.push("(i.group_name = ?)");
    itemArgs.push(group);
  }

  const whereSql = itemWhereClauses.join(" AND ");
  const ordersWhereSql = ordersWhereClauses.join(" AND ");

  // Dùng hint INDEXED BY idx_items_covering_v2 khi lọc theo ngày để SQLite quét B-Tree siêu tốc < 100ms
  const indexHint = effectiveStartDate ? "INDEXED BY idx_items_covering_v2" : "";

  // Truy vấn tổng hợp trực tiếp trên items (đã bao gồm cờ is_single_sku, KHÔNG CẦN JOIN)
  const query = `
    SELECT 
      i.sku,
      MAX(i.product_title) as product_title,
      MAX(i.group_name) as group_name,
      SUM(i.qty) as total_sold,
      COUNT(i.order_no) as order_count,
      SUM(CASE WHEN i.is_single_sku = 1 THEN 1 ELSE 0 END) as single_sku_orders,
      MIN(i.shipped_time) as first_shipped,
      MAX(i.shipped_time) as last_shipped
    FROM wms_shipped_order_items i ${indexHint}
    WHERE ${whereSql}
    GROUP BY i.sku
    ORDER BY total_sold DESC
  `;

  // Mốc 7 ngày gần nhất để tính gia tốc xu hướng (Trend Velocity 7d vs 30d)
  const start7d = formatDatePrefix(new Date(now.getTime() - 7 * oneDayMs)).short;
  const query7d = `
    SELECT sku, SUM(qty) as qty_7d 
    FROM wms_shipped_order_items INDEXED BY idx_items_covering_v2 
    WHERE shipped_time >= ? 
    GROUP BY sku
  `;

  const [res, totalOrdersRes, res7d, meta] = await Promise.all([
    db.execute({ sql: query, args: itemArgs }),
    db.execute({
      sql: `SELECT count(*) as cnt FROM wms_shipped_orders WHERE ${ordersWhereSql}`,
      args: ordersArgs
    }).catch(() => ({ rows: [{ cnt: 0 }] })),
    db.execute({ sql: query7d, args: [start7d] }).catch(() => ({ rows: [] })),
    getShippedSyncMeta()
  ]);

  const rawRows = res.rows || [];
  let totalSoldVolume = 0;
  let maxOrderCount = 1;
  let maxTotalSold = 1;

  rawRows.forEach(r => {
    const s = Number(r.total_sold || 0);
    const o = Number(r.order_count || 0);
    totalSoldVolume += s;
    if (o > maxOrderCount) maxOrderCount = o;
    if (s > maxTotalSold) maxTotalSold = s;
  });

  // Map sản lượng 7 ngày gần nhất
  const map7d = new Map<string, number>();
  (res7d.rows || []).forEach(r => {
    map7d.set(String(r.sku), Number(r.qty_7d || 0));
  });

  let cumulativeSold = 0;
  let classACount = 0;
  let classBCount = 0;
  let classCCount = 0;
  let classAVolume = 0;
  let classBVolume = 0;
  let classCVolume = 0;
  let viralCount = 0;
  let trendingUpCount = 0;
  let coolingDownCount = 0;

  const items: HotSkuAnalysisItem[] = rawRows.map(r => {
    const sku = String(r.sku || '');
    const productTitle = r.product_title ? String(r.product_title) : '';
    const groupName = r.group_name ? String(r.group_name) : layNhomTuSKU(sku, DEFAULT_SKU_GROUPS);
    const totalSold = Number(r.total_sold || 0);
    const orderCount = Number(r.order_count || 0);
    const singleSkuOrders = Number(r.single_sku_orders || 0);
    const mixSkuOrders = Number(r.mix_sku_orders || 0);
    const velocityDaily = Number((totalSold / Math.max(1, daysInPeriod)).toFixed(2));

    // 1. Tính Gia Tốc Xu Hướng (Trend Velocity 7d vs Period)
    const qty7d = map7d.get(sku) || 0;
    const v7d = Number((qty7d / 7).toFixed(2));
    const trendRatio = velocityDaily > 0 ? Number((v7d / velocityDaily).toFixed(2)) : (qty7d > 0 ? 2.0 : 1.0);

    let trendCategory: 'viral' | 'up' | 'stable' | 'down' = 'stable';
    if (trendRatio >= 1.5 && qty7d >= 10) {
      trendCategory = 'viral';
      viralCount++;
    } else if (trendRatio >= 1.15 && qty7d >= 5) {
      trendCategory = 'up';
      trendingUpCount++;
    } else if (trendRatio < 0.65 && totalSold >= 25) {
      trendCategory = 'down';
      coolingDownCount++;
    } else {
      trendCategory = 'stable';
    }

    // 2. Tính Điểm Ưu Tiên Bố Trí Kho (Slotting Priority Score 0 - 100)
    // Trọng số: 70% Tần suất chạm kệ (Pick Hits / orderCount) + 30% Sản lượng (totalSold)
    const hitScore = (orderCount / maxOrderCount) * 100;
    const volScore = (totalSold / maxTotalSold) * 100;
    const slottingScore = Math.min(100, Math.round(hitScore * 0.7 + volScore * 0.3));

    cumulativeSold += totalSold;
    const cumulativePercentage = totalSoldVolume > 0 
      ? Number(((cumulativeSold / totalSoldVolume) * 100).toFixed(1)) 
      : 100;

    // Phân loại ABC ban đầu theo sản lượng
    let abcRank: 'A' | 'B' | 'C' = 'C';
    let recommendedZone = 'Zone C - Tầng cao / Phía sau kho';
    let recommendedSlotting = 'Khu vực lưu trữ tầng trên hoặc kệ trong cùng (Ít xuất nhập)';

    if (cumulativePercentage <= 80 || (classACount === 0 && totalSoldVolume > 0)) {
      abcRank = 'A';
      recommendedZone = 'Zone A - Vàng (Gần bàn đóng gói, Tầng 1-2)';
      recommendedSlotting = 'Mặt tiền lối đi chính, ngang tầm với (Tầng 1-2) để nhặt hàng siêu tốc';
      classACount++;
      classAVolume += totalSold;
    } else if (cumulativePercentage <= 95) {
      abcRank = 'B';
      recommendedZone = 'Zone B - Trung tâm (Kệ giữa kho)';
      recommendedSlotting = 'Khu vực kệ chuẩn giữa lối đi, tầng 2-3 thuận tiện';
      classBCount++;
      classBVolume += totalSold;
    } else {
      abcRank = 'C';
      classCCount++;
      classCVolume += totalSold;
    }

    return {
      sku,
      productTitle,
      groupName,
      totalSold,
      orderCount,
      singleSkuOrders,
      mixSkuOrders,
      velocityDaily,
      qty7d,
      trendRatio,
      trendCategory,
      slottingScore,
      firstShipped: r.first_shipped ? String(r.first_shipped) : undefined,
      lastShipped: r.last_shipped ? String(r.last_shipped) : undefined,
      abcRank,
      cumulativePercentage,
      recommendedZone,
      recommendedSlotting
    };
  });

  // 3. Phân Tích Cặp SKU Hay Mua Kèm (Basket Affinity) cho Top 25 SKU
  const top25Skus = items.slice(0, 25).map(it => it.sku);
  if (top25Skus.length > 0) {
    try {
      const placeholders = top25Skus.map(() => '?').join(',');
      const affinitySql = `
        SELECT a.sku as sku1, b.sku as sku2, MAX(b.product_title) as title2, COUNT(*) as pair_count
        FROM wms_shipped_order_items a
        JOIN wms_shipped_order_items b ON a.order_no = b.order_no AND a.sku != b.sku
        WHERE a.is_single_sku = 0 AND a.sku IN (${placeholders}) ${effectiveStartDate ? 'AND a.shipped_time >= ?' : ''}
        GROUP BY a.sku, b.sku
        HAVING pair_count >= 2
        ORDER BY a.sku, pair_count DESC;
      `;
      const affinityArgs = effectiveStartDate ? [...top25Skus, effectiveStartDate] : top25Skus;
      const affinityRes = await db.execute({ sql: affinitySql, args: affinityArgs });

      const affinityMap = new Map<string, PairedSkuInfo[]>();
      (affinityRes.rows || []).forEach(r => {
        const s1 = String(r.sku1);
        if (!affinityMap.has(s1)) affinityMap.set(s1, []);
        const list = affinityMap.get(s1)!;
        if (list.length < 3) {
          list.push({
            sku: String(r.sku2),
            pairCount: Number(r.pair_count),
            productTitle: r.title2 ? String(r.title2) : undefined
          });
        }
      });

      items.forEach(it => {
        if (affinityMap.has(it.sku)) {
          it.topPairedSkus = affinityMap.get(it.sku);
        }
      });
    } catch (affinityErr) {
      console.warn('[Basket Affinity Warning]', affinityErr);
    }
  }

  // 4. Tự Động Sinh Danh Sách Nhiệm Vụ Điều Chuyển Kệ (Relocation Action List)
  const relocationTasks: SlottingRelocationTask[] = [];

  // Nhiệm vụ 1: SKU BÙNG NỔ (Viral/Flash sale) -> Cần đôn lên Zone A mặt tiền ngay
  items.filter(it => it.trendCategory === 'viral' && it.abcRank !== 'A').slice(0, 5).forEach(it => {
    relocationTasks.push({
      id: `reloc_viral_${it.sku}`,
      sku: it.sku,
      productTitle: it.productTitle,
      actionType: 'promote_zone_a',
      title: `🚀 Đôn lên Zone A mặt tiền: ${it.sku}`,
      reason: `Tốc độ bán 7 ngày qua tăng vọt gấp ${it.trendRatio}x so với trung bình (Đạt ${it.qty7d} pcs/tuần). Cần đưa ngay về ngang tầm với (Tầng 1-2).`,
      currentZone: it.recommendedZone || 'Zone B/C',
      targetZone: 'Zone A - Vàng (Mặt tiền Tầng 1-2)',
      urgency: 'high',
      potentialVolume: it.totalSold,
      trendCategory: it.trendCategory
    });
  });

  // Nhiệm vụ 2: SKU THOÁI TRÀO (Đang ở Zone A nhưng sức mua giảm mạnh) -> Rút về Zone B nhường chỗ
  items.filter(it => it.trendCategory === 'down' && it.abcRank === 'A').slice(0, 5).forEach(it => {
    relocationTasks.push({
      id: `reloc_down_${it.sku}`,
      sku: it.sku,
      productTitle: it.productTitle,
      actionType: 'demote_zone_b',
      title: `📉 Rút về Zone B kệ giữa: ${it.sku}`,
      reason: `Tốc độ bán 7 ngày qua giảm mạnh (chỉ đạt ${Math.round((it.trendRatio || 0) * 100)}% phong độ). Rút về kệ giữa để nhường chỗ Zone A cho hàng bùng nổ.`,
      currentZone: 'Zone A - Vàng',
      targetZone: 'Zone B - Trung tâm (Kệ giữa)',
      urgency: 'medium',
      potentialVolume: it.totalSold,
      trendCategory: it.trendCategory
    });
  });

  // Nhiệm vụ 3: Cặp sản phẩm hay mua kèm -> Xếp cạnh nhau
  items.filter(it => it.topPairedSkus && it.topPairedSkus.length > 0 && it.topPairedSkus[0].pairCount >= 3).slice(0, 5).forEach(it => {
    const topPair = it.topPairedSkus![0];
    relocationTasks.push({
      id: `reloc_pair_${it.sku}_${topPair.sku}`,
      sku: it.sku,
      productTitle: it.productTitle,
      actionType: 'pair_skus',
      title: `🔗 Ghép ô kệ liền kề: ${it.sku} & ${topPair.sku}`,
      reason: `Đã đi cùng nhau ${topPair.pairCount} lần trong đơn ghép. Đặt cạnh nhau giúp nhặt 1 lần xong cả 2 món, triệt tiêu 50% thời gian đi lại.`,
      currentZone: it.recommendedZone || 'Zone A',
      targetZone: `Cùng dãy kệ với ${topPair.sku}`,
      urgency: 'medium',
      potentialVolume: it.totalSold,
      pairedSku: topPair.sku
    });
  });

  const result: HotSkuAnalyticsResult = {
    success: true,
    timeframe,
    totalOrders: Number(totalOrdersRes.rows[0]?.cnt || meta.totalOrders || 0),
    totalSoldVolume,
    totalUniqueSkus: items.length,
    daysInPeriod,
    startDate: effectiveStartDate,
    endDate: effectiveEndDate,
    classACount,
    classBCount,
    classCCount,
    classAVolume,
    classBVolume,
    classCVolume,
    viralCount,
    trendingUpCount,
    coolingDownCount,
    items,
    relocationTasks,
    meta
  };

  // Lưu vào RAM cache để phục vụ siêu tốc cho các lần truy vấn tiếp theo
  analyticsCache.set(cacheKey, {
    timestamp: Date.now(),
    data: result
  });

  return result;
}

/**
 * Xóa toàn bộ đơn xuất kho (phục vụ reset khi cần)
 */
export async function clearShippedOrders(): Promise<void> {
  await initSqliteDb();
  const db = getSqliteDb();
  await db.batch([
    { sql: "DELETE FROM wms_shipped_order_items;", args: [] },
    { sql: "DELETE FROM wms_shipped_orders;", args: [] },
    { sql: "DELETE FROM wms_sync_meta WHERE key LIKE 'shipped_%';", args: [] }
  ], "write");
  clearAnalyticsCache();
}

