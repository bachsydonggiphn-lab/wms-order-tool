import XLSX from 'xlsx';

const wb = XLSX.readFile('scripts/upload-check-out.xls');
console.log('Sheet names:', wb.SheetNames);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
console.log('Rows in upload-check-out.xls:');
rows.slice(0, 10).forEach(r => console.log(r));
