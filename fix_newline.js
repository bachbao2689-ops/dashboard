const fs = require('fs');
const htmlPath = 'Dev/public/ui-hub/ManagerApp.html';
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

htmlContent = htmlContent.replace('<style id="custom-overrides">\\n  footer { display: none !important; }', '<style id="custom-overrides">\n  footer { display: none !important; }');

fs.writeFileSync(htmlPath, htmlContent);
console.log("Newline fixed!");
