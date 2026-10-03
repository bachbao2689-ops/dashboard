const fs = require('fs');

// 1. Update index.html
const htmlPath = 'Dev/index.html';
let htmlContent = fs.readFileSync(htmlPath, 'utf8');
const googleFonts = `    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <title>K COFFEE</title>`;
htmlContent = htmlContent.replace('<title>K COFFEE</title>', googleFonts);
fs.writeFileSync(htmlPath, htmlContent);

// 2. Update index.css
const cssPath = 'Dev/src/index.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');
cssContent = cssContent.replace(
  "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',",
  "font-family: 'Barlow', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',"
);
fs.writeFileSync(cssPath, cssContent);

// 3. Update tailwind.config.js
const twPath = 'Dev/tailwind.config.js';
let twContent = fs.readFileSync(twPath, 'utf8');
twContent = twContent.replace(
  "colors: {",
  "fontFamily: { sans: ['Barlow', 'sans-serif'] },\n      colors: {"
);
fs.writeFileSync(twPath, twContent);

console.log("Font setup applied!");
