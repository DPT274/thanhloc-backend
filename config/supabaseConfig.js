const supabase = require('../config/supabaseConfig');

// 1. Hàm Upload ảnh (đã có)
const uploadImageToSupabase = async (fileBuffer, fileName, mimeType, folderName) => {
    const filePath = `${folderName}/${Date.now()}_${fileName}`;
    const { data, error } = await supabase.storage
        .from('apd_public_assets')
        .upload(filePath, fileBuffer, {
            contentType: mimeType,
            upsert: true
        });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
        .from('apd_public_assets')
        .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
};

// 2. Hàm XÓA ảnh (MỚI THÊM VÀO)
const deleteImageFromSupabase = async (imageUrl) => {
    try {
        // Nếu không có link ảnh thì thôi, bỏ qua
        if (!imageUrl) return;

        // Tách lấy đường dẫn thật của file từ cái Link dài thò lò
        // VD: .../apd_public_assets/banners/1234_anh.jpg -> lấy chữ "banners/1234_anh.jpg"
        const parts = imageUrl.split('apd_public_assets/');
        if (parts.length < 2) return;

        const filePath = parts[1];

        // Ra lệnh cho Supabase tiêu huỷ file đó
        const { error } = await supabase.storage
            .from('apd_public_assets')
            .remove([filePath]);

        if (error) {
            console.error("Lỗi khi xoá file trên Supabase:", error);
        } else {
            console.log("✅ Đã dọn dẹp ảnh cũ trong Storage thành công!");
        }
    } catch (e) {
        console.error("Lỗi hệ thống khi dọn dẹp ảnh:", e);
    }
};

// Xuất cả 2 hàm ra để dùng
module.exports = { uploadImageToSupabase, deleteImageFromSupabase };