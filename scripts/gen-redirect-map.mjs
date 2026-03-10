import fs from 'fs';
import { parse } from 'csv-parse/sync';

const CSV_FILES = [
  'Shopify redirects - Salisbury & Co.csv',
  'Shopify redirects - Yaxell.csv',
  'Shopify redirects - Wolstead (Ready).csv',
];

const exactMap = {};
const wildcardMap = {};
let totalSkipped = 0;
let totalErrors = 0;

for (const file of CSV_FILES) {
  console.log(`\nProcessing: ${file}`);

  if (!fs.existsSync(file)) {
    console.log(`  Skipping - file not found`);
    continue;
  }

  const csv = fs.readFileSync(file);
  const records = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    escape: '"',
    quote: '"'
  });

  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNumber = i + 2;

    if (!row['Source'] || !row['Redirect'] ||
        row['Source'].trim() === '' || row['Redirect'].trim() === '') {
      skippedCount++;
      continue;
    }

    try {
      const fromPath = new URL(row['Source'].trim()).pathname;
      const toUrl = row['Redirect'].trim();

      let toPath;
      if (toUrl.startsWith('http')) {
        toPath = toUrl;
      } else if (toUrl.startsWith('www.')) {
        toPath = 'https://' + toUrl;
      } else {
        toPath = toUrl;
      }

      const normalizedFrom = fromPath.replace(/\/$/, '');

      if (normalizedFrom.endsWith('*')) {
        const base = normalizedFrom.replace(/\*$/, '');
        wildcardMap[base] = toPath;
      } else {
        exactMap[normalizedFrom] = toPath;
      }
    } catch (error) {
      console.log(`  Row ${rowNumber}: Error - ${error.message}`);
      errorCount++;
    }
  }

  console.log(`  Rows: ${records.length}, Skipped: ${skippedCount}, Errors: ${errorCount}`);
  totalSkipped += skippedCount;
  totalErrors += errorCount;
}

const combinedMap = { ...exactMap, ...wildcardMap };

fs.writeFileSync(
  'redirect-map.json',
  JSON.stringify(combinedMap, null, 2)
);

console.log(`\nTotal redirects written: ${Object.keys(combinedMap).length}`);
console.log(`Total skipped: ${totalSkipped}, Total errors: ${totalErrors}`);
