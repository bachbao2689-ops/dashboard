const fs = require('fs');
const path = 'Dev/public/ui-hub/ManagerApp.html';
let content = fs.readFileSync(path, 'utf8');

const customStyleRegex = /<style id="custom-overrides">[\s\S]*?<\/style>/;
const newStyles = `
<style id="custom-overrides">
  /* Hide all top elements requested by user */
  .site-header,
  .page-heading,
  .context-bar,
  #kpis {
    display: none !important;
  }
  
  /* Make the workspace take the full height without the padding of the top nav */
  .workspace {
    padding: 0 !important;
    margin: 0 !important;
  }

  body {
    background-color: #ffffff !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  /* Restore the stroke/shadow overrides from earlier */
  .panel, .kpi-card, .tw-task-card, .tw-kanban-col {
    box-shadow: none !important;
    border: 1px solid #dce8fa !important;
  }
</style>
`;

content = content.replace(customStyleRegex, newStyles);
fs.writeFileSync(path, content);
console.log("Styles fixed and combined with zero padding!");
