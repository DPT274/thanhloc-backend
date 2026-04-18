const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// ==========================================
// 1. API QUẢN LÝ LINK (TAB 1)
// ==========================================
router.get('/links', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM admin_links ORDER BY id DESC');
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/links', async (req, res) => {
    try {
        const { title, image, link } = req.body;
        await pool.query('INSERT INTO admin_links (title, image, link) VALUES ($1, $2, $3)', [title, image, link]);
        res.json({ message: "OK" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/links/:id', async (req, res) => {
    try {
        const { title, image, link } = req.body;
        await pool.query('UPDATE admin_links SET title = $1, image = $2, link = $3 WHERE id = $4', [title, image, link, req.params.id]);
        res.json({ message: "OK" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/links/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM admin_links WHERE id = $1', [req.params.id]);
        res.json({ message: "OK" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================
// 2. API NGƯỜI DÂN NỘP MINH CHỨNG
// ==========================================
router.post('/submissions', async (req, res) => {
    try {
        const { phone, name, image } = req.body;
        await pool.query('INSERT INTO admin_submissions (phone, name, image) VALUES ($1, $2, $3)', [phone, name, image]);
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

// ✅ MỚI: SỬA HỒ SƠ TỪ ADMIN
router.put('/submissions/:id', async (req, res) => {
    try {
        const { name, phone, status } = req.body;
        await pool.query('UPDATE admin_submissions SET name = $1, phone = $2, status = $3 WHERE id = $4', [name, phone, status, req.params.id]);
        res.json({ message: "Cập nhật thành công!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ✅ MỚI: XOÁ HỒ SƠ TỪ ADMIN
router.delete('/submissions/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM admin_submissions WHERE id = $1', [req.params.id]);
        res.json({ message: "Đã xoá hồ sơ!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DUYỆT (CỘNG ĐIỂM)
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

// TỪ CHỐI
router.put('/submissions/:id/reject', async (req, res) => {
    try {
        await pool.query("UPDATE admin_submissions SET status = 'Từ chối' WHERE id = $1", [req.params.id]);
        res.json({ message: "Đã từ chối!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;