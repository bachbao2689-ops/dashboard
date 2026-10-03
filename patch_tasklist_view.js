const fs = require('fs');
const path = 'Dev/src/pages/TaskList.tsx';
let content = fs.readFileSync(path, 'utf8');

const filterBarRegex = /<div className="card-hub rounded-2xl p-4 flex flex-wrap justify-between items-center gap-4 relative z-20">/;

const newFilterBar = `{viewMode === 'kanban' ? (
        <div className="-mt-2 flex-1 flex flex-col"><ProjectsKanban hideHeader={true} /></div>
      ) : (
      <>
      <div className="card-hub rounded-2xl p-4 flex flex-wrap justify-between items-center gap-4 relative z-20">`;

content = content.replace(filterBarRegex, newFilterBar);

const endDivRegex = /<\/div>\n\s*<\/div>\n\s*\);/;
const newEndDiv = `</>\n      )}\n      </div>\n    </div>\n  );`;

content = content.replace(endDivRegex, newEndDiv);

fs.writeFileSync(path, content);
console.log("TaskList view mode patched!");
