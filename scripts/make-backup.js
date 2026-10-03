import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const backupPath = path.join(publicDir, 'telemoto-backup-latest.tar.gz');
const tmpBackup = '/tmp/telemoto-backup.tar.gz';

console.log('📦 Gerando backup completo do TeleMoto+...');

try {
  if (fs.existsSync(tmpBackup)) {
    fs.unlinkSync(tmpBackup);
  }

  // Use /tmp destination so root directory contents are not modified during tar read
  execSync(
    `tar --exclude='./node_modules' --exclude='./dist' --exclude='./.git' --exclude='./server.js' --exclude='*.tar.gz' --exclude='./public/*.tar.gz' --warning=no-file-changed -czf "${tmpBackup}" .`,
    { cwd: rootDir, stdio: 'inherit' }
  );

  fs.copyFileSync(tmpBackup, backupPath);

  const stats = fs.statSync(backupPath);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  const dateStr = new Date().toISOString();

  const manifestData = {
    appName: 'TeleMoto+',
    backupDate: dateStr,
    fileSizeMb: sizeMb,
    archiveName: 'telemoto-backup-latest.tar.gz',
    downloadUrl: '/telemoto-backup-latest.tar.gz',
    status: 'completed',
    version: '1.0.0-production'
  };

  fs.writeFileSync(
    path.join(publicDir, 'backup-manifest.json'),
    JSON.stringify(manifestData, null, 2)
  );

  console.log(`✅ Backup gerado com sucesso! Tamanho: ${sizeMb} MB`);
} catch (err) {
  console.error('❌ Erro ao gerar backup:', err);
}
