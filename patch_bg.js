const fs = require('fs');

// Patch index.css
const cssPath = 'Dev/src/index.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');
cssContent = cssContent.replace(/background-color: #f5f7fb;/g, 'background-color: #ffffff;');
cssContent = cssContent.replace(/background: #f5f7fb;/g, 'background: #ffffff;');
fs.writeFileSync(cssPath, cssContent);

// Patch ManagerApp.html
const htmlPath = 'Dev/public/ui-hub/ManagerApp.html';
let htmlContent = fs.readFileSync(htmlPath, 'utf8');
const oldStyles = `  .workspace {
    padding-top: 0 !important;
  }`;
const newStyles = `  .workspace {
    padding-top: 0 !important;
  }
  
  body, .workspace {
    background-color: #ffffff !important;
  }`;
htmlContent = htmlContent.replace(oldStyles, newStyles);
fs.writeFileSync(htmlPath, htmlContent);

console.log("Background patched to white!");
