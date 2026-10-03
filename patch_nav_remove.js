const fs = require('fs');

// 1. Remove from App.tsx
const appPath = 'Dev/src/App.tsx';
let appContent = fs.readFileSync(appPath, 'utf8');
appContent = appContent.replace(/<Route path="projects" element=\{<ProjectsKanban \/>\} \/>\n\s*/, '');
// and remove the import
appContent = appContent.replace(/import \{ ProjectsKanban \} from '\.\/pages\/ProjectsKanban';\n/, '');
fs.writeFileSync(appPath, appContent);

// 2. Remove from Sidebar.tsx
const sidebarPath = 'Dev/src/components/layouts/Sidebar.tsx';
let sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
sidebarContent = sidebarContent.replace(/\{\s*name:\s*t\('nav\.projects'\),\s*path:\s*'\/projects',\s*icon:\s*<FolderKanban size=\{18\} \/>\s*\},\n\s*/, '');
fs.writeFileSync(sidebarPath, sidebarContent);

// 3. Remove from Header.tsx
const headerPath = 'Dev/src/components/layouts/Header.tsx';
let headerContent = fs.readFileSync(headerPath, 'utf8');
headerContent = headerContent.replace(/\{\s*name:\s*t\('nav\.projects'\),\s*path:\s*'\/projects',\s*icon:\s*<FolderKanban size=\{18\} \/>\s*\},\n\s*/, '');
fs.writeFileSync(headerPath, headerContent);

console.log("Removed Kanban route from navs!");
