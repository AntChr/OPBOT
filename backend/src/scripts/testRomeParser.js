const XLSX = require('xlsx');
const path = require('path');

const file = path.join(__dirname, '..', '..', 'data', 'rome', 'rome_metiers.xlsx');
const workbook = XLSX.readFile(file);
const sheetName = workbook.SheetNames[1];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

const metiers = new Map();

data.forEach(row => {
  const lettre = String(row[' '] || '').trim();
  const num1 = String(row[' _1'] || '').trim();
  const num2 = String(row[' _2'] || '').trim();
  const libelle = String(row[' _3'] || '').trim();

  if (lettre && num1 && num2.length === 2 && libelle) {
    const code = lettre + num1 + num2;

    if (/^[A-N]\d{4}$/.test(code)) {
      if (!metiers.has(code)) {
        metiers.set(code, {
          code: code,
          libelle: libelle,
          appellations: []
        });
      } else {
        // C'est une appellation
        metiers.get(code).appellations.push(libelle);
      }
    }
  }
});

console.log('Métiers trouvés:', metiers.size);
console.log('');
console.log('Premiers 10 métiers:');
let count = 0;
for (const [code, data] of metiers) {
  console.log(`${code} - ${data.libelle} (${data.appellations.length} appellations)`);
  count++;
  if (count >= 10) break;
}
