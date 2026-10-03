const fs = require('fs');
const path = 'Dev/src/pages/ProjectsKanban.tsx';
let content = fs.readFileSync(path, 'utf8');

const headerRegex = /<div className="mb-6">\n\s*<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects Kanban<\/h1>\n\s*<p className="text-gray-500 dark:text-gray-400 mt-1">Drag and drop to update status<\/p>\n\s*<\/div>/;

const newHeader = `{ !hideHeader && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects Kanban</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Drag and drop to update status</p>
        </div>
      )}`;

content = content.replace(headerRegex, newHeader);
fs.writeFileSync(path, content);
console.log("ProjectsKanban patched!");
