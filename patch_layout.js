const fs = require('fs');

// Fix ProjectsKanban.tsx
let pkPath = 'Dev/src/pages/ProjectsKanban.tsx';
let pkContent = fs.readFileSync(pkPath, 'utf8');
pkContent = pkContent.replace(
  '<div className="h-full flex -mx-4 md:-mx-8 px-4 md:px-8">',
  '<div className={hideHeader ? "h-full flex" : "h-full flex -mx-4 md:-mx-8 px-4 md:px-8"}>'
);
fs.writeFileSync(pkPath, pkContent);

// Fix TaskList.tsx
let tlPath = 'Dev/src/pages/TaskList.tsx';
let tlContent = fs.readFileSync(tlPath, 'utf8');

// Replace the block
// We'll use split/join or string replacement
const searchStart = "{viewMode === 'kanban' ? (\\s*<div className=\"-mx-4 md:-mx-8 flex-1 flex flex-col\"><ProjectsKanban hideHeader=\\{true\\} /><\\/div>\\s*) : \\(\\s*<>\\s*<div className=\"card-hub rounded-2xl p-4 flex flex-wrap justify-between items-center gap-4 relative z-20\">";

const filterBarRegex = /\{viewMode === 'kanban' \? \(\s*<div className="-mx-4 md:-mx-8 flex-1 flex flex-col"><ProjectsKanban hideHeader=\{true\} \/><\/div>\s*\) : \(\s*<>\s*<div className="card-hub rounded-2xl p-4 flex flex-wrap justify-between items-center gap-4 relative z-20">/;

tlContent = tlContent.replace(filterBarRegex, '<div className="card-hub rounded-2xl p-4 flex flex-wrap justify-between items-center gap-4 relative z-20">');

// Now we need to insert the `{viewMode === 'kanban' ? ... : <>` AFTER the filter panel closing div.
// Filter panel ends with `</button>\n            <FilterPanel ... onApply={() => {}} />\n        </div>\n      </div>`
const filterEndRegex = /<FilterPanel isOpen=\{showFilters\} onClose=\{\(\) => setShowFilters\(false\)\} filters=\{filters\} setFilters=\{setFilters\} onApply=\{\(\) => \{\}\} \/>\n\s*<\/div>\n\s*<\/div>/;

const newFilterEnd = `<FilterPanel isOpen={showFilters} onClose={() => setShowFilters(false)} filters={filters} setFilters={setFilters} onApply={() => {}} />
        </div>
      </div>
      
      {viewMode === 'kanban' ? (
        <div className="flex-1 flex flex-col min-h-[600px] mt-2"><ProjectsKanban hideHeader={true} /></div>
      ) : (
      <>`;

tlContent = tlContent.replace(filterEndRegex, newFilterEnd);

fs.writeFileSync(tlPath, tlContent);
console.log("Layout patched!");
