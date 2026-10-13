# RPS Arena Web — Cổng Thi Đấu Trực Tuyến

Giao diện Web Frontend dành cho các đội thi và Ban Tổ Chức cuộc thi Bot Oẳn Tù Tì AI sinh viên (Phương án A).

---

## 🎯 Các Màn Hình Chức Năng Chính

1. **Bảng Xếp Hạng Hệ Thụy Sĩ (Leaderboard)**:
   - Hiển thị thứ hạng 32 đội trực tiếp.
   - Điểm số (Thắng: 3, Hòa: 1, Thua: 0) và hệ số phụ Buchholz.
   - Cập nhật thời gian thực qua **WebSocket live feed** (`SUBSCRIBE_LEADERBOARD`).

2. **32 Đội Thi (Teams Directory)**:
   - Danh sách chi tiết toàn bộ các đội đăng ký.
   - Hiển thị danh sách thành viên (MSSV, Họ tên) và trạng thái nộp bot (`BOT SẴN SÀNG` vs `CHƯA NỘP`).
   - Nút **"Đấu Tập Với Đội Này"** kích hoạt trận đấu tập ngay tức thì.

3. **Nộp Bot & Code Studio (Bot Management)**:
   - Tải lên file bot Python (`.py`).
   - Tự động kiểm tra cú pháp Python (`py_compile`) trước khi chấp nhận.
   - Tính toán và lưu hash SHA-256 để chống gian lận/trùng lặp.
   - Trình xem lại mã nguồn phiên bản hiện tại đang áp dụng (`v1`, `v2`, ...).
   - Hiển thị cảnh báo khi Ban Tổ Chức đã chốt/khóa mã nguồn trước giờ thi đấu.

4. **Đấu Trường Luyện Tập (Practice Arena)**:
   - Chọn đối thủ: **Bot Mẫu BTC** (Random Bot) hoặc bất kỳ đội nào khác trong 32 đội.
   - Thiết lập số lượt (20, 50, 100 lượt).
   - Tự động nhảy sang màn hình Replay ngay khi trận đấu hoàn tất.

5. **Màn Hình Chiếu Trận Đấu & Replay Trực Quan (Esports Stadium)**:
   - Mô phỏng visual bàn đấu giữa 2 Bot.
   - Hiển thị cử chỉ hoạt họa: 🪨 Búa, 📄 Bao, ✂️ Kéo, 🦎 Thằn lằn, 🖖 Spock.
   - Đo thời gian phản hồi (ms) của từng bot qua mỗi lượt (phát hiện vi phạm timeout 100ms).
   - Thanh trượt timeline, nút Tạm dừng / Phát Replay với tốc độ (0.5x, 1x, 2x, 5x).

6. **Bảng Điều Khiển Ban Tổ Chức (BTC Control Room)**:
   - Thống kê tỷ lệ nộp bot hợp lệ của các đội.
   - Nút gạt **Khóa / Mở Khóa Nộp Mã Nguồn**.
   - Nút kích hoạt **Khởi Tranh Vòng Swiss #X** (tự động xếp cặp và đẩy vào Redis BullMQ).

---

## 🚀 Hướng Dẫn Khởi Chạy

```bash
# Di chuyển vào thư mục rps-arena-web
cd rps-arena-web

# Chạy dev server (cổng 3000)
npm run dev
```

Truy cập: `http://localhost:3000` (đã cấu hình sẵn proxy sang API cổng `4000` và WebSocket `/ws`).
