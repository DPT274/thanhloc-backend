// file: routes/webhook.js
const express = require('express');
const router = express.Router();

router.post('/webhook/zalo', (req, res) => {
    try {
        console.log("Zalo Webhook nhận được dữ liệu:", req.body);
        res.status(200).send({ success: true, message: "Webhook received" });
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).send("Internal Server Error");
    }
});

// ✅ CHÍNH LÀ DÒNG NÀY ĐỂ FIX LỖI ĐÓ
module.exports = router;