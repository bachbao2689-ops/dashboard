const fs = require('fs');
let html = fs.readFileSync('temp_ManagerApp.html', 'utf8');

const overrides = `
<style id="custom-overrides">
  /* Hide top sections */
  .site-header,
  .page-heading,
  .context-bar,
  #kpis,
  footer {
    display: none !important;
  }
  
  /* Make workspace transparent and remove its own padding so it relies on React's padding */
  body, html {
    background-color: transparent !important;
  }
  
  .workspace {
    background-color: transparent !important;
    padding: 0 !important;
    margin: 0 !important;
  }
</style>
</head>`;

html = html.replace('</head>', overrides);

fs.writeFileSync('Dev/public/ui-hub/ManagerApp.html', html);
console.log("ManagerApp.html transparency and padding fixed!");
