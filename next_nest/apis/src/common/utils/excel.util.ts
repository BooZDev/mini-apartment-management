import ExcelJS from 'exceljs';

export type ExcelColumn<T> = {
  header: string;
  width?: number;
  value: (row: T) => string | number | null | undefined;
};

/** Một trang tính có dòng tiêu đề in đậm, cố định khi cuộn. */
export async function buildWorkbook<T>(sheetName: string, columns: ExcelColumn<T>[], rows: T[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns.map((c) => ({ header: c.header, width: c.width ?? 16 }));
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) sheet.addRow(columns.map((c) => c.value(row) ?? ''));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
