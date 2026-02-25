import fs from 'fs';

let parsePdf;
try {
  const mod = await import('pdf-parse');
  parsePdf = typeof mod.default === 'function' ? mod.default : mod;
} catch {
  console.error("Missing dependency: pdf-parse. Run 'npm install' first.");
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  console.error('Please provide a file path');
  process.exit(1);
}

if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

try {
  const dataBuffer = fs.readFileSync(file);
  const data = await parsePdf(dataBuffer);
  console.log(data.text);
} catch (err) {
  console.error('Error parsing PDF:', err);
  process.exit(1);
}
