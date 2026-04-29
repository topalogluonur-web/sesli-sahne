const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

function getLanIps() {
  const nets = os.networkInterfaces();
  const ips = [];

  for (const [name, entries] of Object.entries(nets)) {
    for (const net of entries || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push({ name, address: net.address });
      }
    }
  }

  return ips;
}

function scoreIp(item) {
  const name = String(item.name || '').toLowerCase();
  const ip = String(item.address || '');
  let score = 0;

  if (name.includes('wi-fi') || name.includes('wifi') || name.includes('wireless')) score += 100;
  if (name.includes('ethernet')) score += 60;

  // Windows ICS / hotspot and virtual adapters usually should not be selected automatically.
  if (ip.startsWith('192.168.137.')) score -= 200;
  if (name.includes('yerel ağ bağlantısı') || name.includes('local area connection')) score -= 80;
  if (name.includes('virtual') || name.includes('vmware') || name.includes('virtualbox') || name.includes('hyper-v')) score -= 120;
  if (name.includes('bluetooth') || name.includes('loopback') || name.includes('tunnel')) score -= 120;

  // Common private LAN ranges are valid; slight preference for typical home/office Wi-Fi ranges.
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.') || ip.startsWith('172.17.') || ip.startsWith('172.18.') || ip.startsWith('172.19.') || ip.startsWith('172.20.') || ip.startsWith('172.21.') || ip.startsWith('172.22.') || ip.startsWith('172.23.') || ip.startsWith('172.24.') || ip.startsWith('172.25.') || ip.startsWith('172.26.') || ip.startsWith('172.27.') || ip.startsWith('172.28.') || ip.startsWith('172.29.') || ip.startsWith('172.30.') || ip.startsWith('172.31.')) score += 10;

  return score;
}

const useTunnel = process.argv.includes('--tunnel');
const port = process.env.BACKEND_PORT || '5055';
const ips = getLanIps();

if (!ips.length && !useTunnel) {
  console.error('\nYerel ağ IP adresi bulunamadı. Bilgisayar Wi-Fi/Ethernet ağına bağlı mı kontrol edin.');
  console.error('Alternatif olarak: npm run phone:tunnel');
  process.exit(1);
}

const sortedIps = [...ips].sort((a, b) => scoreIp(b) - scoreIp(a));
const selectedIp = process.env.SESLI_SAHNE_LAN_IP || (sortedIps[0] && sortedIps[0].address) || 'localhost';
const apiBaseUrl = `http://${selectedIp}:${port}/api`;
const envPath = path.resolve(process.cwd(), '.env');

const envContent = [
  '# Bu dosya npm run phone komutu tarafından otomatik oluşturuldu.',
  '# Telefon testinde localhost yerine bilgisayarın yerel IP adresi kullanılır.',
  `EXPO_PUBLIC_API_BASE_URL=${apiBaseUrl}`,
  ''
].join('\n');

fs.writeFileSync(envPath, envContent, 'utf8');

console.log('\nSesli Sahne telefon test ayarı hazır.');
console.log(`API adresi: ${apiBaseUrl}`);

if (ips.length > 1) {
  console.log('\nBirden fazla ağ adresi bulundu. Otomatik seçim yukarıdaki API adresidir. Bağlantı olmazsa şu IPlerden birini elle seçebiliriz:');
  for (const item of sortedIps) {
    const marker = item.address === selectedIp ? '  <-- seçildi' : '';
    console.log(`- ${item.name}: ${item.address}${marker}`);
  }
  console.log('\nPowerShell elle seçim örneği:');
  console.log('$env:SESLI_SAHNE_LAN_IP="172.16.200.58"');
  console.log('npm run phone');
}

console.log('\nExpo QR açılıyor. Telefonda Expo Go ile QR kodu okutun.');
console.log('Telefon ve bilgisayar aynı Wi-Fi ağında olmalı.');
console.log('Backend de açık olmalı: backend klasöründe npm run dev\n');

const expoArgs = ['expo', 'start', useTunnel ? '--tunnel' : '--host', useTunnel ? undefined : 'lan', '--clear'].filter(Boolean);

let child;
if (process.platform === 'win32') {
  // Windows + bazı Node sürümlerinde npx.cmd doğrudan spawn edildiğinde EINVAL verebiliyor.
  // cmd.exe üzerinden çalıştırmak daha stabil.
  child = spawn('cmd.exe', ['/d', '/s', '/c', `npx ${expoArgs.join(' ')}`], {
    stdio: 'inherit',
    shell: false,
    windowsVerbatimArguments: false
  });
} else {
  child = spawn('npx', expoArgs, {
    stdio: 'inherit',
    shell: false
  });
}

child.on('error', (err) => {
  console.error('\nExpo başlatılırken hata oluştu:', err.message);
  console.error('Manuel deneyin: cd mobile && npx expo start --host lan --clear');
  process.exit(1);
});

child.on('exit', (code) => process.exit(code || 0));
