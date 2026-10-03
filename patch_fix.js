const fs = require('fs');
const path = 'Dev/src/components/layouts/Header.tsx';
let content = fs.readFileSync(path, 'utf8');

// Remove the incorrect navItems injection
const brokenRegex = /\s*const navItems = \[[\s\S]*?\];\n\n  return \(\) => document\.removeEventListener/m;
content = content.replace(brokenRegex, "\n    return () => document.removeEventListener");

// Add navItems right before the main return
const mainReturnRegex = /  return \(\n    <>\n    <header/m;
const navItemsDef = `
  const navItems = [
    { name: t('nav.home'), path: '/', icon: <Home size={18} /> },
    { name: 'Dashboard', path: '/ui-dashboard', icon: <BarChart2 size={18} /> },
    { name: t('nav.tasks'), path: '/tasks', icon: <CheckSquare size={18} /> },
    { name: t('nav.projects'), path: '/projects', icon: <FolderKanban size={18} /> },
    { name: t('nav.myTasks'), path: '/my-tasks', icon: <Users size={18} /> },
    { name: t('nav.designTeam'), path: '/project', icon: <AlertCircle size={18} /> },
    { name: t('nav.inventory'), path: '/assets', icon: <Box size={18} /> },
    { name: t('nav.borrow'), path: '/borrow-requests', icon: <History size={18} /> },
    { name: t('nav.team'), path: '/team', icon: <Users size={18} /> },
    { name: 'Members', path: '/members', icon: <Users size={18} /> },
    { name: t('nav.reports'), path: '/reports', icon: <BarChart2 size={18} /> },
  ];

  return (
    <>
    <header`;

content = content.replace(mainReturnRegex, navItemsDef);
fs.writeFileSync(path, content);
