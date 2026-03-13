const fs = require('fs');
const path = require('path');

function sanitizeRecursively(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            sanitizeRecursively(fullPath);
        } else {
            if (file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.css') || file.endsWith('.html')) {
                console.log(`Sanitizing: ${fullPath}`);
                const buffer = fs.readFileSync(fullPath);
                let sanitized = Buffer.alloc(buffer.length);
                let j = 0;
                let removedCount = 0;

                for (let i = 0; i < buffer.length; i++) {
                    const byte = buffer[i];
                    // Keep ASCII 32-126, Tab (9), LF (10), CR (13)
                    if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
                        sanitized[j++] = byte;
                    } else {
                        removedCount++;
                    }
                }

                if (removedCount > 0) {
                    fs.writeFileSync(fullPath, sanitized.slice(0, j));
                    console.log(`  - Removed ${removedCount} non-ASCII/control characters.`);
                }
            }
        }
    }
}

sanitizeRecursively('D:/100 shop/Pagepost/dist');
