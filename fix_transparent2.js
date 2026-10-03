const fs = require('fs');
const path = 'Dev/public/ui-hub/ManagerApp.html';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/background-color:\s*#ffffff\s*!important;/g, 'background-color: transparent !important;');

fs.writeFileSync(path, content);
console.log("Made ManagerApp body transparent properly!");
