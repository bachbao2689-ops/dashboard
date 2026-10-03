const fs = require('fs');
const path = 'Dev/src/pages/DashboardPreview.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '<div className="w-full h-[calc(100vh-120px)] overflow-hidden rounded-3xl">',
  '<div className="w-full h-[calc(100vh-80px)] -mx-4 md:-mx-8 -mt-4 md:-mt-8 -mb-4 w-[calc(100%+32px)] md:w-[calc(100%+64px)] overflow-hidden">'
);

fs.writeFileSync(path, content);
console.log("Frame removed, negative margins applied!");
