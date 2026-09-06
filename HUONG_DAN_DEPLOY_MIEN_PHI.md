# HƯỚNG DẪN ĐẨY LÊN HOSTING MIỄN PHÍ ĐỂ SỬ DỤNG

Ứng dụng của bạn gồm 2 phần:
1. **Giao diện Web (Frontend React)**: Bảng phân loại SKU, PCS, Khu vực, Mix, Yoga, In Picking List, Thanh Live Tracker.
2. **Backend API Proxy (Node.js)**: Kết nối trực tiếp tới `https://czwh.wms.yunwms.com` để tránh lỗi bảo mật CORS của trình duyệt.

Dưới đây là **3 cách đẩy lên mạng hoàn toàn MIỄN PHÍ 100%**, dễ thực hiện nhất:

---

## CÁCH 1: DÙNG RENDER.COM (KHUYÊN DÙNG - TỐT NHẤT & ỔN ĐỊNH NHẤT)
> Miễn phí 100%, có sẵn tên miền HTTPS (ví dụ: `https://ten-kho-cua-ban.onrender.com`), chạy ổn định 24/7.

### Bước 1: Đưa code lên GitHub
1. Vào [github.com](https://github.com) đăng nhập (hoặc tạo tài khoản miễn phí).
2. Tạo 1 Repository mới (đặt tên ví dụ: `wms-order-tool`, chọn **Private** hoặc **Public**).
3. Tại thư mục dự án trên máy tính của bạn, mở Terminal gõ:
   ```bash
   git init
   git add .
   git commit -m "Deploy WMS Tool"
   git branch -M main
   git remote add origin https://github.com/TEN_TAI_KHOAN_CUA_BAN/wms-order-tool.git
   git push -u origin main
   ```

### Bước 2: Tạo Web Service trên Render
1. Vào [render.com](https://render.com/) và đăng nhập bằng tài khoản GitHub.
2. Bấm **New +** ➜ Chọn **Web Service**.
3. Chọn Repository `wms-order-tool` vừa đẩy lên.
4. Điền các thông số:
   - **Name**: `wms-tool` (hoặc tên bạn thích)
   - **Region**: Singapore (gần Việt Nam nhất, tốc độ cực nhanh)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free** ($0/tháng)
5. Bấm **Create Web Service**.
   - Chờ khoảng 1-2 phút, Render sẽ cấp cho bạn một đường link HTTPS miễn phí dạng:  
     `https://wms-tool.onrender.com`
   - Bạn có thể gửi link này cho nhân viên, thủ kho dùng trên điện thoại, máy tính bảng hoặc laptop bất cứ đâu!

---

## CÁCH 2: DÙNG CLOUDFLARE TUNNEL (CÓ LINK NGAY TRONG 1 PHÚT - DÙNG MÁY HIỆN TẠI LÀM SERVER)
> Không cần tạo tài khoản host, không cần đẩy code lên GitHub. Dùng ngay máy tính đang bật ở kho để phát link online cho cả kho cùng vào dùng!

Nếu bạn có máy tính mở ở kho, chỉ cần chạy 1 dòng lệnh là có link online công khai:
```bash
npx cloudflared tunnel --url http://localhost:3000
```
Hoặc dùng `localtunnel`:
```bash
npx localtunnel --port 3000
```
Terminal sẽ in ra 1 đường link HTTPS (ví dụ: `https://xyz-abc.trycloudflare.com`). Bạn copy link này dán vào điện thoại hoặc máy khác là dùng được ngay lập tức!

---

## CÁCH 3: DÙNG KOYEB.COM HOẶC RAILWAY.APP
> Thay thế tuyệt vời cho Render, máy chủ Singapore tốc độ cao.

1. Vào [koyeb.com](https://www.koyeb.com/) đăng nhập bằng GitHub.
2. Bấm **Create App** ➜ Chọn **GitHub**.
3. Chọn repo `wms-order-tool`.
4. Điền:
   - **Build command**: `npm install && npm run build`
   - **Run command**: `npm start`
   - **Port**: `3001`
5. Bấm **Deploy**. Có ngay tên miền dạng `https://ten-app.koyeb.app`.
