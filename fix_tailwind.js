const fs = require('fs');
const path = 'Dev/tailwind.config.js';
let content = fs.readFileSync(path, 'utf8');

// We will add a custom gray palette that matches the UI Hub INK/MUTED tones
const grayPalette = `
      colors: {
        gray: {
          50: '#f6f9fe',
          100: '#eef3fb',
          200: '#e0eaf8',
          300: '#a8b7cc',
          400: '#8b9ebb',
          500: '#6f84a1',
          600: '#526986',
          700: '#38506b',
          800: '#1f3a55',
          900: '#153454',
          950: '#0d2238',
        },
`;

content = content.replace('colors: {', grayPalette);
fs.writeFileSync(path, content);
