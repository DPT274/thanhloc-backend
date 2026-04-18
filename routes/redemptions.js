const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/gift-redemptions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM gift_redemptions ORDER BY redeemed_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/users/redeem', async (req, res) => {
    const { phone, user_name, gift_name, points_to_deduct } = req.body;
    try {
        const user = await pool.query('SELECT points FROM users WHERE phone = $1', [phone]);
        if (user.rows.length === 0 || user.rows[0].points < points_to_deduct) {
            return res.status(400).json({ message: "Không đủ điểm!" });
        }
        await pool.query('UPDATE users SET points = points - $1 WHERE phone = $2', [points_to_deduct, phone]);
        await pool.query('INSERT INTO gift_redemptions (user_phone, user_name, gift_name, points_used) VALUES ($1, $2, $3, $4)', [phone, user_name, gift_name, points_to_deduct]);
        res.json({ message: "Đổi quà thành công! Đã trừ điểm và lưu lịch sử." });
    } catch (error) {
        res.status(500).json({ message: "Lỗi hệ thống!" });
    }
});

module.exports = router;