const fs = require('fs');
const path = require('path');

const historyDir = process.env.APPDATA + '\\Antigravity\\User\\History';
const folders = fs.readdirSync(historyDir);

for (const folder of folders) {
    const entryJsonPath = path.join(historyDir, folder, 'entries.json');
    if (!fs.existsSync(entryJsonPath)) continue;

    const data = JSON.parse(fs.readFileSync(entryJsonPath, 'utf8'));
    if (data.resource && data.resource.includes('models') && data.resource.includes('Order.js')) {
        console.log(`Found Order.js in folder ${folder}`);
        for (const entry of data.entries) {
            console.log(` - ID: ${entry.id}, Time: ${new Date(entry.timestamp).toLocaleString()}`);
        }
    }
}
