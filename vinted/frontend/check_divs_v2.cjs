
const fs = require('fs');
const content = fs.readFileSync('e:/vinted-user&admin/vinted/frontend/src/components/Header.jsx', 'utf8');
const lines = content.split('\n');
let stack = [];

lines.forEach((line, i) => {
    let l_trimmed = line.trim();
    if (l_trimmed.startsWith('<div') && !l_trimmed.includes('/>')) {
        stack.push({ line: i + 1, content: l_trimmed.substring(0, 50) });
    }
    if (l_trimmed.startsWith('</div>')) {
        if (stack.length > 0) stack.pop();
        else console.log('Extra close at', i + 1);
    }
});
console.log('Final stack:', stack);
