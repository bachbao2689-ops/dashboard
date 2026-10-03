const fs = require('fs');
const files = ['Dev/src/pages/Dashboard.tsx', 'Dev/src/pages/Departments2.tsx'];

const replacements = [
  { regex: /text-\[8px\]/g, replacement: 'text-[10px]' },
  { regex: /text-\[9px\]/g, replacement: 'text-[10px]' },
  { regex: /text-\[10px\]/g, replacement: 'text-xs' },
  { regex: /text-\[10\.5px\]/g, replacement: 'text-xs' },
  { regex: /text-\[11px\]/g, replacement: 'text-xs' },
  { regex: /text-\[11\.5px\]/g, replacement: 'text-xs' },
  { regex: /text-\[12px\]/g, replacement: 'text-sm' },
  { regex: /text-\[12\.5px\]/g, replacement: 'text-sm' },
  { regex: /text-\[13px\]/g, replacement: 'text-sm' },
  { regex: /text-\[14px\]/g, replacement: 'text-sm' },
  { regex: /text-\[15px\]/g, replacement: 'text-base' },
  { regex: /text-\[16px\]/g, replacement: 'text-base' },
  { regex: /text-\[19px\]/g, replacement: 'text-lg' },
  { regex: /text-\[21px\]/g, replacement: 'text-xl' },
  { regex: /text-\[22px\]/g, replacement: 'text-xl' },
  { regex: /text-\[26px\]/g, replacement: 'text-2xl' },
  { regex: /text-\[28px\]/g, replacement: 'text-2xl' },
  { regex: /text-\[32px\]/g, replacement: 'text-3xl' },
  { regex: /text-\[38px\]/g, replacement: 'text-4xl' },
  { regex: /dashboard-scale /g, replacement: '' }
];

files.forEach(path => {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    replacements.forEach(({ regex, replacement }) => {
      content = content.replace(regex, replacement);
    });
    fs.writeFileSync(path, content);
  }
});
