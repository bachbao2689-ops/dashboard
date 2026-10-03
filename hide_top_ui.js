const fs = require('fs');
const path = 'Dev/public/ui-hub/ManagerApp.html';
let content = fs.readFileSync(path, 'utf8');

// Check if we already injected a custom style block
const customStyleRegex = /<style id="custom-overrides">[\s\S]*?<\/style>/;
const newStyles = `
<style id="custom-overrides">
  .top-nav,
  .page-heading,
  .context-bar,
  #kpis {
    display: none !important;
  }
  
  /* Make the workspace take the full height without the padding of the top nav */
  .workspace {
    padding-top: 1rem !important;
  }
</style>
`;

if (customStyleRegex.test(content)) {
  content = content.replace(customStyleRegex, newStyles);
} else {
  content = content.replace('</head>', newStyles + '</head>');
}

fs.writeFileSync(path, content);
console.log("Top UI hidden in ManagerApp.html!");
