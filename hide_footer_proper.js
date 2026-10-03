const fs = require('fs');
const htmlPath = 'Dev/public/ui-hub/ManagerApp.html';
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Remove the incorrect injection
htmlContent = htmlContent.replace('  footer { display: none !important; }\\n</style>', '</style>');

// Inject into custom-overrides
htmlContent = htmlContent.replace(
  '<style id="custom-overrides">',
  '<style id="custom-overrides">\\n  footer { display: none !important; }'
);

fs.writeFileSync(htmlPath, htmlContent);
console.log("Footer properly hidden in custom-overrides!");
