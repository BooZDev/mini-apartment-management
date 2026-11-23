// Tìm kiếm không dấu (tham số `q`): CSDL không có extension unaccent nên bỏ dấu bằng translate()

const VN_LOWER = 'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ';
const VN_ASCII = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd';
const VN_FROM = VN_LOWER + VN_LOWER.toUpperCase();
const VN_TO = VN_ASCII + VN_ASCII;

/** Biểu thức SQL bỏ dấu của một cột; chỉ nhận tên cột do code viết. */
export function sqlUnaccent(columnExpression: string): string {
  return `lower(translate(${columnExpression}, '${VN_FROM}', '${VN_TO}'))`;
}

export function unaccent(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/** Mẫu LIKE "chứa từ khóa", đã thoát % _ \. */
export function likeContains(value: string): string {
  return `%${unaccent(value).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** Số tiền dạng 2.000.000 đ cho nhật ký, thông báo. */
export function formatMoney(amount: number): string {
  return `${amount.toLocaleString('vi-VN')} đ`;
}

export const VN_TRANSLATE_TABLE = { from: VN_FROM, to: VN_TO };
