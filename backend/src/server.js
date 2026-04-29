require('dotenv').config();

const path = require('path');
const os = require('os');
const express = require('express');
const cors = require('cors');
const { ensureUploadFolders } = require('./utils');
require('./db');
const { ensureDefaultAdmin, adminWriteGuard } = require('./auth');

const categoriesRouter = require('./routes/categories');
const contentsRouter = require('./routes/contents');
const episodesRouter = require('./routes/episodes');
const importsRouter = require('./routes/imports');
const ttsRouter = require('./routes/tts');
const mediaRouter = require('./routes/media');
const favoritesRouter = require('./routes/favorites');
const historyRouter = require('./routes/history');
const profilesRouter = require('./routes/profiles');
const studioRouter = require('./routes/studio');
const authRouter = require('./routes/auth');
const userAuthRouter = require('./routes/userAuth');

ensureUploadFolders();
ensureDefaultAdmin();

const app = express();
const port = process.env.PORT || 5055;
const host = process.env.HOST || '0.0.0.0';
const uploadRoot = process.env.UPLOAD_ROOT || './uploads';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(process.cwd(), uploadRoot)));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: 'Sesli Sahne API', time: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/user-auth', userAuthRouter);
app.use('/api', adminWriteGuard);

app.use('/api/categories', categoriesRouter);
app.use('/api/contents', contentsRouter);
app.use('/api/episodes', episodesRouter);
app.use('/api/imports', importsRouter);
app.use('/api/tts', ttsRouter);
app.use('/api/media', mediaRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/history', historyRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/studio', studioRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Sunucu hatası.' });
});

function getLanIps() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const entries of Object.values(nets)) {
    for (const net of entries || []) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

app.listen(port, host, () => {
  console.log(`Sesli Sahne API çalışıyor: http://localhost:${port}`);
  for (const ip of getLanIps()) {
    console.log(`Telefon/LAN için: http://${ip}:${port}`);
  }
});
