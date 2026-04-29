export const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');
export const FILE_BASE = API_BASE.startsWith('http') ? API_BASE.replace(/\/api$/, '') : '';

const TOKEN_KEY = 'sesli_sahne_admin_token';
let authToken = localStorage.getItem(TOKEN_KEY) || '';

export function getAuthToken() { return authToken; }
export function setAuthToken(token) {
  authToken = token || '';
  if (authToken) localStorage.setItem(TOKEN_KEY, authToken);
  else localStorage.removeItem(TOKEN_KEY);
}
export function clearAuthToken() { setAuthToken(''); }

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  let response;
  const headers = new Headers(options.headers || {});
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`);
  const finalOptions = { ...options, headers };

  try {
    response = await fetch(url, finalOptions);
  } catch (error) {
    throw new Error(`Backend bağlantısı kurulamadı: ${url}. ${error.message || error}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : { raw: await response.text().catch(() => '') };

  if (!response.ok) {
    if (response.status === 401) clearAuthToken();
    throw new Error(payload.error || payload.raw || `İstek başarısız oldu: ${response.status}`);
  }
  return payload.data ?? payload;
}

export function loginAdmin(data) {
  return request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}
export function getMe() { return request('/auth/me'); }
export function changeAdminPassword(data) {
  return request('/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

export function getCategories() { return request('/categories'); }
export function createCategory(data) {
  return request('/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}
export function updateCategory(id, data) {
  return request(`/categories/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}
export function deleteCategory(id) {
  return request(`/categories/${id}`, { method: 'DELETE' });
}
export function getContents() { return request('/contents'); }
export function getContent(id) { return request(`/contents/${id}`); }
export function updateContent(id, data) {
  return request(`/contents/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}
export function setContentStatus(id, status) {
  return request(`/contents/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
}
export function moveContentToLibrary(id, data = {}) {
  return request(`/contents/${id}/library`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}
export function deleteContent(id) {
  return request(`/contents/${id}`, { method: 'DELETE' });
}
export function importPdf(formData) { return request('/imports/pdf', { method: 'POST', body: formData }); }
export function uploadCover(formData) { return request('/media/covers', { method: 'POST', body: formData }); }
export function uploadEpisodeAudio(formData) { return request('/media/audio', { method: 'POST', body: formData }); }
export function clearEpisodeAudio(episodeId) { return request('/media/audio/' + episodeId, { method: 'DELETE' }); }
export function getVoices() { return request('/studio/voices'); }
export function analyzeContent(id) { return request(`/studio/contents/${id}/analyze`); }
export function prepareEpisode(episodeId, data) {
  return request(`/studio/episodes/${episodeId}/prepare`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}
export function prepareAllEpisodes(contentId, data) {
  return request(`/studio/contents/${contentId}/prepare-all`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

export function previewEpisodeSpeech(episodeId, data = {}) {
  return request(`/studio/episodes/${episodeId}/preview-speech`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}
export function previewContentSpeech(contentId, data = {}) {
  return request(`/studio/contents/${contentId}/preview-speech`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

export function generateTts(episodeId, data = {}) {
  return request(`/tts/episodes/${episodeId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}
export function generateAllTts(contentId, data = {}) {
  return request(`/tts/contents/${contentId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}
export function testTts(data = {}) {
  return request('/tts/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}
export function getTtsJobs() { return request('/tts/jobs'); }
export function getAudioFiles() { return request('/tts/files'); }
export function getLocalVoices() { return request('/tts/local-voices'); }
export function updateEpisode(id, data) {
  return request(`/episodes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}
export function deleteEpisode(id) {
  return request(`/episodes/${id}`, { method: 'DELETE' });
}
export function getContentQuality(id) { return request(`/contents/${id}/quality`); }
export function moveEpisode(id, direction) {
  return request(`/episodes/${id}/move`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ direction }) });
}
export function splitEpisode(id, position) {
  return request(`/episodes/${id}/split`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position }) });
}
export function mergeEpisodeNext(id) {
  return request(`/episodes/${id}/merge-next`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
}
