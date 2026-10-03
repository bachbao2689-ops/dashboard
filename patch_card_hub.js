const fs = require('fs');
const path = 'Dev/src/index.css';
let content = fs.readFileSync(path, 'utf8');

const oldCardHub = /\.card-hub \{\n  background: radial-gradient\([\s\S]*?border: 1px solid #dce8fa;\n\}/;
const newCardHub = `.card-hub {
  background: radial-gradient(ellipse at 100% 110%, #eaf3ff 0%, transparent 55%), linear-gradient(130deg, #fff, #fcfdff) !important;
  border: 1px solid #dce8fa !important;
  border-radius: 13px !important;
}`;
content = content.replace(oldCardHub, newCardHub);

const oldDarkCardHub = /\.dark \.card-hub \{\n  background: radial-gradient\([\s\S]*?border-color: #334155;\n\}/;
const newDarkCardHub = `.dark .card-hub {
  background: radial-gradient(ellipse at 100% 110%, rgba(30, 58, 100, 0.3) 0%, transparent 55%), #1e293b !important;
  border-color: #334155 !important;
}`;
content = content.replace(oldDarkCardHub, newDarkCardHub);

fs.writeFileSync(path, content);
console.log("Card hub patched!");
