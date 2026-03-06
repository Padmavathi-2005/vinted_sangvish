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
    // Find drive letter e.g. e:, d:, c:
    const driveMatch = fileUri.match(/([a-zA-Z]%3A|[a-zA-Z]:)(.*)/i);
    if (!driveMatch) continue;

    let drivePath = decodeURIComponent(driveMatch[1] + driveMatch[2]);
    drivePath = drivePath.replace(/%26/i, '&');

    let filePath = drivePath.replace(/\//g, '\\');

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
