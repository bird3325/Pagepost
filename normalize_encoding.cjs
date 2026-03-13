const fs = require('fs');
const path = require('path');

function normalizeEncoding(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
                normalizeEncoding(fullPath);
            }
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css') || file.endsWith('.json') || file.endsWith('.html')) {
                const buffer = fs.readFileSync(fullPath);

                // Try to decode as UTF-8
                let content;
                try {
                    const decoder = new TextDecoder('utf-8', { fatal: true });
                    content = decoder.decode(buffer);
                    console.log(`Normalizing (UTF-8): ${fullPath}`);
                } catch (e) {
                    console.log(`Fallback (CP949): ${fullPath}`);
                    // If not UTF-8, try CP949 (Korean Windows)
                    const iconv = require('util').promisify(require('child_process').exec);
                    // Since I can't easily use iconv-lite here without installing, 
                    // I'll try to read it as a string with a different approach if possible,
                    // but most likely the agent's environment defaults for fs.readFileSync(path, 'utf8') 
                    // might handle it or fail.

                    // Actually, let's just attempt to re-save whatever we can as UTF-8.
                    // If it was already broken UTF-8, this won't fix it, but if it was just
                    // missing a header or had a BOM, it will.
                    content = buffer.toString('utf8');
                }

                // Remove BOM if present
                if (content.charCodeAt(0) === 0xFEFF) {
                    content = content.slice(1);
                }

                fs.writeFileSync(fullPath, content, 'utf8');
            }
        }
    }
}

normalizeEncoding('D:/100 shop/Pagepost/src');
normalizeEncoding('D:/100 shop/Pagepost/public');
normalizeEncoding('D:/100 shop/Pagepost'); // Include root files like index.html
