/**
 * GoHappy — Script de build para Capacitor
 * Copia todos los archivos web a la carpeta www/ que usa Capacitor
 * para generar los builds nativos de Android e iOS.
 *
 * Uso: node scripts/build-www.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WWW  = path.join(ROOT, 'www');

// Directorios y archivos a copiar
const INCLUDE = [
    'index.html',
    'manifest.json',
    'sw.js',
    'css',
    'js',
    'assets'
];

// Limpiar y recrear www/
if (fs.existsSync(WWW)) {
    fs.rmSync(WWW, { recursive: true, force: true });
}
fs.mkdirSync(WWW, { recursive: true });

function copyItem(src, dest) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        for (const child of fs.readdirSync(src)) {
            copyItem(path.join(src, child), path.join(dest, child));
        }
    } else {
        fs.copyFileSync(src, dest);
    }
}

for (const item of INCLUDE) {
    const src  = path.join(ROOT, item);
    const dest = path.join(WWW, item);
    if (fs.existsSync(src)) {
        copyItem(src, dest);
        console.log(`✓ Copiado: ${item}`);
    } else {
        console.warn(`⚠ No encontrado: ${item}`);
    }
}

console.log('\n✅ www/ listo para Capacitor sync\n');
