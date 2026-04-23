const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
// ✅ ĐÃ SỬA: Import thêm hàm deleteImageFromSupabase
const { uploadImageToSupabase, deleteImageFromSupabase } = require('../services/storageService');

// Cấu hình Multer để nhận file ảnh từ Mini App
const upload = multer({ storage: multer.memoryStorage() });

// 1. Lấy danh sách phản ánh (Cho Admin hiển thị)
router.get('/', async (req, res) => {
    try {
        const r = await pool.query('SELECT id, name, phone, title, content, image, latitude, longitude, status, created_at FROM reports ORDER BY id DESC');
        res.json(r.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Thêm phản ánh mới (TỪ NGƯỜI DÂN QUA ZALO MINI APP)
// Chuyển API này để hỗ trợ nhận file (FormData) thay vì JSON thuần
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { name, phone, title, content, latitude, longitude } = req.body;
        let imageUrl = '';

        // Nếu người dân có chụp/chọn ảnh đính kèm
        if (req.file) {
            imageUrl = await uploadImageToSupabase(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype,
                'reports_images' // Lưu vào thư mục riêng biệt
            );
        }

        await pool.query(
            'INSERT INTO reports (name, phone, title, content, image, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [name, phone, title, content, imageUrl, latitude || "", longitude || ""]
        );
        res.json({ message: "OK" });
    } catch (error) {
        console.error("Lỗi khi gửi phản ánh:", error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Xoá phản ánh (Của Admin) - ✅ CÓ DỌN RÁC TRONG KHO
router.delete('/:id', async (req, res) => {
    try {
        // ✅ DỌN RÁC: 1. Lấy link ảnh từ DB trước khi xóa dòng phản ánh
        const data = await pool.query('SELECT image FROM reports WHERE id = $1', [req.params.id]);
        const oldImageUrl = data.rows[0]?.image;

        // 2. Xóa dữ liệu trong Database
        await pool.query('DELETE FROM reports WHERE id = $1', [req.params.id]);

        // 3. Tiêu hủy ảnh hiện trường thật trên Supabase để giải phóng dung lượng
        if (oldImageUrl) {
            await deleteImageFromSupabase(oldImageUrl);
        }

        res.json({ message: "Đã xoá phản ánh thành công!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. ADMIN DUYỆT PHẢN ÁNH & CỘNG ĐIỂM
router.put('/:id', async (req, res) => {
    const { status, points_reward, phone, name, title } = req.body;
    try {
        // Cập nhật trạng thái phản ánh
        await pool.query('UPDATE reports SET status = $1 WHERE id = $2', [status, req.params.id]);

        // Nếu hoàn thành và có thưởng điểm
        if (status === 'Đã xử lý' && points_reward && points_reward > 0) {
            // Đảm bảo user tồn tại trong bảng users
            await pool.query(
                `INSERT INTO users (phone, name, points) VALUES ($1, $2, 0) ON CONFLICT (phone) DO NOTHING`,
                [phone, name || 'Người dân']
            );
            // Cộng điểm
            await pool.query('UPDATE users SET points = points + $1 WHERE phone = $2', [points_reward, phone]);

            // Ghi lịch sử
            const reason = `Thưởng gửi phản ánh: ${title}`;
            await pool.query(
                'INSERT INTO point_history (phone, name, reason, points) VALUES ($1, $2, $3, $4)',
                [phone, name, reason, points_reward]
            );
        }
        res.json({ message: "Cập nhật trạng thái thành công!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;