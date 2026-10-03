const fs = require('fs');
let html = fs.readFileSync('temp_ManagerApp.html', 'utf8');

const overrides = `
<style id="custom-overrides">
  .site-header,
  .page-heading,
  .context-bar,
  #kpis,
  footer {
    display: none !important;
  }
  
  body, .workspace {
    background-color: transparent !important;
    padding: 0 !important;
    margin: 0 !important;
  }
</style>
</head>`;

html = html.replace('</head>', overrides);

fs.writeFileSync('Dev/public/ui-hub/ManagerApp.html', html);
console.log("Restored ManagerApp.html with pure visibility overrides!");
