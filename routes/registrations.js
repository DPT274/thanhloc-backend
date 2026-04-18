const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.post('/register-activity', async (req, res) => {
    try {
        const { phone, name, activity_id, activity_title, points_reward } = req.body;
        await pool.query(`INSERT INTO users (phone, name, points) VALUES ($1, $2, 0) ON CONFLICT DO NOTHING`, [phone, name]);
        await pool.query('INSERT INTO registrations (phone, name, activity_id, activity_title, points_reward) VALUES ($1, $2, $3, $4, $5)', [phone, name, activity_id, activity_title, points_reward]);
        res.json({ message: "Đã gửi yêu cầu đăng ký!" });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/my-registrations/:phone', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM registrations WHERE phone = $1', [req.params.phone]);
        res.json(r.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/registrations', async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM registrations WHERE status = 'Đang chờ' ORDER BY id DESC");
        res.json(r.rows);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/registrations', async (req, res) => {
    // Sửa lỗi: Lấy thêm activity_id từ req.body
    const { name, phone, activity_id, activity_title, points_reward } = req.body;
    try {
        await pool.query(`INSERT INTO users (phone, name, points) VALUES ($1, $2, 0) ON CONFLICT DO NOTHING`, [phone, name]);
        // Sửa lỗi: Truyền activity_id vào (nếu không có thì dùng null, bỏ số 0)
        await pool.query('INSERT INTO registrations (phone, name, activity_id, activity_title, points_reward) VALUES ($1, $2, $3, $4, $5)', [phone, name, activity_id || null, activity_title, points_reward]);
        res.json({ message: "Đã thêm yêu cầu bằng tay!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/registrations/:id', async (req, res) => {
    const { name, phone, activity_title, points_reward } = req.body;
    try {
        await pool.query('UPDATE registrations SET name = $1, phone = $2, activity_title = $3, points_reward = $4 WHERE id = $5', [name, phone, activity_title, points_reward, req.params.id]);
        res.json({ message: "Đã cập nhật yêu cầu!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/registrations/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM registrations WHERE id = $1', [req.params.id]);
        res.json({ message: "Đã xoá yêu cầu!" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ✅ ĐÃ SỬA: API DUYỆT ĐIỂM HOÀN CHỈNH (CÓ GHI LỊCH SỬ)
router.post('/approve-registration', async (req, res) => {
    const { id, phone, points_reward } = req.body;
    try {
        // 1. Lấy thông tin tên người dùng và tên hoạt động để ghi log
        const regInfo = await pool.query('SELECT name, activity_title FROM registrations WHERE id = $1', [id]);
        const name = regInfo.rows.length > 0 ? regInfo.rows[0].name : 'Người dân';
        const activity_title = regInfo.rows.length > 0 ? regInfo.rows[0].activity_title : 'Hoạt động tình nguyện';

        // 2. Cập nhật trạng thái thành Đã duyệt
        await pool.query("UPDATE registrations SET status = 'Đã duyệt' WHERE id = $1", [id]);

        // 3. Cộng điểm và Ghi lịch sử
        if (points_reward && points_reward > 0) {
            // Đảm bảo User có trong bảng users
            await pool.query(`INSERT INTO users (phone, name, points) VALUES ($1, $2, 0) ON CONFLICT (phone) DO NOTHING`, [phone, name]);

            // Cộng điểm
            await pool.query('UPDATE users SET points = points + $1 WHERE phone = $2', [points_reward, phone]);

            // Ghi vào bảng lịch sử điểm
            const reason = `Thưởng tình nguyện: ${activity_title}`;
            await pool.query('INSERT INTO point_history (phone, name, reason, points) VALUES ($1, $2, $3, $4)', [phone, name, reason, points_reward]);
        }

        res.json({ message: "Đã duyệt và cộng điểm thành công!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;