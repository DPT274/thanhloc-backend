const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Lấy danh sách khảo sát
router.get('/surveys', async (req, res) => {
    const result = await pool.query('SELECT * FROM surveys ORDER BY id DESC');
    res.json(result.rows);
});

// Admin tạo bài khảo sát (có lưu kèm points_reward)
router.post('/surveys', async (req, res) => {
    const { title, description, questions } = req.body;
    await pool.query('INSERT INTO surveys (title, description, questions) VALUES ($1, $2, $3)', [title, description, JSON.stringify(questions)]);
    res.json({ success: true });
});

// Admin xoá bài khảo sát
router.delete('/surveys/:id', async (req, res) => {
    await pool.query('DELETE FROM surveys WHERE id = $1', [req.params.id]);
    res.json({ success: true });
});

// ✅ TRẢ LỜI KHẢO SÁT & TỰ ĐỘNG NHẬN ĐIỂM THEO CÀI ĐẶT CỦA ADMIN
router.post('/survey-responses', async (req, res) => {
    const { survey_id, user_name, answers } = req.body;
    const phone = answers.phone;

    try {
        if (phone) {
            // Kiểm tra chống spam (1 SĐT chỉ làm 1 lần)
            const checkExist = await pool.query(
                "SELECT id FROM survey_responses WHERE survey_id = $1 AND answers->>'phone' = $2",
                [survey_id, phone]
            );
            if (checkExist.rows.length > 0) return res.status(400).json({ message: "Bạn đã hoàn thành khảo sát này rồi!" });
        }

        // Lưu câu trả lời của người dân
        await pool.query('INSERT INTO survey_responses (survey_id, user_name, answers) VALUES ($1, $2, $3)', [survey_id, user_name, JSON.stringify(answers)]);

        if (phone) {
            // Lấy thông tin bài khảo sát để xem Admin cài đặt bao nhiêu điểm
            const surveyRes = await pool.query('SELECT title, questions FROM surveys WHERE id = $1', [survey_id]);
            if (surveyRes.rows.length > 0) {
                const survey = surveyRes.rows[0];
                let questionsData = {};

                try {
                    questionsData = typeof survey.questions === 'string' ? JSON.parse(survey.questions) : (survey.questions || {});
                } catch (e) {
                    console.log("Lỗi đọc JSON:", e);
                }

                // 🎯 ĐÂY LÀ CHÌA KHÓA: Lấy chính xác số điểm Admin đã nhập. Nếu Admin không nhập (hoặc nhập 0) thì thưởng 0 điểm.
                const pointsReward = questionsData.points_reward ? Number(questionsData.points_reward) : 0;

                // Nếu Admin có cài đặt điểm thưởng (>0) thì mới thực hiện cộng điểm
                if (pointsReward > 0) {
                    // 1. Đảm bảo User có trong bảng users
                    await pool.query(`INSERT INTO users (phone, name, points) VALUES ($1, $2, 0) ON CONFLICT (phone) DO NOTHING`, [phone, user_name || 'Người dân']);

                    // 2. Cộng điểm
                    await pool.query('UPDATE users SET points = points + $1 WHERE phone = $2', [pointsReward, phone]);

                    // 3. GHI VÀO LỊCH SỬ (Để hiện lên tab Lịch sử)
                    const reason = `Thưởng làm khảo sát: ${survey.title}`;
                    await pool.query('INSERT INTO point_history (phone, name, reason, points) VALUES ($1, $2, $3, $4)', [phone, user_name, reason, pointsReward]);
                }
            }
        }
        res.json({ success: true, message: "Cảm ơn bạn đã đóng góp ý kiến!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Lấy danh sách người đã trả lời (Dành cho Admin)
router.get('/survey-responses', async (req, res) => {
    const result = await pool.query(`SELECT r.*, s.title as survey_title FROM survey_responses r JOIN surveys s ON r.survey_id = s.id ORDER BY r.submitted_at DESC`);
    res.json(result.rows);
});

// ✅ API XOÁ KẾT QUẢ KHẢO SÁT CỦA NGƯỜI DÂN TỪ ADMIN
router.delete('/survey-responses/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM survey_responses WHERE id = $1', [req.params.id]);
        res.json({ message: "Đã xoá kết quả thành công!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ API LẤY DANH SÁCH BÀI KHẢO SÁT USER ĐÃ HOÀN THÀNH (Có kèm thông tin để hiển thị bên Tab "Đã làm")
router.get('/completed/:phone', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.id as response_id, r.survey_id, r.submitted_at, s.title, s.description 
            FROM survey_responses r
            JOIN surveys s ON r.survey_id = s.id
            WHERE r.answers->>'phone' = $1
            ORDER BY r.submitted_at DESC
        `, [req.params.phone]);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;