import fs from 'fs';
import { parse } from 'csv-parse/sync';

const csv = fs.readFileSync(
  'Shopify redirects - Yaxell.csv'
);

const records = parse(csv, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
  relax_quotes: true,
  escape: '"',
  quote: '"'
});

const exactMap = {};
const wildcardMap = {};
let skippedCount = 0;
let errorCount = 0;

for (let i = 0; i < records.length; i++) {
  const row = records[i];
  const rowNumber = i + 2;

  // Skip if either URL is missing or empty
  if (!row['Source'] || !row['Redirect'] ||
      row['Source'].trim() === '' || row['Redirect'].trim() === '') {
    console.log(`Row ${rowNumber}: Skipping - missing URL(s)`);
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
    console.log(`Row ${rowNumber}: Error parsing URLs - ${error.message}`);
    console.log(`  Source: ${row['Source']}`);
    console.log(`  Redirect: ${row['Redirect']}`);
    errorCount++;
  }
}

const combinedMap = { ...exactMap, ...wildcardMap };

fs.writeFileSync(
  'redirect-map.json',
  JSON.stringify(combinedMap, null, 2)
);

console.log(`\nProcessing Summary:`);
console.log(`Total rows in CSV: ${records.length}`);
console.log(`Exact redirects: ${Object.keys(exactMap).length}`);
console.log(`Wildcard redirects: ${Object.keys(wildcardMap).length}`);
console.log(`Total redirects: ${Object.keys(combinedMap).length}`);
console.log(`Skipped (missing URLs): ${skippedCount}`);
console.log(`Errors (invalid URLs): ${errorCount}`);
