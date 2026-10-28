import XLSX from 'xlsx';

const wb = XLSX.readFile('scripts/upload-check-out.xls');
for (const name of wb.SheetNames) {
  console.log(`=== Sheet: ${name} ===`);
  const sheet = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  rows.slice(0, 15).forEach(r => console.log(r));
}
