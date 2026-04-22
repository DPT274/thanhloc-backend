const express = require('express');
const router = express.Router();
const pool = require('../config/db');

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM documents ORDER BY id DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    const { name, image, link } = req.body;
    try {
        await pool.query('INSERT INTO documents (name, image, link) VALUES ($1, $2, $3)', [name, image, link]);
        res.json({ message: "OK" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cập nhật thông tin Tra cứu văn bản
router.put('/:id', async (req, res) => {
    const { name, image, link } = req.body;
    try {
        await pool.query(
            'UPDATE documents SET name = $1, image = $2, link = $3 WHERE id = $4',
            [name, image, link, req.params.id]
        );
        res.json({ message: "Cập nhật thành công" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM documents WHERE id = $1', [req.params.id]);
        res.json({ message: "Xóa thành công" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;