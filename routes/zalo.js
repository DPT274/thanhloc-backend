// File: routes/zalo.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../config/db');

// LƯU Ý: Đưa ZALO_SECRET_KEY và ZALO_ACCESS_TOKEN vào file .env trên Render
const ZALO_SECRET_KEY = process.env.ZALO_SECRET_KEY;

router.post('/decrypt-phone', async (req, res) => {
    const { token, name, avatar } = req.body;

    if (!token) return res.status(400).json({ error: "Thiếu token từ Zalo" });

    try {
        // 1. Gọi API của Zalo để giải mã Token ra số điện thoại
        const response = await axios.get('https://graph.zalo.me/v2.0/me/info', {
            headers: {
                'access_token': process.env.ZALO_ACCESS_TOKEN, // Token của Zalo OA hoặc App
                'code': token,
                'secret_key': ZALO_SECRET_KEY
            }
        });

        // Kiểm tra xem Zalo có trả về số không
        if (response.data && response.data.data && response.data.data.number) {
            // Zalo thường trả về định dạng 849xxxx, ta chuyển về 09xxxx
            let phoneNumber = response.data.data.number;
            if (phoneNumber.startsWith('84')) {
                phoneNumber = '0' + phoneNumber.slice(2);
            }

            // 2. LƯU/CẬP NHẬT NGƯỜI DÂN VÀO DATABASE CỦA BẠN LUÔN
            await pool.query(
                `INSERT INTO users (phone, name, points) 
                 VALUES ($1, $2, 0) 
                 ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name`,
                [phoneNumber, name || "Người dân"]
            );

            // Trả số điện thoại thật về cho Frontend hiển thị
            res.json({ phoneNumber: phoneNumber, message: "Giải mã thành công" });
        } else {
            console.error("Zalo API Error:", response.data);
            res.status(400).json({ error: "Không thể giải mã số điện thoại" });
        }

    } catch (error) {
        console.error("Lỗi khi gọi Zalo API:", error.message);
        res.status(500).json({ error: "Lỗi máy chủ khi giải mã" });
    }
});

module.exports = router;