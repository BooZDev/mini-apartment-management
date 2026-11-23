import { likeContains, unaccent, VN_TRANSLATE_TABLE } from '../text.util';

describe('text.util', () => {
  it('bỏ dấu, chữ thường', () => {
    expect(unaccent('Nguyễn Văn Á')).toBe('nguyen van a');
    expect(unaccent('ĐỖ THỊ F')).toBe('do thi f');
  });

  it('mẫu LIKE thoát ký tự đặc biệt', () => {
    expect(likeContains('50%_off\\')).toBe('%50\\%\\_off\\\\%');
  });

  it('bảng translate của SQL: hai chuỗi dài bằng nhau, khớp với unaccent', () => {
    // translate() của PostgreSQL thay theo từng ký tự (code point), tách chuỗi cùng cách
    const from = Array.from(VN_TRANSLATE_TABLE.from);
    const to = Array.from(VN_TRANSLATE_TABLE.to);
    expect(from).toHaveLength(to.length);
    from.forEach((ch, i) => expect(unaccent(ch)).toBe(to[i]));
    // Không có dấu nháy đơn: bảng được chèn thẳng vào câu SQL
    expect(VN_TRANSLATE_TABLE.from).not.toContain("'");
  });
});
