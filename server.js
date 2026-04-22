// server.js
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Test đường dẫn gốc
app.get('/', (req, res) => {
    res.send('Backend Thanh Lộc Smart đang chạy trên đám mây! (Đã Refactor 100% hoàn hảo)');
});

// ==========================================
// ĐỊNH TUYẾN (ROUTING) - BẢN HOÀN CHỈNH
// ==========================================

// Nhóm 1: Các tiện ích chung
app.use('/api/press', require('./routes/press'));
app.use('/api/news', require('./routes/news'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/gifts', require('./routes/gifts'));
app.use('/api/banners', require('./routes/banners'));
app.use('/api/hotlines', require('./routes/hotlines'));
app.use('/api/connections', require('./routes/connections'));
app.use('/api/police', require('./routes/police'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/reading', require('./routes/reading'));
app.use('/api/utilities', require('./routes/utilities'));

// Nhóm 2: Module Hành chính Công
app.use('/api/administrative', require('./routes/administrative'));

// Nhóm 3: Module Bình Dân Học Vụ
app.use('/api/education', require('./routes/education'));

// Nhóm 4: Module Kinh Tế - Du Lịch
app.use('/api/tourism', require('./routes/tourism'));

// Nhóm 5: Các module hệ thống đã tách
app.use('/api', require('./routes/system'));

// 🌟 ✅ CHÌA KHOÁ GIẢI QUYẾT LỖI 404 KHẢO SÁT LÀ DÒNG NÀY:
app.use('/api', require('./routes/surveys'));


// Khai báo file webhook mới tạo
app.use('/api', require('./routes/webhook'));


// Khởi động server
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});

// Build moi nhat: 22/04/2026 - 18h20