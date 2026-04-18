const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/point-history/:phone', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM point_history WHERE phone = $1 ORDER BY created_at DESC', [req.params.phone]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;