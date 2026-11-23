import { types } from 'pg';

// BIGINT (tiền), NUMERIC (diện tích) đọc thành number; DATE giữ chuỗi YYYY-MM-DD để không lệch múi giờ
types.setTypeParser(types.builtins.INT8, (value: string) => Number(value));
types.setTypeParser(types.builtins.NUMERIC, (value: string) => Number(value));
types.setTypeParser(types.builtins.DATE, (value: string) => value);
