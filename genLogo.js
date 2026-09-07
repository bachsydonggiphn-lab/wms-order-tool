import fs from 'fs';

const base64Webp = fs.readFileSync('JHWjYfoqym2OOwoteZa33TCoXqVDyIDq_1756370770____d0ab9a7afcd5c3ce0d51d1a76ac3c43e.webp').toString('base64');
const base64Png = fs.readFileSync('public/logo.png').toString('base64');

const content = `export const GKP_LOGO_BASE64 = 'data:image/webp;base64,${base64Webp}';\nexport const GKP_LOGO_PNG_BASE64 = 'data:image/png;base64,${base64Png}';\n`;

fs.writeFileSync('src/utils/logoBase64.ts', content);
console.log('Successfully updated src/utils/logoBase64.ts with PNG Data URI!');
