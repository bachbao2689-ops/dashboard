const fs = require('fs');
const path = 'Dev/public/ui-hub/ManagerApp.html';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'body {\\n    background-color: #ffffff !important;',
  'body {\\n    background-color: transparent !important;'
);

fs.writeFileSync(path, content);
console.log("Made ManagerApp body transparent!");
