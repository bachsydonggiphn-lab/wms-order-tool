/**
 * Standalone Backend Server cho Công Cụ Xử Lý Đơn Hàng Kho
 * Kết nối trực tiếp YunWMS API: czwh.wms.yunwms.com
 */

import express from 'express';
import path from 'path';
import { handleWmsApi } from './src/server/wmsApiMiddleware';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS & JSON Parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// WMS API Middleware
app.use((req, res, next) => {
  if (req.url.startsWith('/api/wms')) {
    handleWmsApi(req, res, next);
  } else {
    next();
  }
});

// Serve frontend static build nếu có thư mục dist
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('WMS API Server is running. Chạy "npm run dev" để mở giao diện web.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 WMS API Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`📦 Kết nối WMS cổng: https://czwh.wms.yunwms.com/`);
});
