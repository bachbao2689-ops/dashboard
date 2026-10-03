const fs = require('fs');
const htmlPath = 'Dev/public/ui-hub/ManagerApp.html';
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

if (!htmlContent.includes('footer {\\n    display: none !important;\\n  }')) {
  htmlContent = htmlContent.replace(
    /<\/style>/,
    '  footer { display: none !important; }\n</style>'
  );
  fs.writeFileSync(htmlPath, htmlContent);
  console.log("Footer hidden!");
} else {
  console.log("Footer already hidden!");
}
