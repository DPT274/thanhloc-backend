const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
// ✅ ĐÃ SỬA: Import thêm hàm deleteImageFromSupabase
const { uploadImageToSupabase, deleteImageFromSupabase } = require('../services/storageService');

// Cấu hình Multer để nhận file
const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// 1. API QUẢN LÝ LINK (TAB 1) - CÓ UPLOAD SUPABASE
// ==========================================
router.get('/links', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM admin_links ORDER BY id DESC');
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/links', upload.single('image'), async (req, res) => {
    try {
        const { title, link } = req.body;
        let imageUrl = '';

        if (req.file) {
            imageUrl = await uploadImageToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype, 'admin_links');
        }

        await pool.query('INSERT INTO admin_links (title, image, link) VALUES ($1, $2, $3)', [title, imageUrl, link]);
        res.json({ message: "OK" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/links/:id', upload.single('image'), async (req, res) => {
    try {
        const { title, link } = req.body;

        // Lấy link ảnh cũ
        const oldData = await pool.query('SELECT image FROM admin_links WHERE id = $1', [req.params.id]);
        let imageUrl = oldData.rows[0]?.image || '';

        if (req.file) {
            // ✅ Dọn rác: Xóa icon cũ trên Supabase nếu có
            if (imageUrl) {
                await deleteImageFromSupabase(imageUrl);
            }
            // Tải icon mới lên
            imageUrl = await uploadImageToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype, 'admin_links');
        }

        await pool.query('UPDATE admin_links SET title = $1, image = $2, link = $3 WHERE id = $4', [title, imageUrl, link, req.params.id]);
        res.json({ message: "OK" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/links/:id', async (req, res) => {
    try {
        // ✅ Dọn rác: Lấy link ảnh và xóa file vật lý trước
        const data = await pool.query('SELECT image FROM admin_links WHERE id = $1', [req.params.id]);
        const oldImageUrl = data.rows[0]?.image;

        await pool.query('DELETE FROM admin_links WHERE id = $1', [req.params.id]);

        if (oldImageUrl) {
            await deleteImageFromSupabase(oldImageUrl);
        }

        res.json({ message: "OK" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================
// 2. API NGƯỜI DÂN NỘP MINH CHỨNG - CÓ UPLOAD SUPABASE
// ==========================================
router.post('/submissions', upload.single('image'), async (req, res) => {
    try {
        const { phone, name } = req.body;
        let imageUrl = '';

        if (req.file) {
            imageUrl = await uploadImageToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype, 'admin_submissions');
        }

        await pool.query('INSERT INTO admin_submissions (phone, name, image) VALUES ($1, $2, $3)', [phone, name, imageUrl]);
        res.json({ message: "Nộp minh chứng thành công!" });
    } catch (e) {
        console.error("Lỗi khi lưu minh chứng:", e);
        res.status(500).json({ error: "Lỗi hệ thống hoặc ảnh quá lớn!" });
    }
});

router.get('/submissions/user/:phone', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM admin_submissions WHERE phone = $1 ORDER BY created_at DESC', [req.params.phone]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================
// 3. API DÀNH CHO ADMIN QUẢN LÝ MINH CHỨNG
// ==========================================
router.get('/submissions', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM admin_submissions ORDER BY created_at DESC');
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/submissions/:id', async (req, res) => {
    try {
        const { name, phone, status } = req.body;
        await pool.query('UPDATE admin_submissions SET name = $1, phone = $2, status = $3 WHERE id = $4', [name, phone, status, req.params.id]);
        res.json({ message: "Cập nhật thành công!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/submissions/:id', async (req, res) => {
    try {
        // ✅ Dọn rác: Lấy link ảnh hồ sơ trước khi xóa
        const data = await pool.query('SELECT image FROM admin_submissions WHERE id = $1', [req.params.id]);
        const oldImageUrl = data.rows[0]?.image;

        await pool.query('DELETE FROM admin_submissions WHERE id = $1', [req.params.id]);

        // Xóa ảnh hồ sơ trong Supabase
        if (oldImageUrl) {
            await deleteImageFromSupabase(oldImageUrl);
        }

        res.json({ message: "Đã xoá hồ sơ!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/submissions/:id/approve', async (req, res) => {
    const { points_reward, phone, name } = req.body;
    try {
        await pool.query("UPDATE admin_submissions SET status = 'Đã duyệt' WHERE id = $1", [req.params.id]);

        if (points_reward && points_reward > 0) {
            await pool.query(`INSERT INTO users (phone, name, points) VALUES ($1, $2, 0) ON CONFLICT (phone) DO NOTHING`, [phone, name || 'Người dân']);
            await pool.query('UPDATE users SET points = points + $1 WHERE phone = $2', [points_reward, phone]);

            const reason = `Thưởng điểm: Khai báo Hành chính công`;
            await pool.query('INSERT INTO point_history (phone, name, reason, points) VALUES ($1, $2, $3, $4)', [phone, name, reason, points_reward]);
        }
        res.json({ message: "Duyệt thành công!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/submissions/:id/reject', async (req, res) => {
    try {
        await pool.query("UPDATE admin_submissions SET status = 'Từ chối' WHERE id = $1", [req.params.id]);
        res.json({ message: "Đã từ chối!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;