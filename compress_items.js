const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const directories = [
    path.join(__dirname, 'vinted', 'backend', 'images', 'items'),
    path.join(__dirname, 'vinted-admin', 'backend', 'images', 'items')
];

const MAX_WIDTH = 1000;
const QUALITY = 75; // 0 to 100

async function processImages() {
    for (const dir of directories) {
        if (!fs.existsSync(dir)) {
            console.log(`Directory does not exist: ${dir}`);
            continue;
        }

        const files = fs.readdirSync(dir);
        let processedCount = 0;
        console.log(`\nProcessing directory: ${dir} (${files.length} files found)`);

        for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
                continue;
            }

            const filePath = path.join(dir, file);
            const tempPath = path.join(dir, `temp_${file}`);

            try {
                // Read into buffer to prevent file locking on Windows
                const buffer = fs.readFileSync(filePath);
                
                const metadata = await sharp(buffer).metadata();
                
                let transform = sharp(buffer);
                
                // Only resize if wider than MAX_WIDTH, preventing enlarging small images
                if (metadata.width > MAX_WIDTH) {
                    transform = transform.resize({ width: MAX_WIDTH, withoutEnlargement: true });
                }

                // Apply compression based on format
                if (ext === '.jpg' || ext === '.jpeg') {
                    transform = transform.jpeg({ quality: QUALITY, mozjpeg: true });
                } else if (ext === '.png') {
                    transform = transform.png({ quality: QUALITY, compressionLevel: 8 });
                } else if (ext === '.webp') {
                    transform = transform.webp({ quality: QUALITY });
                }

                await transform.toFile(tempPath);

                // Overwrite original file to keep the same database reference
                fs.copyFileSync(tempPath, filePath);
                fs.unlinkSync(tempPath); // cleanup temp

                console.log(`[Success] Reduced and overwritten: ${file}`);
                processedCount++;
            } catch (err) {
                console.error(`[Error] Failed processing ${file}:`, err.message);
                // cleanup temp file if process crashed during write
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
            }
        }
        console.log(`Completed processing ${processedCount} images in ${path.basename(dir)}`);
    }
}

processImages();
