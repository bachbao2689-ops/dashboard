const fs = require('fs');
const path = 'Dev/src/index.css';
let content = fs.readFileSync(path, 'utf8');

// Ensure button, input, select, textarea use the same font
if (!content.includes('button, input, select, textarea {')) {
  content = content.replace('body {', 'body, button, input, select, textarea {\n  font-family: \'Barlow\', sans-serif;\n}\n\nbody {');
  fs.writeFileSync(path, content);
}
