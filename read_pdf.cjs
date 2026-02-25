const fs = require('fs');

let pdf;
try {
  pdf = require('pdf-parse');
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
  pdf(dataBuffer)
    .then((data) => {
      console.log('---START FILE---');
      console.log(data.text);
      console.log('---END FILE---');
    })
    .catch((err) => {
      console.error('Error parsing PDF:', err);
      process.exitCode = 1;
    });
} catch (err) {
  console.error('Error reading file:', err);
  process.exit(1);
}
