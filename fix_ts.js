const fs = require('fs');
const path = 'Dev/src/pages/Dashboard2.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace('import React, { useState } from', 'import React from');
content = content.replace('ChevronLeft, ChevronRight, Clock', 'ChevronLeft, Clock');
content = content.replace('BarChart, Bar, XAxis, YAxis,', 'BarChart, Bar, XAxis,');

fs.writeFileSync(path, content);
