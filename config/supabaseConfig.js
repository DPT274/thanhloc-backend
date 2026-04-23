require('dotenv').config(); // Dòng này cực kỳ quan trọng để đọc file .env
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// Kiểm tra xem đã lấy được biến môi trường chưa (Sẽ báo lỗi nếu chưa lấy được)
if (!supabaseUrl || !supabaseKey) {
    console.error("🚨 THIẾU SUPABASE_URL HOẶC SUPABASE_SERVICE_KEY TRONG FILE .ENV");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

module.exports = supabase;