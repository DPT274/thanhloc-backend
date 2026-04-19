const express = require('express');
const router = express.Router();

// ✅ API WEBHOOK CHO ZALO
router.post('/webhook/zalo', (req, res) => {
    try {
        console.log("Zalo Webhook nhận được dữ liệu:", req.body);
        // Zalo chỉ cần thấy server trả về mã 200 OK là sẽ cho qua
        res.status(200).send({ success: true, message: "Webhook received" });
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

// BẮT BUỘC PHẢI CÓ DÒNG NÀY ĐỂ TRÁNH LỖI "must be a function"
module.exports = router;