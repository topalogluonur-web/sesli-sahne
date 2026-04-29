const DEFAULT_API_BASE_URL = 'http://localhost:5055/api';
const DEFAULT_PROFILE_ID = 1;

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;

export const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

let authToken = '';

export function setAppAuthToken(token) {
  authToken = token || '';
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(payload.error || 'Sunucu isteği başarısız oldu.');
  }

  return payload.data ?? payload;
}

export function mediaUrl(value) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SERVER_BASE_URL}${value}`;
}

export const api = {
  setAuthToken: setAppAuthToken,
  health: () => request('/health'),
  registerUser: (data) => request('/user-auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  loginUser: (data) => request('/user-auth/login', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  demoLogin: () => request('/user-auth/demo-login', { method: 'POST' }),
  me: () => request('/user-auth/me'),
  logoutUser: () => request('/user-auth/logout', { method: 'POST' }),
  profiles: () => request('/profiles'),
  createProfile: (data) => request('/profiles', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  deleteProfile: (profileId) => request(`/profiles/${profileId}`, { method: 'DELETE' }),
  verifyProfilePin: (profileId, pin) => request(`/profiles/${profileId}/verify-pin`, {
    method: 'POST',
    body: JSON.stringify({ pin })
  }),
  categories: () => request('/categories'),
  contents: ({ audienceType } = {}) => {
    const params = new URLSearchParams({ status: 'published' });
    if (audienceType) params.set('audience_type', audienceType);
    return request(`/contents?${params.toString()}`);
  },
  content: (id) => request(`/contents/${id}`),
  episodesByContent: (contentId) => request(`/episodes/content/${contentId}`),
  favorites: (profileId = DEFAULT_PROFILE_ID) => request(`/favorites?profile_id=${profileId}`),
  addFavorite: (contentId, profileId = DEFAULT_PROFILE_ID) => request(`/favorites/${contentId}`, {
    method: 'POST',
    body: JSON.stringify({ profile_id: profileId })
  }),
  removeFavorite: (contentId, profileId = DEFAULT_PROFILE_ID) => request(`/favorites/${contentId}?profile_id=${profileId}`, {
    method: 'DELETE'
  }),
  history: (profileId = DEFAULT_PROFILE_ID) => request(`/history?profile_id=${profileId}`),
  historySummary: (profileId = DEFAULT_PROFILE_ID) => request(`/history/summary?profile_id=${profileId}`),
  contentHistory: (contentId, profileId = DEFAULT_PROFILE_ID) => request(`/history/content/${contentId}?profile_id=${profileId}`),
  saveHistory: (episodeId, data, profileId = DEFAULT_PROFILE_ID) => request(`/history/episodes/${episodeId}`, {
    method: 'POST',
    body: JSON.stringify({ ...data, profile_id: profileId })
  })
};
