import React, { useEffect, useMemo, useState } from 'react';
import {
    changeAdminPassword,
  clearAuthToken,
  getAuthToken,
  getMe,
  loginAdmin,
  setAuthToken,
  analyzeContent,
  createCategory,
  deleteCategory,
  deleteContent,
  deleteEpisode,
  clearEpisodeAudio,
  generateAllTts,
  generateTts,
  getAudioFiles,
  getCategories,
  getContent,
  getContents,
  getLocalVoices,
  mergeEpisodeNext,
  moveEpisode,
  splitEpisode,
  getVoices,
  importPdf,
  moveContentToLibrary,
  prepareAllEpisodes,
  prepareEpisode,
  previewEpisodeSpeech,
  previewContentSpeech,
  setContentStatus,
  testTts,
  updateCategory,
  updateContent,
  updateEpisode,
  uploadCover,
  uploadEpisodeAudio
} from './api.js';

const audienceLabels = { child: 'Çocuk', adult: 'Yetişkin', family: 'Aile' };
const statusLabels = {
  draft: 'Taslak',
  published: 'Kütüphane',
  archived: 'Arşiv',
  ready_for_tts: 'Sese hazır',
  audio_generated: 'Ses üretildi',
  tts_failed: 'Ses hatası'
};
const styleLabels = { natural: 'Doğal anlatım', bedtime: 'Uyku modu', theatrical: 'Sesli tiyatro', educational: 'Eğitici anlatım' };
const rateOptions = [
  { value: '-10%', label: 'Biraz yavaş (-10%)' },
  { value: '-16%', label: 'Önerilen yavaş ve anlaşılır (-16%)' },
  { value: '-22%', label: 'Çocuk/uyku için çok sakin (-22%)' },
  { value: '-28%', label: 'Çok yavaş prova (-28%)' }
];
const pauseLevelOptions = [
  { value: 'light', label: 'Hafif duraklama' },
  { value: 'normal', label: 'Normal duraklama (önerilen)' },
  { value: 'long', label: 'Uzun duraklama / uyku modu' }
];
const qualityLabels = { missing: 'Eksik', ready: 'Hazır', published: 'Yayında' };
const qualityTones = { missing: 'danger', ready: 'success', published: 'success' };

function Badge({ children, tone = 'default' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function formatNumber(value) {
  return new Intl.NumberFormat('tr-TR').format(value || 0);
}

function makeContentDraft(content) {
  if (!content) return null;
  return {
    title: content.title || '',
    description: content.description || '',
    audience_type: content.audience_type || 'family',
    age_min: content.age_min ?? '',
    age_max: content.age_max ?? '',
    category_id: content.category_id ?? '',
    is_premium: Boolean(content.is_premium),
    status: content.status || 'draft'
  };
}

function App() {
  const [authLoading, setAuthLoading] = useState(Boolean(getAuthToken()));
  const [adminUser, setAdminUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: '0000' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '' });
  const [categories, setCategories] = useState([]);
  const [categoryDrafts, setCategoryDrafts] = useState({});
  const [contents, setContents] = useState([]);
  const [voices, setVoices] = useState([]);
  const [selectedContent, setSelectedContent] = useState(null);
  const [contentDraft, setContentDraft] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [editingEpisode, setEditingEpisode] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [episodeAudioFiles, setEpisodeAudioFiles] = useState({});
  const [audioFiles, setAudioFiles] = useState([]);
  const [speechPreview, setSpeechPreview] = useState(null);
  const [localVoices, setLocalVoices] = useState({ voices: [], trVoices: [], hasTurkishVoice: false, edgeVoices: [] });
  const [filters, setFilters] = useState({ status: 'all', audience_type: 'all' });
  const [contentSearch, setContentSearch] = useState('');
  const [studioOptions, setStudioOptions] = useState({
    provider: 'edge_python',
    voice_profile: 'female_soft',
    style: 'natural',
    model: 'python-edge-tts',
    include_existing: false,
    local_culture: 'tr-TR',
    local_voice_name: '',
    edge_voice_name: '',
    tts_rate: '-16%',
    pause_level: 'normal'
  });
  const [pdfForm, setPdfForm] = useState({
    title: '',
    description: '',
    audience_type: 'child',
    age_min: '4',
    age_max: '8',
    category_id: '',
    is_premium: false,
    pdf: null
  });

  const selectedEpisodes = selectedContent?.episodes || [];
  const selectedVoice = voices.find((voice) => voice.id === studioOptions.voice_profile);

  const groupedStats = useMemo(() => contents.reduce((acc, item) => {
    acc.total += 1;
    acc[item.audience_type] = (acc[item.audience_type] || 0) + 1;
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, { total: 0, child: 0, adult: 0, family: 0, draft: 0, published: 0, archived: 0 }), [contents]);

  const filteredContents = useMemo(() => contents.filter((content) => {
    if (filters.status !== 'all' && content.status !== filters.status) return false;
    if (filters.audience_type !== 'all' && content.audience_type !== filters.audience_type) return false;
    const needle = contentSearch.trim().toLocaleLowerCase('tr-TR');
    if (!needle) return true;
    const blob = [content.title, content.description, content.category_name, audienceLabels[content.audience_type], statusLabels[content.status]].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR');
    return blob.includes(needle);
  }), [contentSearch, contents, filters]);

  const selectedQualityChecks = useMemo(() => {
    if (!selectedContent) return [];
    const episodeCount = selectedEpisodes.length;
    const audioCount = selectedEpisodes.filter((episode) => episode.audio_url).length;
    return [
      { label: 'Başlık', ok: Boolean(selectedContent.title?.trim()), text: selectedContent.title?.trim() ? 'Hazır' : 'Başlık eksik' },
      { label: 'Açıklama', ok: Boolean(selectedContent.description?.trim()), text: selectedContent.description?.trim() ? 'Hazır' : 'Açıklama ekle' },
      { label: 'Kategori', ok: Boolean(selectedContent.category_id), text: selectedContent.category_name || 'Kategori seç' },
      { label: 'Kapak', ok: Boolean(selectedContent.cover_image_url), text: selectedContent.cover_image_url ? 'Hazır' : 'Kapak ekle' },
      { label: 'Bölüm', ok: episodeCount > 0, text: `${episodeCount} bölüm` },
      { label: 'Ses', ok: episodeCount > 0 && audioCount === episodeCount, text: `${audioCount}/${episodeCount} sesli` }
    ];
  }, [selectedContent, selectedEpisodes]);

  function syncCategoryDrafts(categoryData) {
    setCategoryDrafts((current) => {
      const next = { ...current };
      for (const category of categoryData) {
        if (!next[category.id]) next[category.id] = { name: category.name, description: category.description || '' };
      }
      return next;
    });
  }

  async function loadAll() {
    const [categoryData, contentData, voiceData] = await Promise.all([getCategories(), getContents(), getVoices()]);
    setCategories(categoryData);
    syncCategoryDrafts(categoryData);
    setContents(contentData);
    setVoices(voiceData);
    try {
      const localVoiceData = await getLocalVoices();
      setLocalVoices(localVoiceData);
    } catch (error) {
      setLocalVoices({ voices: [], trVoices: [], hasTurkishVoice: false, edgeVoices: [], error: error.message });
    }
    if (!pdfForm.category_id && categoryData[0]) {
      setPdfForm((current) => ({ ...current, category_id: String(categoryData[0].id) }));
    }
  }

  useEffect(() => {
    let alive = true;
    async function bootstrap() {
      if (!getAuthToken()) { setAuthLoading(false); return; }
      try {
        const result = await getMe();
        if (!alive) return;
        setAdminUser(result.user);
        await loadAll();
      } catch (error) {
        clearAuthToken();
        if (alive) setMessage(error.message);
      } finally {
        if (alive) setAuthLoading(false);
      }
    }
    bootstrap();
    return () => { alive = false; };
  }, []);

  async function refreshSelected(contentId = selectedContent?.id, withAnalysis = false) {
    if (!contentId) return;
    const data = await getContent(contentId);
    setSelectedContent(data);
    setContentDraft(makeContentDraft(data));
    if (withAnalysis) setAnalysis(await analyzeContent(contentId));
  }

  async function handleCreateCategory(event) {
    event.preventDefault();
    if (!newCategoryName.trim()) return;
    setBusy(true); setMessage('');
    try {
      await createCategory({ name: newCategoryName.trim(), description: newCategoryDescription.trim() });
      setNewCategoryName(''); setNewCategoryDescription('');
      await loadAll();
      setMessage('Kategori eklendi.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handleUpdateCategoryItem(categoryId) {
    const draft = categoryDrafts[categoryId];
    if (!draft?.name?.trim()) return setMessage('Kategori adı boş olamaz.');
    setBusy(true); setMessage('Kategori güncelleniyor...');
    try {
      await updateCategory(categoryId, { name: draft.name.trim(), description: draft.description || '' });
      await loadAll();
      setMessage('Kategori güncellendi.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handleDeleteCategoryItem(category) {
    const ok = window.confirm(`“${category.name}” kategorisi silinsin mi? Bu kategoriye bağlı içerikler kategorisiz kalır, içerikler silinmez.`);
    if (!ok) return;
    setBusy(true); setMessage('Kategori siliniyor...');
    try {
      const result = await deleteCategory(category.id);
      await loadAll();
      if (selectedContent) await refreshSelected(selectedContent.id, true).catch(() => {});
      setMessage(`Kategori silindi. ${result.detached_content_count || 0} içerik kategorisiz kaldı.`);
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handlePdfImport(event) {
    event.preventDefault();
    if (!pdfForm.pdf) return setMessage('PDF dosyası seçmelisin.');
    setBusy(true); setMessage('PDF işleniyor ve bölümlere ayrılıyor...');
    try {
      const formData = new FormData();
      Object.entries(pdfForm).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') formData.append(key, value);
      });
      const result = await importPdf(formData);
      await loadAll();
      const fullContent = await getContent(result.content.id);
      setSelectedContent(fullContent);
      setContentDraft(makeContentDraft(fullContent));
      setAnalysis(await analyzeContent(result.content.id));
      setMessage(`${result.episodes.length} bölüm oluşturuldu. Önce kontrol et, sonra seslendir ve Kütüphaneye al.`);
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function openContent(id) {
    setBusy(true); setMessage('');
    try {
      const data = await getContent(id);
      setSelectedContent(data);
      setContentDraft(makeContentDraft(data));
      setEditingEpisode(null);
      setAnalysis(await analyzeContent(id));
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handleSaveContent(event) {
    event.preventDefault();
    if (!selectedContent || !contentDraft) return;
    setBusy(true); setMessage('İçerik bilgileri kaydediliyor...');
    try {
      await updateContent(selectedContent.id, contentDraft);
      await loadAll();
      await refreshSelected(selectedContent.id, true);
      setMessage('İçerik bilgileri kaydedildi.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function publishContent(id) {
    setBusy(true); setMessage('');
    try {
      const nextStatus = selectedContent?.status === 'published' ? 'draft' : 'published';
      await setContentStatus(id, nextStatus);
      await loadAll(); await refreshSelected(id, true);
      setMessage(nextStatus === 'published' ? 'İçerik kütüphaneye/yayına alındı.' : 'İçerik taslağa alındı.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handleMoveToLibrary() {
    if (!selectedContent) return;
    const missingAudio = selectedEpisodes.filter((episode) => !episode.audio_url).length;
    const missingChecks = selectedQualityChecks.filter((item) => !item.ok).map((item) => item.label);
    let allowIncomplete = false;
    if (missingChecks.length > 0) {
      const ok = window.confirm('Yayın kontrol listesinde eksikler var: ' + missingChecks.join(', ') + '. Yine de kütüphaneye almak ister misin?');
      if (!ok) return;
      allowIncomplete = true;
    }
    setBusy(true); setMessage('İçerik kütüphaneye alınıyor...');
    try {
      const data = await moveContentToLibrary(selectedContent.id, { allow_without_audio: missingAudio > 0, allow_incomplete: allowIncomplete });
      setSelectedContent(data);
      setContentDraft(makeContentDraft(data));
      await loadAll();
      setAnalysis(await analyzeContent(selectedContent.id));
      setMessage('İçerik kütüphaneye alındı. Mobil uygulamada yayınlanmış içerik olarak görünür.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handleArchiveContent() {
    if (!selectedContent) return;
    setBusy(true); setMessage('İçerik arşive alınıyor...');
    try {
      await setContentStatus(selectedContent.id, 'archived');
      await loadAll(); await refreshSelected(selectedContent.id, true);
      setMessage('İçerik arşive alındı.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handleDeleteContentItem() {
    if (!selectedContent) return;
    const ok = window.confirm(`“${selectedContent.title}” ve tüm bölümleri kalıcı olarak silinsin mi?`);
    if (!ok) return;
    setBusy(true); setMessage('İçerik siliniyor...');
    try {
      await deleteContent(selectedContent.id);
      setSelectedContent(null); setContentDraft(null); setAnalysis(null); setEditingEpisode(null);
      await loadAll();
      setMessage('İçerik silindi.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handleUploadCover(event) {
    event.preventDefault();
    if (!selectedContent || !coverFile) return setMessage('Kapak görseli seçmelisin.');
    setBusy(true); setMessage('Kapak görseli yükleniyor...');
    try {
      const formData = new FormData();
      formData.append('cover', coverFile);
      formData.append('content_id', selectedContent.id);
      await uploadCover(formData);
      setCoverFile(null);
      await loadAll(); await refreshSelected(selectedContent.id, true);
      setMessage('Kapak görseli güncellendi.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handleUploadEpisodeAudio(episode) {
    const file = episodeAudioFiles[episode.id];
    if (!file) return setMessage('Önce bu bölüm için bir ses dosyası seçmelisin.');
    setBusy(true); setMessage('Manuel ses dosyası yükleniyor...');
    try {
      const formData = new FormData();
      formData.append('episode_id', episode.id);
      formData.append('audio', file);
      const result = await uploadEpisodeAudio(formData);
      setEpisodeAudioFiles((current) => ({ ...current, [episode.id]: null }));
      await refreshSelected(selectedContent.id, true);
      await loadAll();
      setMessage('Ses dosyası bölüme bağlandı: ' + (result.audio?.url || result.episode?.audio_url || 'tamam'));
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handleClearEpisodeAudio(episode) {
    if (!window.confirm('Bu bölümün ses bağlantısı temizlensin mi? Dosya fiziksel olarak silinmez ama bölüm artık sessiz görünür.')) return;
    setBusy(true); setMessage('Bölüm sesi temizleniyor...');
    try {
      await clearEpisodeAudio(episode.id);
      await refreshSelected(selectedContent.id, true);
      await loadAll();
      setMessage('Bölüm sesi temizlendi. Yeniden TTS yapabilir veya manuel ses yükleyebilirsin.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handleAnalyzeContent() {
    if (!selectedContent) return;
    setBusy(true); setMessage('PDF metni inceleniyor...');
    try { setAnalysis(await analyzeContent(selectedContent.id)); setMessage('İnceleme raporu güncellendi.'); }
    catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handlePreviewEpisodeSpeech(episode) {
    setBusy(true); setMessage('Ses metni önizlemesi hazırlanıyor...');
    try {
      const result = await previewEpisodeSpeech(episode.id, studioOptions);
      setSpeechPreview({ episode, ...result });
      setMessage('Sese gidecek metin önizlemesi hazır.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handlePreviewContentSpeech() {
    if (!selectedContent) return;
    setBusy(true); setMessage('Tüm içerik için ses kalite önizlemesi hazırlanıyor...');
    try {
      const result = await previewContentSpeech(selectedContent.id, studioOptions);
      setSpeechPreview({ content: selectedContent, contentPreview: result });
      setMessage('İçerik ses kalite önizlemesi hazır.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handlePrepareEpisode(episodeId) {
    setBusy(true); setMessage('Bölüm seslendirmeye hazırlanıyor...');
    try { await prepareEpisode(episodeId, studioOptions); await refreshSelected(selectedContent.id, true); setMessage('Bölüm seslendirme metni hazırlandı.'); }
    catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handlePrepareAll() {
    if (!selectedContent) return;
    setBusy(true); setMessage('Tüm bölümler seslendirmeye hazırlanıyor...');
    try {
      const result = await prepareAllEpisodes(selectedContent.id, studioOptions);
      setSelectedContent({ ...result.content, episodes: result.episodes });
      setContentDraft(makeContentDraft(result.content));
      setAnalysis(result.analysis);
      setMessage('Tüm bölümlerin seslendirme metni hazırlandı.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handleGenerateTts(episodeId) {
    setBusy(true); setMessage(`${selectedVoice?.label || 'Seçili ses'} ile ses oluşturuluyor...`);
    try {
      const result = await generateTts(episodeId, studioOptions);
      await refreshSelected(selectedContent.id, true);
      await loadAll();
      const audioUrl = result?.audio?.audioUrl || result?.episode?.audio_url;
      setMessage(audioUrl ? `Ses dosyası oluşturuldu: ${audioUrl}` : 'Ses işlemi tamamlandı ama ses URL bilgisi dönmedi.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handleGenerateAllTts() {
    if (!selectedContent) return;
    if (!window.confirm('Tüm bölümler için ses üretilecek. Devam edilsin mi?')) return;
    setBusy(true); setMessage('Tüm bölümler için ses oluşturuluyor...');
    try {
      const result = await generateAllTts(selectedContent.id, studioOptions);
      await refreshSelected(selectedContent.id, true); await loadAll();
      setMessage(result.errors?.length ? `${result.generated} bölüm seslendirildi, ${result.errors.length} bölümde hata var.` : `${result.generated} bölüm için ses dosyası oluşturuldu. Şimdi “Kütüphaneye al” diyebilirsin.`);
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handleTestTts() {
    setBusy(true); setMessage('Kısa ses testi oluşturuluyor...');
    try {
      const result = await testTts({ ...studioOptions, input: 'Merhaba. Sesli Sahne test ses kaydı başarıyla oluşturuluyor.' });
      setAudioFiles(await getAudioFiles());
      setMessage(`Ses testi başarılı: ${result.audio.audioUrl} (${result.audio.bytes || 0} byte)`);
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handleListAudioFiles() {
    setBusy(true); setMessage('Ses dosyaları kontrol ediliyor...');
    try { const files = await getAudioFiles(); setAudioFiles(files); setMessage(`${files.length} adet ses dosyası bulundu.`); }
    catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function saveEpisodeEdit(event) {
    event.preventDefault();
    if (!editingEpisode) return;
    setBusy(true); setMessage('Bölüm kaydediliyor...');
    try {
      await updateEpisode(editingEpisode.id, {
        title: editingEpisode.title,
        episode_no: editingEpisode.episode_no,
        raw_text: editingEpisode.raw_text,
        narration_script: editingEpisode.narration_script,
        status: editingEpisode.status
      });
      await refreshSelected(selectedContent.id, true);
      setEditingEpisode(null); setMessage('Bölüm güncellendi.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handleDeleteEpisodeItem(episode) {
    if (!window.confirm(`“${episode.title}” bölümü silinsin mi?`)) return;
    setBusy(true); setMessage('Bölüm siliniyor...');
    try {
      await deleteEpisode(episode.id);
      await refreshSelected(selectedContent.id, true);
      await loadAll();
      setMessage('Bölüm silindi.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handleMoveEpisodeItem(episode, direction) {
    if (!selectedContent) return;
    setBusy(true); setMessage(direction === 'up' ? 'Bölüm yukarı taşınıyor...' : 'Bölüm aşağı taşınıyor...');
    try {
      await moveEpisode(episode.id, direction);
      await refreshSelected(selectedContent.id, true);
      await loadAll();
      setMessage('Bölüm sırası güncellendi.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handleSplitEpisodeItem(episode) {
    if (!selectedContent) return;
    const ok = window.confirm('Bu bölüm metnin ortasına en yakın uygun yerden ikiye bölünsün mü? Varsa mevcut ses dosyası temizlenir ve yeniden ses üretmek gerekir.');
    if (!ok) return;
    setBusy(true); setMessage('Bölüm ikiye bölünüyor...');
    try {
      await splitEpisode(episode.id);
      await refreshSelected(selectedContent.id, true);
      await loadAll();
      setMessage('Bölüm ikiye bölündü. Ses üretimini yeniden yapabilirsin.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handleMergeEpisodeItem(episode) {
    if (!selectedContent) return;
    const ok = window.confirm('Bu bölüm sonraki bölümle birleştirilsin mi? Birleşen bölümün ses dosyası temizlenir ve yeniden ses üretmek gerekir.');
    if (!ok) return;
    setBusy(true); setMessage('Bölümler birleştiriliyor...');
    try {
      await mergeEpisodeNext(episode.id);
      await refreshSelected(selectedContent.id, true);
      await loadAll();
      setMessage('Bölümler birleştirildi. Ses üretimini yeniden yapabilirsin.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setBusy(true); setMessage('Giriş yapılıyor...');
    try {
      const result = await loginAdmin(loginForm);
      setAuthToken(result.token);
      setAdminUser(result.user);
      setMessage('Yayıncı paneline giriş yapıldı.');
      await loadAll();
    } catch (error) {
      setMessage(error.message);
    } finally { setBusy(false); setAuthLoading(false); }
  }

  function handleLogout() {
    clearAuthToken();
    setAdminUser(null);
    setSelectedContent(null);
    setContentDraft(null);
    setAnalysis(null);
    setMessage('Oturum kapatıldı.');
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    if (!passwordForm.current_password || !passwordForm.new_password) return setMessage('Mevcut şifre ve yeni şifre zorunludur.');
    setBusy(true); setMessage('Admin şifresi değiştiriliyor...');
    try {
      await changeAdminPassword(passwordForm);
      setPasswordForm({ current_password: '', new_password: '' });
      setMessage('Admin şifresi değiştirildi. Bir sonraki girişte yeni şifreyi kullan.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  if (authLoading) {
    return <main className="app-shell"><div className="auth-card"><h1>Sesli Sahne</h1><p>Yayıncı paneli hazırlanıyor...</p></div></main>;
  }

  if (!adminUser) {
    return (
      <main className="app-shell auth-shell">
        <section className="auth-card">
          <p className="eyebrow">Sesli Sahne v27</p>
          <h1>Yayıncı paneli girişi</h1>
          <p>PDF yükleme, ses üretme, kategori ve kütüphane yönetimi için admin oturumu gerekir. Mobil uygulamadaki kütüphane ve kullanıcı profilleri bundan etkilenmez.</p>
          <form onSubmit={handleLogin}>
            <label>Kullanıcı adı<input value={loginForm.username} onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })} /></label>
            <label>Şifre<input type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} /></label>
            <button disabled={busy} type="submit">Giriş yap</button>
          </form>
          <div className="hint-box"><strong>Local varsayılan giriş</strong><p>Kullanıcı adı: <b>admin</b> · Şifre: <b>0000</b>. Girişten sonra aşağıdaki panelden şifreyi değiştirebilirsin.</p></div>
          {message && <div className="message">{message}</div>}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Sesli Sahne v27 · Yayıncı Paneli</p>
          <h1>PDF’i içeri al, düzenle, seslendir ve korumalı yayıncı panelinden kütüphaneye taşı</h1>
          <p className="hero-text">Admin girişi ile korunan yayıncı panelinde PDF, kategori, ses üretimi ve kütüphane yönetimini güvenli şekilde yaparsın.</p>
        </div>
        <div className="stats-card">
          <strong>{groupedStats.total}</strong>
          <span>Toplam içerik</span>
          <div className="stat-row">
            <Badge tone="child">Çocuk {groupedStats.child}</Badge>
            <Badge tone="adult">Yetişkin {groupedStats.adult}</Badge>
            <Badge tone="family">Aile {groupedStats.family}</Badge>
          </div>
          <div className="stat-row">
            <Badge>Taslak {groupedStats.draft}</Badge>
            <Badge tone="success">Kütüphane {groupedStats.published}</Badge>
            <Badge tone="danger">Arşiv {groupedStats.archived}</Badge>
          </div>
          <div className="admin-session-box">
            <span>Giriş: <b>{adminUser.username}</b> · {adminUser.role}</span>
            <button className="ghost" type="button" onClick={handleLogout}>Çıkış</button>
          </div>
          <form className="password-mini-form" onSubmit={handleChangePassword}>
            <input type="password" placeholder="Mevcut şifre" value={passwordForm.current_password} onChange={(event) => setPasswordForm({ ...passwordForm, current_password: event.target.value })} />
            <input type="password" placeholder="Yeni şifre" value={passwordForm.new_password} onChange={(event) => setPasswordForm({ ...passwordForm, new_password: event.target.value })} />
            <button type="submit" disabled={busy}>Şifre değiştir</button>
          </form>
        </div>
      </header>

      {message && <div className="message">{message}</div>}

      <section className="grid two">
        <form className="card" onSubmit={handlePdfImport}>
          <h2>PDF içeri al</h2>
          <label>Başlık<input value={pdfForm.title} onChange={(event) => setPdfForm({ ...pdfForm, title: event.target.value })} placeholder="Örn. Ay Bahçesine Yolculuk" /></label>
          <label>Açıklama<textarea value={pdfForm.description} onChange={(event) => setPdfForm({ ...pdfForm, description: event.target.value })} placeholder="Kısa içerik açıklaması" rows={3} /></label>
          <div className="grid three compact">
            <label>Hedef kitle<select value={pdfForm.audience_type} onChange={(event) => setPdfForm({ ...pdfForm, audience_type: event.target.value })}><option value="child">Çocuk</option><option value="adult">Yetişkin</option><option value="family">Aile</option></select></label>
            <label>Min yaş<input type="number" value={pdfForm.age_min} onChange={(event) => setPdfForm({ ...pdfForm, age_min: event.target.value })} /></label>
            <label>Max yaş<input type="number" value={pdfForm.age_max} onChange={(event) => setPdfForm({ ...pdfForm, age_max: event.target.value })} /></label>
          </div>
          <label>Kategori<select value={pdfForm.category_id} onChange={(event) => setPdfForm({ ...pdfForm, category_id: event.target.value })}><option value="">Kategorisiz</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="checkbox-row"><input type="checkbox" checked={pdfForm.is_premium} onChange={(event) => setPdfForm({ ...pdfForm, is_premium: event.target.checked })} />Premium içerik</label>
          <label>PDF dosyası<input type="file" accept="application/pdf,.pdf" onChange={(event) => setPdfForm({ ...pdfForm, pdf: event.target.files?.[0] || null })} /></label>
          <button disabled={busy} type="submit">PDF yükle, incele ve bölümlere ayır</button>
        </form>

        <div className="card">
          <h2>Kategori yönetimi</h2>
          <form className="category-create" onSubmit={handleCreateCategory}>
            <input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="Yeni kategori adı" />
            <input value={newCategoryDescription} onChange={(event) => setNewCategoryDescription(event.target.value)} placeholder="Kısa açıklama" />
            <button disabled={busy} type="submit">Ekle</button>
          </form>
          <div className="category-admin-list">
            {categories.map((category) => {
              const draft = categoryDrafts[category.id] || { name: category.name, description: category.description || '' };
              return (
                <div key={category.id} className="category-admin-row">
                  <input value={draft.name} onChange={(event) => setCategoryDrafts({ ...categoryDrafts, [category.id]: { ...draft, name: event.target.value } })} />
                  <input value={draft.description} onChange={(event) => setCategoryDrafts({ ...categoryDrafts, [category.id]: { ...draft, description: event.target.value } })} placeholder="Açıklama" />
                  <span>{category.content_count || 0} içerik</span>
                  <button disabled={busy} type="button" onClick={() => handleUpdateCategoryItem(category.id)}>Kaydet</button>
                  <button disabled={busy} className="danger" type="button" onClick={() => handleDeleteCategoryItem(category)}>Sil</button>
                </div>
              );
            })}
          </div>
          <div className="hint-box"><strong>Telif notu</strong><p>Seslendireceğin PDF için yayınlama/seslendirme hakkına sahip olduğundan emin olmalısın.</p></div>
        </div>
      </section>

      <section className="grid two content-layout">
        <div className="card">
          <div className="section-head-row"><h2>İçerikler</h2><button type="button" onClick={() => loadAll()} disabled={busy}>Yenile</button></div>
          <div className="filter-row">
            <input value={contentSearch} onChange={(event) => setContentSearch(event.target.value)} placeholder="İçerik ara" />
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="all">Tüm durumlar</option><option value="draft">Taslak</option><option value="published">Kütüphane</option><option value="archived">Arşiv</option></select>
            <select value={filters.audience_type} onChange={(event) => setFilters({ ...filters, audience_type: event.target.value })}><option value="all">Tüm kitleler</option><option value="child">Çocuk</option><option value="adult">Yetişkin</option><option value="family">Aile</option></select>
          </div>
          <div className="content-list">
            {filteredContents.map((content) => (
              <button key={content.id} className={`content-item ${selectedContent?.id === content.id ? 'active' : ''}`} onClick={() => openContent(content.id)} type="button">
                <div><strong>{content.title}</strong><span>{content.category_name || 'Kategorisiz'} · {content.episode_count} bölüm · {content.audio_count || 0} sesli</span></div>
                <div className="item-badges"><Badge tone={content.audience_type}>{audienceLabels[content.audience_type]}</Badge><Badge tone={qualityTones[content.quality_status] || 'default'}>{qualityLabels[content.quality_status] || statusLabels[content.status] || content.status}</Badge></div>
              </button>
            ))}
          </div>
        </div>

        <div className="card detail-card">
          {!selectedContent ? <div className="empty-state">Bir içerik seç veya PDF yükleyerek yeni içerik oluştur.</div> : (
            <>
              <div className="detail-head">
                <div><h2>{selectedContent.title}</h2><p>{selectedContent.description || 'Açıklama eklenmemiş.'}</p></div>
                <div className="detail-actions"><button disabled={busy} onClick={handleMoveToLibrary} type="button">Kütüphaneye al</button><button disabled={busy} onClick={() => publishContent(selectedContent.id)} type="button">{selectedContent.status === 'published' ? 'Taslağa al' : 'Yayına al'}</button><button disabled={busy} className="danger" onClick={handleDeleteContentItem} type="button">İçeriği sil</button></div>
              </div>
              <div className="meta-row"><Badge tone={selectedContent.audience_type}>{audienceLabels[selectedContent.audience_type]}</Badge><Badge>{selectedContent.category_name || 'Kategorisiz'}</Badge><Badge>{selectedContent.age_min || '?'}–{selectedContent.age_max || '?'} yaş</Badge><Badge>{statusLabels[selectedContent.status] || selectedContent.status}</Badge></div>

              <div className="publish-checklist">
                <div className="section-head-row"><h3>Yayın kontrol listesi</h3><span>{selectedQualityChecks.filter((item) => item.ok).length}/{selectedQualityChecks.length} hazır</span></div>
                <div className="checklist-grid">
                  {selectedQualityChecks.map((item) => <div key={item.label} className={`check-item ${item.ok ? 'ok' : 'warn'}`}><strong>{item.ok ? '✓' : '!' } {item.label}</strong><span>{item.text}</span></div>)}
                </div>
                <p className="mini-hint">Kütüphaneye almadan önce özellikle kapak, kategori ve tüm bölümlerin ses dosyalarını kontrol etmek iyi olur.</p>
              </div>

              {contentDraft && (
                <form className="content-edit-card" onSubmit={handleSaveContent}>
                  <h3>İçerik bilgileri</h3>
                  <label>Başlık<input value={contentDraft.title} onChange={(event) => setContentDraft({ ...contentDraft, title: event.target.value })} /></label>
                  <label>Açıklama<textarea rows={3} value={contentDraft.description} onChange={(event) => setContentDraft({ ...contentDraft, description: event.target.value })} /></label>
                  <div className="grid three compact">
                    <label>Hedef kitle<select value={contentDraft.audience_type} onChange={(event) => setContentDraft({ ...contentDraft, audience_type: event.target.value })}><option value="child">Çocuk</option><option value="adult">Yetişkin</option><option value="family">Aile</option></select></label>
                    <label>Min yaş<input type="number" value={contentDraft.age_min ?? ''} onChange={(event) => setContentDraft({ ...contentDraft, age_min: event.target.value })} /></label>
                    <label>Max yaş<input type="number" value={contentDraft.age_max ?? ''} onChange={(event) => setContentDraft({ ...contentDraft, age_max: event.target.value })} /></label>
                  </div>
                  <div className="grid three compact">
                    <label>Kategori<select value={contentDraft.category_id ?? ''} onChange={(event) => setContentDraft({ ...contentDraft, category_id: event.target.value })}><option value="">Kategorisiz</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                    <label>Durum<select value={contentDraft.status} onChange={(event) => setContentDraft({ ...contentDraft, status: event.target.value })}><option value="draft">Taslak</option><option value="published">Kütüphane/Yayında</option><option value="archived">Arşiv</option></select></label>
                    <label className="checkbox-row premium-row"><input type="checkbox" checked={contentDraft.is_premium} onChange={(event) => setContentDraft({ ...contentDraft, is_premium: event.target.checked })} />Premium</label>
                  </div>
                  <div className="form-actions"><button disabled={busy} type="submit">Bilgileri kaydet</button><button disabled={busy} type="button" onClick={handleArchiveContent}>Arşive al</button></div>
                </form>
              )}

              <div className="cover-admin-row">
                <div className="cover-preview">{selectedContent.cover_image_url ? <img src={`${FILE_BASE}${selectedContent.cover_image_url}`} alt="Kapak" /> : <span>♪</span>}</div>
                <form className="cover-form" onSubmit={handleUploadCover}><strong>Kapak görseli</strong><p>Mobil listede ve içerik detayında görünecek kapak görselini buradan yükleyebilirsin.</p><input type="file" accept="image/*" onChange={(event) => setCoverFile(event.target.files?.[0] || null)} /><button disabled={busy || !coverFile} type="submit">Kapak yükle</button></form>
              </div>

              <section className="studio-panel">
                <div className="studio-head"><div><p className="eyebrow">İçerik Stüdyosu</p><h3>PDF inceleme ve ses üretim akışı</h3></div><button disabled={busy} type="button" onClick={handleAnalyzeContent}>İncelemeyi yenile</button></div>
                <div className="studio-controls">
                  <label>TTS yöntemi<select value={studioOptions.provider} onChange={(event) => setStudioOptions({ ...studioOptions, provider: event.target.value, model: event.target.value === 'openai' ? 'gpt-4o-mini-tts' : ((event.target.value === 'edge_online' ? 'edge-online-readaloud' : (event.target.value === 'edge_python' ? 'python-edge-tts' : 'local-windows-system-speech'))) })}><option value="edge_python">Keysiz Türkçe neural ses (Python Edge - önerilen)</option><option value="edge_online">Keysiz Türkçe neural ses (Edge WebSocket eski)</option><option value="local_windows">Keysiz Windows yerel ses</option><option value="openai">OpenAI TTS (API key gerekir)</option></select></label>
                  {(studioOptions.provider === 'edge_online' || studioOptions.provider === 'edge_python') && <label>Türkçe neural ses<select value={studioOptions.edge_voice_name} onChange={(event) => setStudioOptions({ ...studioOptions, edge_voice_name: event.target.value })}><option value="">Otomatik: profile göre Emel/Ahmet</option>{(localVoices.edgeVoices || []).map((voice) => <option key={voice.name} value={voice.name}>{voice.label} · {voice.gender}</option>)}</select></label>}
                  {studioOptions.provider === 'local_windows' && <label>Windows sesi<select value={studioOptions.local_voice_name} onChange={(event) => setStudioOptions({ ...studioOptions, local_voice_name: event.target.value })}><option value="">Otomatik Türkçe ses seç</option>{localVoices.trVoices?.map((voice) => <option key={voice.name} value={voice.name}>TR · {voice.name} · {voice.gender}</option>)}{localVoices.voices?.filter((voice) => voice.culture !== 'tr-TR').map((voice) => <option key={voice.name} value={voice.name}>{voice.culture} · {voice.name} · {voice.gender}</option>)}</select></label>}
                  <label>Ses profili<select value={studioOptions.voice_profile} onChange={(event) => setStudioOptions({ ...studioOptions, voice_profile: event.target.value })}>{voices.map((voice) => <option key={voice.id} value={voice.id}>{voice.label}</option>)}</select></label>
                  <label>Akış tarzı<select value={studioOptions.style} onChange={(event) => setStudioOptions({ ...studioOptions, style: event.target.value })}>{Object.entries(styleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  {(studioOptions.provider === 'edge_python' || studioOptions.provider === 'edge_online') && <label>Okuma hızı<select value={studioOptions.tts_rate} onChange={(event) => setStudioOptions({ ...studioOptions, tts_rate: event.target.value })}>{rateOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>}
                  <label>Duraklama<select value={studioOptions.pause_level} onChange={(event) => setStudioOptions({ ...studioOptions, pause_level: event.target.value })}>{pauseLevelOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
                  {studioOptions.provider === 'openai' && <label>TTS model<input value={studioOptions.model} onChange={(event) => setStudioOptions({ ...studioOptions, model: event.target.value })} /></label>}
                  <label className="checkbox-row studio-check"><input type="checkbox" checked={studioOptions.include_existing} onChange={(event) => setStudioOptions({ ...studioOptions, include_existing: event.target.checked })} />Mevcut sesleri tekrar üret</label>
                </div>
                {selectedVoice && <p className="voice-description">{selectedVoice.description}</p>}
                <div className="studio-actions"><button disabled={busy} type="button" onClick={handlePreviewContentSpeech}>Ses kalite önizlemesi</button><button disabled={busy} type="button" onClick={handlePrepareAll}>Tümünü seslendirmeye hazırla</button><button disabled={busy} type="button" onClick={handleGenerateAllTts}>Tümünü sese çevir</button><button disabled={busy} type="button" onClick={handleMoveToLibrary}>Kütüphaneye al</button><button disabled={busy} type="button" onClick={handleTestTts}>Kısa ses test</button><button disabled={busy} type="button" onClick={handleListAudioFiles}>Ses dosyalarını listele</button></div>
                {audioFiles.length > 0 && <div className="audio-file-list"><strong>Son ses dosyaları</strong>{audioFiles.slice(0, 5).map((file) => <div key={file.filename} className="audio-file-row"><span>{file.filename} · {formatNumber(file.bytes)} byte</span><audio controls src={`${FILE_BASE}${file.audio_url}?t=${Date.now()}`} /></div>)}</div>}
                {speechPreview && <div className="speech-preview-box"><div className="section-head-row"><strong>Ses kalite önizlemesi</strong><button type="button" className="ghost" onClick={() => setSpeechPreview(null)}>Kapat</button></div>{speechPreview.contentPreview ? <p>{speechPreview.contentPreview.episodes?.length || 0} bölüm kontrol edildi. İlk bölüm: {speechPreview.contentPreview.episodes?.[0]?.words || 0} kelime.</p> : <><p><strong>{speechPreview.episode?.title}</strong> · {formatNumber(speechPreview.words)} kelime · {formatNumber(speechPreview.chars)} karakter</p>{speechPreview.warnings?.length > 0 && <div className="warning-box">{speechPreview.warnings.map((warning) => <p key={warning}>⚠ {warning}</p>)}</div>}<textarea readOnly rows={8} value={(speechPreview.prepared_text || '').slice(0, 2400)} /></>}</div>}
                {analysis && <div className="analysis-grid"><div><strong>{analysis.episode_count}</strong><span>Bölüm</span></div><div><strong>{formatNumber(analysis.totals.words)}</strong><span>Kelime</span></div><div><strong>{analysis.totals.estimated_duration_label}</strong><span>Tahmini süre</span></div><div><strong>{analysis.totals.warning_count}</strong><span>Kontrol uyarısı</span></div><div><strong>{analysis.totals.audio_count}</strong><span>Ses dosyası</span></div></div>}
              </section>

              <div className="episodes">
                {selectedEpisodes.map((episode) => {
                  const episodeAnalysis = analysis?.episodes?.find((item) => item.episode_id === episode.id);
                  return <article key={episode.id} className="episode-card">
                    <div className="episode-top"><div><h3>{episode.episode_no}. {episode.title}</h3><p>{episode.raw_text?.slice(0, 180)}{episode.raw_text?.length > 180 ? '...' : ''}</p></div><Badge>{statusLabels[episode.status] || episode.status}</Badge></div>
                    {episodeAnalysis && <div className="episode-metrics"><span>{formatNumber(episodeAnalysis.words)} kelime</span><span>~{episodeAnalysis.estimated_duration_label}</span><span>{episodeAnalysis.paragraphs} paragraf</span><span>{episodeAnalysis.dialogue_lines} diyalog satırı</span></div>}
                    {episodeAnalysis?.warnings?.length > 0 && <div className="warning-box">{episodeAnalysis.warnings.map((warning) => <p key={warning}>⚠ {warning}</p>)}</div>}
                    {episode.audio_url && <audio key={episode.audio_url} controls src={`${FILE_BASE}${episode.audio_url}?t=${Date.now()}`} />}
                    <div className="manual-audio-box">
                      <div>
                        <strong>Manuel ses dosyası</strong>
                        <span>MP3, WAV, M4A, AAC, OGG veya WEBM yükleyip bu bölüme bağlayabilirsin.</span>
                      </div>
                      <input type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm" onChange={(event) => setEpisodeAudioFiles({ ...episodeAudioFiles, [episode.id]: event.target.files?.[0] || null })} />
                      <button disabled={busy || !episodeAudioFiles[episode.id]} type="button" onClick={() => handleUploadEpisodeAudio(episode)}>Ses yükle ve bağla</button>
                      {episode.audio_url && <button disabled={busy} className="danger" type="button" onClick={() => handleClearEpisodeAudio(episode)}>Ses bağlantısını temizle</button>}
                    </div>
                    <div className="episode-actions"><button type="button" onClick={() => setEditingEpisode(episode)}>Metni düzenle</button><button disabled={busy || episode.episode_no <= 1} type="button" onClick={() => handleMoveEpisodeItem(episode, 'up')}>Yukarı</button><button disabled={busy || episode.episode_no >= selectedEpisodes.length} type="button" onClick={() => handleMoveEpisodeItem(episode, 'down')}>Aşağı</button><button disabled={busy} type="button" onClick={() => handleSplitEpisodeItem(episode)}>İkiye böl</button><button disabled={busy || episode.episode_no >= selectedEpisodes.length} type="button" onClick={() => handleMergeEpisodeItem(episode)}>Sonrakiyle birleştir</button><button disabled={busy} type="button" onClick={() => handlePreviewEpisodeSpeech(episode)}>Ses önizleme</button><button disabled={busy} type="button" onClick={() => handlePrepareEpisode(episode.id)}>Sese hazırla</button><button disabled={busy} type="button" onClick={() => handleGenerateTts(episode.id)}>Seçili sesle oluştur</button><button disabled={busy} className="danger" type="button" onClick={() => handleDeleteEpisodeItem(episode)}>Bölümü sil</button></div>
                  </article>;
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {editingEpisode && <div className="modal-backdrop" onClick={() => setEditingEpisode(null)}>
        <form className="modal" onSubmit={saveEpisodeEdit} onClick={(event) => event.stopPropagation()}>
          <div className="modal-head"><h2>Bölüm düzenle</h2><button type="button" className="ghost" onClick={() => setEditingEpisode(null)}>Kapat</button></div>
          <label>Başlık<input value={editingEpisode.title} onChange={(event) => setEditingEpisode({ ...editingEpisode, title: event.target.value })} /></label>
          <label>Bölüm sırası<input type="number" value={editingEpisode.episode_no} onChange={(event) => setEditingEpisode({ ...editingEpisode, episode_no: Number(event.target.value) })} /></label>
          <label>Ham metin<textarea value={editingEpisode.raw_text || ''} onChange={(event) => setEditingEpisode({ ...editingEpisode, raw_text: event.target.value })} rows={8} /></label>
          <label>Seslendirme metni / prodüksiyon notu<textarea value={editingEpisode.narration_script || ''} onChange={(event) => setEditingEpisode({ ...editingEpisode, narration_script: event.target.value })} rows={10} /></label>
          <label>Durum<select value={editingEpisode.status} onChange={(event) => setEditingEpisode({ ...editingEpisode, status: event.target.value })}><option value="draft">Taslak</option><option value="ready_for_tts">Sese hazır</option><option value="audio_generated">Ses üretildi</option><option value="published">Yayında</option><option value="archived">Arşiv</option></select></label>
          <button disabled={busy} type="submit">Kaydet</button>
        </form>
      </div>}
    </main>
  );
}

export default App;
