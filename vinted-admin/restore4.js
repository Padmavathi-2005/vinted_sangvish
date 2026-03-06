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
    if (!data.resource) continue;

    let filePath = '';
    const idx = data.resource.indexOf('vinted-user%26admin/vinted-admin');
    if (idx !== -1) {
        filePath = 'e:\\' + decodeURIComponent(data.resource.substring(idx)).replace(/\//g, '\\');
    } else {
        const idx2 = data.resource.indexOf('vinted-user&admin/vinted-admin');
        if (idx2 !== -1) {
            filePath = 'e:\\' + decodeURIComponent(data.resource.substring(idx2)).replace(/\//g, '\\');
        } else {
            continue;
        }
    }

    if (filePath.includes('node_modules')) continue;
    if (filePath.includes('.git')) continue;

    // Safety extension check
    if (!filePath.match(/\.(js|jsx|css|html|json)$/i)) continue;

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
                try {
                    fs.writeFileSync(filePath, srcContent);
                    restoredCount++;
                } catch (e) {
                    // Skip missing parent folders
                }
            }
        }
    }
}
console.log(`Successfully restored ${restoredCount} files.`);
