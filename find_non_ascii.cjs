const fs = require('fs');
const path = require('path');

function findNonAscii(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
                findNonAscii(fullPath);
            }
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css') || file.endsWith('.json')) {
                const content = fs.readFileSync(fullPath);
                for (let i = 0; i < content.length; i++) {
                    if (content[i] > 127) {
                        console.log(`Non-ASCII character found in ${fullPath} at index ${i}: 0x${content[i].toString(16)}`);
                        // Just stop at first found for summary
                        break;
                    }
                }
            }
        }
    }
}

findNonAscii('D:/100 shop/Pagepost/src');
findNonAscii('D:/100 shop/Pagepost/public');
