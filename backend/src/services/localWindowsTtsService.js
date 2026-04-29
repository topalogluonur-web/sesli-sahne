const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { publicUploadUrl } = require('../utils');
const { getVoiceProfile, stripProductionNotes } = require('./studioService');

function voiceGenderFromProfile(profileIdOrVoice) {
  const selected = getVoiceProfile(profileIdOrVoice || 'female_soft');
  if (selected.id.includes('male') || ['onyx', 'echo'].includes(selected.voice)) return 'Male';
  if (selected.id.includes('female') || ['nova', 'shimmer'].includes(selected.voice)) return 'Female';
  return 'NotSet';
}

function rateFromStyle(style) {
  const envRate = Number.parseInt(process.env.LOCAL_TTS_RATE || '', 10);
  if (Number.isFinite(envRate)) return Math.max(-10, Math.min(10, envRate));
  if (style === 'bedtime') return -2;
  if (style === 'educational') return -1;
  if (style === 'theatrical') return 0;
  return 0;
}

function runPowerShell(script, args = []) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(os.tmpdir(), `sesli-sahne-tts-${crypto.randomUUID()}.ps1`);
    fsSync.writeFileSync(scriptPath, script, 'utf8');

    const ps = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath,
      ...args
    ], { windowsHide: true });

    let stdout = '';
    let stderr = '';
    ps.stdout.on('data', (data) => { stdout += data.toString(); });
    ps.stderr.on('data', (data) => { stderr += data.toString(); });
    ps.on('error', (error) => {
      fsSync.rmSync(scriptPath, { force: true });
      reject(error);
    });
    ps.on('close', (code) => {
      fsSync.rmSync(scriptPath, { force: true });
      if (code === 0) return resolve({ stdout, stderr });
      reject(new Error(`Windows PowerShell TTS hatası. Kod=${code}. ${stderr || stdout}`));
    });
  });
}

async function listWindowsVoices() {
  if (process.platform !== 'win32') return [];

  const script = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = @($synth.GetInstalledVoices() | ForEach-Object {
  [PSCustomObject]@{
    name = $_.VoiceInfo.Name
    culture = $_.VoiceInfo.Culture.Name
    culture_display = $_.VoiceInfo.Culture.DisplayName
    gender = $_.VoiceInfo.Gender.ToString()
    age = $_.VoiceInfo.Age.ToString()
    enabled = $_.Enabled
  }
})
$synth.Dispose()
$voices | ConvertTo-Json -Depth 3
`;

  const { stdout } = await runPowerShell(script);
  const trimmed = stdout.trim();
  if (!trimmed) return [];
  const parsed = JSON.parse(trimmed);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function runPowerShellTts({ textPath, outputPath, gender, rate, culture, preferredVoiceName }) {
  const script = `
param(
  [Parameter(Mandatory=$true)][string]$TextPath,
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [string]$Gender = 'NotSet',
  [int]$Rate = 0,
  [string]$Culture = 'tr-TR',
  [string]$PreferredVoiceName = ''
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$selectedBy = 'default'
try {
  $allVoices = @($synth.GetInstalledVoices() | Where-Object { $_.Enabled })

  if ($PreferredVoiceName -and $PreferredVoiceName.Trim().Length -gt 0) {
    $preferred = $allVoices | Where-Object { $_.VoiceInfo.Name -eq $PreferredVoiceName } | Select-Object -First 1
    if ($preferred) {
      $synth.SelectVoice($preferred.VoiceInfo.Name)
      $selectedBy = 'preferred_name'
    }
  }

  if ($selectedBy -eq 'default') {
    $cultureInfo = New-Object System.Globalization.CultureInfo($Culture)
    $cultureVoices = @($synth.GetInstalledVoices($cultureInfo) | Where-Object { $_.Enabled })
    if ($cultureVoices.Count -gt 0) {
      $genderEnum = [System.Speech.Synthesis.VoiceGender]::$Gender
      $match = $cultureVoices | Where-Object { $Gender -eq 'NotSet' -or $_.VoiceInfo.Gender -eq $genderEnum } | Select-Object -First 1
      if (-not $match) { $match = $cultureVoices | Select-Object -First 1 }
      if ($match) {
        $synth.SelectVoice($match.VoiceInfo.Name)
        $selectedBy = 'culture_gender'
      }
    }
  }

  if ($selectedBy -eq 'default' -and $Gender -ne 'NotSet') {
    try {
      $synth.SelectVoiceByHints([System.Speech.Synthesis.VoiceGender]::$Gender)
      $selectedBy = 'gender_hint'
    } catch {}
  }
} catch {
  try { if ($Gender -ne 'NotSet') { $synth.SelectVoiceByHints([System.Speech.Synthesis.VoiceGender]::$Gender) } } catch {}
}

$synth.Rate = [Math]::Max(-10, [Math]::Min(10, $Rate))
$synth.Volume = 100
$text = [System.IO.File]::ReadAllText($TextPath, [System.Text.Encoding]::UTF8)
$synth.SetOutputToWaveFile($OutputPath)
$synth.Speak($text)
$voice = $synth.Voice
$result = [PSCustomObject]@{
  ok = $true
  selected_voice = $voice.Name
  selected_culture = $voice.Culture.Name
  selected_gender = $voice.Gender.ToString()
  selected_by = $selectedBy
}
$synth.Dispose()
$result | ConvertTo-Json -Depth 3
`;

  return runPowerShell(script, [
    '-TextPath', textPath,
    '-OutputPath', outputPath,
    '-Gender', gender,
    '-Rate', String(rate),
    '-Culture', culture,
    '-PreferredVoiceName', preferredVoiceName || ''
  ]);
}

async function createLocalSpeechWav({ input, episodeId, voiceProfile, voice, style, localVoiceName, culture }) {
  if (process.platform !== 'win32') {
    throw new Error('Keysiz yerel TTS şu anda Windows üzerinde çalışır. Bu bilgisayarda Windows algılanmadı.');
  }

  const cleanText = stripProductionNotes(input);
  if (!cleanText) throw new Error('Seslendirilecek temiz metin boş. Prodüksiyon notları dışında metin bulunamadı.');

  const uploadRoot = process.env.UPLOAD_ROOT || './uploads';
  const audioDir = path.resolve(process.cwd(), uploadRoot, 'audio');
  await fs.mkdir(audioDir, { recursive: true });

  const selectedVoice = getVoiceProfile(voiceProfile || voice || process.env.OPENAI_TTS_VOICE || 'female_soft');
  const gender = voiceGenderFromProfile(selectedVoice.id);
  const rate = rateFromStyle(style);
  const selectedCulture = culture || process.env.LOCAL_TTS_CULTURE || 'tr-TR';
  const preferredVoiceName = localVoiceName || process.env.LOCAL_TTS_VOICE_NAME || '';
  const filename = `episode-${episodeId || 'test'}-${crypto.randomUUID()}.wav`;
  const absolutePath = path.join(audioDir, filename);
  const textPath = path.join(os.tmpdir(), `sesli-sahne-text-${crypto.randomUUID()}.txt`);

  console.log(`[LOCAL TTS] Başladı | episode=${episodeId || 'test'} | voiceProfile=${selectedVoice.id} | gender=${gender} | culture=${selectedCulture} | preferredVoice=${preferredVoiceName || 'auto'} | rate=${rate} | chars=${cleanText.length}`);

  try {
    await fs.writeFile(textPath, cleanText, 'utf8');
    const psResult = await runPowerShellTts({ textPath, outputPath: absolutePath, gender, rate, culture: selectedCulture, preferredVoiceName });
    const meta = JSON.parse((psResult.stdout || '{}').trim() || '{}');
    const stat = await fs.stat(absolutePath);
    if (!stat.size || stat.size < 1000) throw new Error('WAV dosyası yazıldı ama boyutu geçersiz görünüyor.');

    if (meta.selected_culture && meta.selected_culture.toLowerCase() !== selectedCulture.toLowerCase()) {
      console.warn(`[LOCAL TTS] Uyarı: ${selectedCulture} sesi bulunamadı veya seçilemedi. Seçilen ses: ${meta.selected_voice} (${meta.selected_culture}). Türkçe metin yabancı aksanlı okunabilir.`);
    }

    console.log(`[LOCAL TTS] Tamamlandı | file=${absolutePath} | bytes=${stat.size} | selected=${meta.selected_voice || 'unknown'} | culture=${meta.selected_culture || 'unknown'} | by=${meta.selected_by || 'unknown'}`);

    return {
      filename,
      absolutePath,
      bytes: stat.size,
      audioUrl: publicUploadUrl('audio', filename),
      model: 'local-windows-system-speech',
      voice: meta.selected_voice || selectedVoice.voice,
      voiceProfile: selectedVoice.id,
      voiceLabel: selectedVoice.label,
      provider: 'local_windows',
      format: 'wav',
      chunkCount: 1,
      selectedCulture: meta.selected_culture || null,
      selectedGender: meta.selected_gender || null,
      selectedBy: meta.selected_by || null,
      instructions: meta.selected_culture && meta.selected_culture.toLowerCase() === 'tr-tr'
        ? 'Windows yerel Türkçe ses motoru kullanıldı. API key gerekmez.'
        : 'Windows yerel ses motoru kullanıldı; Türkçe ses paketi yoksa aksanlı okuyabilir.'
    };
  } finally {
    await fs.rm(textPath, { force: true }).catch(() => {});
  }
}

module.exports = { createLocalSpeechWav, listWindowsVoices };
