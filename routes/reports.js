const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
    try {
        const r = await pool.query('SELECT id, name, phone, title, content, image, latitude, longitude, status, created_at FROM reports ORDER BY id DESC');
        res.json(r.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const { name, phone, title, content, image, latitude, longitude } = req.body;
        await pool.query(
            'INSERT INTO reports (name, phone, title, content, image, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [name, phone, title, content, image || "", latitude || "", longitude || ""]
        );
        res.json({ message: "OK" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM reports WHERE id = $1', [req.params.id]);
        res.json({ message: "Đã xoá phản ánh thành công!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ ADMIN DUYỆT PHẢN ÁNH & CỘNG ĐIỂM
router.put('/:id', async (req, res) => {
    const { status, points_reward, phone, name, title } = req.body;
    try {
        await pool.query('UPDATE reports SET status = $1 WHERE id = $2', [status, req.params.id]);

        if (status === 'Đã xử lý' && points_reward && points_reward > 0) {
            await pool.query(
                `INSERT INTO users (phone, name, points) VALUES ($1, $2, 0) ON CONFLICT (phone) DO NOTHING`,
                [phone, name || 'Người dân']
            );
            await pool.query('UPDATE users SET points = points + $1 WHERE phone = $2', [points_reward, phone]);

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