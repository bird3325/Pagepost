const fs = require('fs');

function sanitizeFile(filePath) {
    console.log(`Sanitizing: ${filePath}`);
    const buffer = fs.readFileSync(filePath);
    let sanitized = Buffer.alloc(buffer.length);
    let j = 0;
    let removedCount = 0;

    for (let i = 0; i < buffer.length; i++) {
        const byte = buffer[i];
        // Keep only standard printable ASCII (32-126) and common whitespace (tab, LF, CR)
        if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
            sanitized[j++] = byte;
        } else {
            removedCount++;
        }
    }

    if (removedCount > 0) {
        fs.writeFileSync(filePath, sanitized.slice(0, j));
        console.log(`  - Removed ${removedCount} non-ASCII or control characters.`);
    } else {
        console.log('  - No problematic characters found.');
    }
}

const files = [
    'D:/100 shop/Pagepost/dist/manifest.json',
    'D:/100 shop/Pagepost/dist/src/content/index.js'
];

files.forEach(f => {
    if (fs.existsSync(f)) sanitizeFile(f);
    else console.log(`File not found: ${f}`);
});
