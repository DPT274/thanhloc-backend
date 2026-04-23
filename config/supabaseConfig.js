const supabase = require('../config/supabaseConfig');

// 1. HÀM UPLOAD ẢNH
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

// 2. HÀM XÓA ẢNH (Cái "chổi" mà hệ thống đang tìm kiếm)
const deleteImageFromSupabase = async (imageUrl) => {
    try {
        if (!imageUrl) return;

        const parts = imageUrl.split('apd_public_assets/');
        if (parts.length < 2) return;

        const filePath = parts[1];

        const { error } = await supabase.storage
            .from('apd_public_assets')
            .remove([filePath]);

        if (error) {
            console.error("Lỗi khi xoá file trên Supabase:", error);
        }
    } catch (e) {
        console.error("Lỗi hệ thống khi dọn dẹp ảnh:", e);
    }
};

// ĐIỂM QUAN TRỌNG NHẤT LÀ DÒNG NÀY: Phải xuất cả 2 hàm ra thì các file khác mới gọi được!
module.exports = { uploadImageToSupabase, deleteImageFromSupabase };