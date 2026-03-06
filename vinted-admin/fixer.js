import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsDir = path.join(__dirname, 'backend', 'models');
const files = fs.readdirSync(modelsDir);

for (const file of files) {
    if (!file.endsWith('.js')) continue;
    const filePath = path.join(modelsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    let changed = false;
    if (content.includes("const mongoose = require('mongoose');")) {
        content = content.replace("const mongoose = require('mongoose');", "import mongoose from 'mongoose';");
        changed = true;
    }
    const moduleExportRegex = /module\.exports\s*=\s*(.+);/g;
    if (moduleExportRegex.test(content)) {
        content = content.replace(moduleExportRegex, 'export default $1;');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, content);
        console.log('Fixed', file);
    }
}
