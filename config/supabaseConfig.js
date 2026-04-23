// file: config/supabaseConfig.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); // Giúp chạy mượt cả ở Local (nếu có file .env)

const supabaseUrl = process.env.SUPABASE_URL;
// Hỗ trợ đọc cả 2 tên biến phổ biến để tránh lỗi
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ LỖI: Thiếu biến môi trường SUPABASE_URL hoặc SUPABASE_SERVICE_KEY");
}

// Khởi tạo Supabase Client
const supabase = createClient(supabaseUrl, supabaseKey);

// BẮT BUỘC EXPORT TRỰC TIẾP NHƯ THẾ NÀY
module.exports = supabase;