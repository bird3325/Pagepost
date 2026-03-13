const fs = require('fs');
const path = require('path');

function checkEncoding(filePath) {
    console.log(`Checking: ${filePath}`);
    const buffer = fs.readFileSync(filePath);

    // Check for BOM
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        console.log('  - UTF-8 BOM detected!');
    } else if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
        console.log('  - UTF-16 BE BOM detected!');
    } else if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
        console.log('  - UTF-16 LE BOM detected!');
    } else {
        console.log('  - No BOM detected.');
    }

    // Check for null bytes
    let hasNull = false;
    for (let i = 0; i < buffer.length; i++) {
        if (buffer[i] === 0) {
            console.log(`  - Null byte found at index ${i}`);
            hasNull = true;
            break;
        }
    }
    if (!hasNull) console.log('  - No null bytes found.');

    // Try to decode as UTF-8 and check for errors
    try {
        const decoder = new TextDecoder('utf-8', { fatal: true });
        decoder.decode(buffer);
        console.log('  - Valid UTF-8 encoding confirmed.');
    } catch (e) {
        console.log(`  - INVALID UTF-8 sequence detected: ${e.message}`);
    }
}

const distDir = 'D:/100 shop/Pagepost/dist';
const files = [
    path.join(distDir, 'manifest.json'),
    path.join(distDir, 'src/content/index.js')
];

files.forEach(f => {
    if (fs.existsSync(f)) checkEncoding(f);
    else console.log(`File not found: ${f}`);
});
