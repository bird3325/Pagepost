const fs = require('fs');
const manifestPath = 'D:/100 shop/Pagepost/dist/manifest.json';
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Pretty print and save back as UTF-8
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log('Manifest formatted and saved as UTF-8.');
