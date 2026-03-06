const fs = require('fs');
const path = require('path');

const historyDir = process.env.APPDATA + '\\Antigravity\\User\\History';
// The target time is strictly 12:30:40 on March 6, 2026 IST
const targetTime = new Date('2026-03-06T12:30:40+05:30').getTime();

const folders = fs.readdirSync(historyDir);

let restoredCount = 0;

for (const folder of folders) {
    const folderPath = path.join(historyDir, folder);
    const entryJsonPath = path.join(folderPath, 'entries.json');
    if (!fs.existsSync(entryJsonPath)) continue;

    const data = JSON.parse(fs.readFileSync(entryJsonPath, 'utf8'));
    if (!data.resource || !data.resource.includes('vinted-admin')) continue;

    let fileUri = decodeURIComponent(data.resource);
    fileUri = fileUri.replace(/^[^:]+:\/\//, '');
    fileUri = fileUri.replace(/%3A/i, ':');
    fileUri = fileUri.replace(/%26/i, '&');

    let filePath = fileUri;
    filePath = filePath.replace(/\//g, '\\');

    if (filePath.match(/^[a-z]:/)) {
        filePath = filePath[0].toUpperCase() + filePath.substring(1);
    }

    if (!filePath.toLowerCase().includes('vinted-user&admin\\vinted-admin')) continue;
    if (filePath.includes('node_modules')) continue;

    let bestEntry = null;
    let maxTimestamp = 0;

    for (const entry of data.entries) {
        if (entry.timestamp <= targetTime + 60000) {
            if (entry.timestamp > maxTimestamp) {
                maxTimestamp = entry.timestamp;
                bestEntry = entry;
            }
        }
    }

    if (bestEntry) {
        // the property is bestEntry.id or sometimes bestEntry.versionId etc
        const sourceFile = path.join(folderPath, bestEntry.id);
        if (fs.existsSync(sourceFile)) {
            let srcContent = fs.readFileSync(sourceFile, 'utf8');
            let destContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
            if (srcContent !== destContent) {
                console.log(`Restoring [${path.basename(filePath)}] from ${new Date(bestEntry.timestamp).toLocaleString()}`);
                fs.copyFileSync(sourceFile, filePath);
                restoredCount++;
            }
        }
    }
}
console.log(`Successfully restored ${restoredCount} files.`);
