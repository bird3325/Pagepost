const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });

    return arrayOfFiles;
}

function escapeToToUnicode(str) {
    return str.replace(/[^\x00-\x7F]/g, function (ch) {
        return "\\u" + ("000" + ch.charCodeAt(0).toString(16)).slice(-4);
    });
}

const files = getAllFiles(distDir);
files.forEach(file => {
    if (file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.css') || file.endsWith('.html')) {
        console.log(`Escaping non-ASCII characters in: ${file}`);
        const content = fs.readFileSync(file, 'utf8');
        const escapedContent = escapeToToUnicode(content);
        fs.writeFileSync(file, escapedContent, 'utf8');
    }
});

console.log('Successfully escaped all non-ASCII characters to Unicode sequences.');
