import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { Audio } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL, api, mediaUrl } from './src/api';
import { audienceMeta, colors } from './src/theme';

function formatDuration(seconds) {
  if (!seconds || Number.isNaN(Number(seconds))) return 'Süre yok';
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function formatDateTime(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return String(value);
  }
}

function formatDurationLong(seconds) {
  const total = Math.max(0, Number(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours} sa ${minutes} dk`;
  return `${minutes} dk`;
}

function shortText(value, max = 140) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

function CoverBlock({ url, accentColor, size = 'small' }) {
  const resolved = mediaUrl(url);
  return (
    <View style={[styles.coverPlaceholder, size === 'large' && styles.coverLarge, { backgroundColor: `${accentColor}18` }]}> 
      {resolved ? (
        <Image source={{ uri: resolved }} style={styles.coverImage} resizeMode="cover" />
      ) : (
        <Text style={[styles.coverText, { color: accentColor }]}>♪</Text>
      )}
    </View>
  );
}

function EmptyState({ title, text }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>☁️</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function BrandMark({ size = 'normal' }) {
  const large = size === 'large';
  return (
    <View style={[styles.brandMark, large && styles.brandMarkLarge]}>
      <Text style={[styles.brandMarkText, large && styles.brandMarkTextLarge]}>SS</Text>
    </View>
  );
}

function WelcomeFeature({ icon, title, text }) {
  return (
    <View style={styles.welcomeFeatureCard}>
      <Text style={styles.welcomeFeatureIcon}>{icon}</Text>
      <Text style={styles.welcomeFeatureTitle}>{title}</Text>
      <Text style={styles.welcomeFeatureText}>{text}</Text>
    </View>
  );
}


function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('demo@seslisahne.local');
  const [password, setPassword] = useState('0000');
  const [loading, setLoading] = useState(false);

  const submit = useCallback(async () => {
    setLoading(true);
    try {
      const payload = mode === 'register'
        ? await api.registerUser({ name, email, password })
        : await api.loginUser({ email, password });
      api.setAuthToken(payload.token);
      onAuthenticated(payload.user, payload.token);
    } catch (err) {
      Alert.alert(mode === 'register' ? 'Kayıt oluşturulamadı' : 'Giriş başarısız', err.message || 'Bilinmeyen hata.');
    } finally {
      setLoading(false);
    }
  }, [email, mode, name, onAuthenticated, password]);

  const demoLogin = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await api.demoLogin();
      api.setAuthToken(payload.token);
      onAuthenticated(payload.user, payload.token);
    } catch (err) {
      Alert.alert('Demo giriş başarısız', err.message || 'Backend açık mı kontrol et.');
    } finally {
      setLoading(false);
    }
  }, [onAuthenticated]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.authWrap}>
        <View style={styles.welcomeHeroCard}>
          <BrandMark size="large" />
          <Text style={styles.logoCentered}>Sesli Sahne</Text>
          <Text style={styles.welcomeTitle}>Her yaş için ekransız hikâye deneyimi</Text>
          <Text style={styles.welcomeText}>Masallar, sesli tiyatrolar, uyku anlatıları ve yetişkin hikâyeleri tek kütüphanede.</Text>
          <View style={styles.welcomeFeatureRow}>
            <WelcomeFeature icon="🧸" title="Çocuk" text="Yaşa uygun masal ve uyku içerikleri" />
            <WelcomeFeature icon="🎧" title="Yetişkin" text="Kısa hikâye ve rahatlama anlatıları" />
          </View>
        </View>

        <View style={styles.authCard}>
          <Text style={styles.authCardTitle}>Devam etmek için hesabını seç</Text>
          <Text style={styles.authCardSub}>Demo hesapla hemen deneyebilir veya yeni hesap oluşturabilirsin.</Text>
          <View style={styles.segmentRow}>
            <Pressable onPress={() => setMode('login')} style={[styles.segmentButton, mode === 'login' && { backgroundColor: colors.ink, borderColor: colors.ink }]}>
              <Text style={[styles.segmentText, mode === 'login' && styles.segmentTextActive]}>Giriş</Text>
            </Pressable>
            <Pressable onPress={() => setMode('register')} style={[styles.segmentButton, mode === 'register' && { backgroundColor: colors.ink, borderColor: colors.ink }]}>
              <Text style={[styles.segmentText, mode === 'register' && styles.segmentTextActive]}>Yeni hesap</Text>
            </Pressable>
          </View>

          {mode === 'register' && (
            <TextInput value={name} onChangeText={setName} placeholder="Ad soyad" style={styles.textInput} />
          )}
          <TextInput value={email} onChangeText={setEmail} placeholder="E-posta" autoCapitalize="none" keyboardType="email-address" style={styles.textInput} />
          <TextInput value={password} onChangeText={setPassword} placeholder="Şifre" secureTextEntry style={styles.textInput} />

          <Pressable onPress={submit} disabled={loading} style={[styles.primaryButtonWide, loading && styles.disabledButton]}>
            <Text style={styles.primaryButtonText}>{loading ? 'Bekleyin...' : mode === 'register' ? 'Hesap oluştur' : 'Giriş yap'}</Text>
          </Pressable>
          <Pressable onPress={demoLogin} disabled={loading} style={styles.secondaryButtonWide}>
            <Text style={styles.secondaryButtonText}>Demo hesapla devam et</Text>
          </Pressable>
          <Text style={styles.footerNote}>Demo: demo@seslisahne.local / 0000 · API: {API_BASE_URL}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PinModal({ visible, profile, onClose, onSuccess }) {
  const [pin, setPin] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (visible) setPin('');
  }, [visible]);

  const submit = useCallback(async () => {
    if (!profile) return;
    setChecking(true);
    try {
      await api.verifyProfilePin(profile.id, pin);
      onSuccess(profile);
    } catch (err) {
      Alert.alert('PIN hatalı', err.message || 'Lütfen tekrar deneyin.');
    } finally {
      setChecking(false);
    }
  }, [onSuccess, pin, profile]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalShade}>
        <View style={styles.modalCard}>
          <Text style={styles.modalEmoji}>{profile?.avatar_emoji || '🔒'}</Text>
          <Text style={styles.modalTitle}>{profile?.name || 'Profil'} PIN</Text>
          <Text style={styles.modalText}>Bu alana geçmek için ebeveyn / yetişkin PIN kodunu gir.</Text>
          <TextInput
            value={pin}
            onChangeText={setPin}
            placeholder="0000"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            style={styles.pinInput}
          />
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Vazgeç</Text>
            </Pressable>
            <Pressable onPress={submit} style={[styles.primaryButton, checking && styles.disabledButton]} disabled={checking}>
              <Text style={styles.primaryButtonText}>{checking ? 'Kontrol...' : 'Giriş'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CreateProfileModal({ visible, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [audienceType, setAudienceType] = useState('child');
  const [ageMin, setAgeMin] = useState('3');
  const [ageMax, setAgeMax] = useState('8');
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinCode, setPinCode] = useState('0000');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName('');
    setAudienceType('child');
    setAgeMin('3');
    setAgeMax('8');
    setPinEnabled(false);
    setPinCode('0000');
  }, [visible]);

  const submit = useCallback(async () => {
    setSaving(true);
    try {
      const profile = await api.createProfile({
        name,
        audience_type: audienceType,
        age_min: audienceType === 'child' ? ageMin : null,
        age_max: audienceType === 'child' ? ageMax : null,
        avatar_emoji: audienceMeta[audienceType]?.emoji || '🎧',
        pin_enabled: pinEnabled,
        pin_code: pinEnabled ? pinCode : null
      });
      onCreated(profile);
    } catch (err) {
      Alert.alert('Profil oluşturulamadı', err.message || 'Bilinmeyen hata.');
    } finally {
      setSaving(false);
    }
  }, [ageMax, ageMin, audienceType, name, onCreated, pinCode, pinEnabled]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalShade}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Yeni profil</Text>
          <Text style={styles.modalText}>Çocuk, yetişkin veya aile için ayrı dinleme geçmişi ve favori listesi oluştur.</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Profil adı" style={styles.textInput} />

          <View style={styles.segmentRow}>
            {Object.entries(audienceMeta).map(([key, item]) => (
              <Pressable
                key={key}
                onPress={() => setAudienceType(key)}
                style={[styles.segmentButton, audienceType === key && { backgroundColor: item.color, borderColor: item.color }]}
              >
                <Text style={[styles.segmentText, audienceType === key && styles.segmentTextActive]}>{item.emoji} {item.label}</Text>
              </Pressable>
            ))}
          </View>

          {audienceType === 'child' && (
            <View style={styles.rowGap}>
              <TextInput value={ageMin} onChangeText={setAgeMin} placeholder="Min yaş" keyboardType="number-pad" style={[styles.textInput, styles.halfInput]} />
              <TextInput value={ageMax} onChangeText={setAgeMax} placeholder="Max yaş" keyboardType="number-pad" style={[styles.textInput, styles.halfInput]} />
            </View>
          )}

          <Pressable onPress={() => setPinEnabled((v) => !v)} style={styles.checkRow}>
            <Text style={styles.checkBox}>{pinEnabled ? '☑' : '☐'}</Text>
            <Text style={styles.checkText}>Bu profil için PIN iste</Text>
          </Pressable>
          {pinEnabled && (
            <TextInput value={pinCode} onChangeText={setPinCode} placeholder="PIN" keyboardType="number-pad" maxLength={6} style={styles.textInput} />
          )}

          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Vazgeç</Text>
            </Pressable>
            <Pressable onPress={submit} style={[styles.primaryButton, saving && styles.disabledButton]} disabled={saving}>
              <Text style={styles.primaryButtonText}>{saving ? 'Kaydediliyor...' : 'Oluştur'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ProfileSelectionScreen({ user, onSelect, onLogout }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pinProfile, setPinProfile] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const data = await api.profiles();
    setProfiles(data || []);
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    load()
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [load]);

  const selectProfile = useCallback((profile) => {
    if (profile.pin_enabled) {
      setPinProfile(profile);
      return;
    }
    onSelect(profile);
  }, [onSelect]);

  const created = useCallback(async (profile) => {
    setCreateOpen(false);
    await load();
    if (profile && !profile.pin_enabled) onSelect(profile);
  }, [load, onSelect]);

  const deleteProfile = useCallback((profile) => {
    Alert.alert(
      'Profil silinsin mi?',
      `${profile.name} profili silinirse favorileri ve dinleme geçmişi de silinir. Kütüphane içerikleri silinmez.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteProfile(profile.id);
              await load();
            } catch (err) {
              Alert.alert('Profil silinemedi', err.message || 'Bilinmeyen hata.');
            }
          }
        }
      ]
    );
  }, [load]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.profileHeroCard}>
        <View style={styles.authUserRow}>
          <View style={styles.brandRow}>
            <BrandMark />
            <View>
              <Text style={styles.logoCompact}>Sesli Sahne</Text>
              <Text style={styles.overline}>{user?.email || 'Kullanıcı hesabı'}</Text>
            </View>
          </View>
          <Pressable onPress={onLogout} style={styles.switchButton}><Text style={styles.switchButtonText}>Çıkış</Text></Pressable>
        </View>
        <Text style={styles.heroTitle}>Kim dinliyor?</Text>
        <Text style={styles.heroText}>Her profil kendi favorilerini ve dinleme geçmişini tutar; kütüphane herkes için ortaktır.</Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.child} />
          <Text style={styles.loadingText}>Profiller yükleniyor...</Text>
        </View>
      ) : error ? (
        <EmptyState title="Backend bağlantısı kurulamadı" text={`API: ${API_BASE_URL}. Backend açık mı ve telefondan /api/health true dönüyor mu kontrol et.`} />
      ) : (
        <ScrollView contentContainerStyle={styles.profileGrid}>
          {profiles.map((profile) => {
            const meta = audienceMeta[profile.audience_type] || audienceMeta.child;
            return (
              <Pressable key={profile.id} onPress={() => selectProfile(profile)} style={({ pressed }) => [styles.profileCard, { borderColor: `${meta.color}55` }, pressed && styles.pressed]}>
                <Text style={styles.profileEmoji}>{profile.avatar_emoji || meta.emoji}</Text>
                <Text style={styles.profileName}>{profile.name}</Text>
                <Text style={[styles.profileType, { color: meta.color }]}>{meta.label} profili {profile.pin_enabled ? '· PIN' : ''}</Text>
                {profile.audience_type === 'child' && (
                  <Text style={styles.profileAge}>{profile.age_min || 0}-{profile.age_max || '+'} yaş</Text>
                )}
                <Pressable
                  onPress={(event) => { event.stopPropagation?.(); deleteProfile(profile); }}
                  style={styles.profileDeleteButton}
                  hitSlop={8}
                >
                  <Text style={styles.profileDeleteText}>Profili sil</Text>
                </Pressable>
              </Pressable>
            );
          })}
          <Pressable onPress={() => setCreateOpen(true)} style={styles.addProfileCard}>
            <Text style={styles.addProfileIcon}>＋</Text>
            <Text style={styles.addProfileText}>Yeni profil ekle</Text>
          </Pressable>
        </ScrollView>
      )}

      <Text style={styles.footerNote}>Local API: {API_BASE_URL}</Text>
      <PinModal
        visible={Boolean(pinProfile)}
        profile={pinProfile}
        onClose={() => setPinProfile(null)}
        onSuccess={(profile) => {
          setPinProfile(null);
          onSelect(profile);
        }}
      />
      <CreateProfileModal visible={createOpen} onClose={() => setCreateOpen(false)} onCreated={created} />
    </SafeAreaView>
  );
}

function CategoryPill({ label, active, onPress, color }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.categoryPill, active && { backgroundColor: color, borderColor: color }, pressed && styles.pressed]}
    >
      <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ContentCard({ item, onPress, accentColor, isFavorite, onToggleFavorite }) {
  const ageLabel = item.age_min || item.age_max ? `${item.age_min || 0}-${item.age_max || '+'} yaş` : 'Genel';

  return (
    <Pressable onPress={() => onPress(item)} style={({ pressed }) => [styles.contentCard, pressed && styles.pressed]}>
      <CoverBlock url={item.cover_image_url} accentColor={accentColor} />
      <View style={styles.contentInfo}>
        <View style={styles.metaRow}>
          <Text style={[styles.badge, { color: accentColor }]}>{audienceMeta[item.audience_type]?.emoji || '🎧'} {audienceMeta[item.audience_type]?.label || 'Genel'} · {item.category_name || 'Kategori yok'}</Text>
          <Pressable onPress={() => onToggleFavorite(item)} hitSlop={8} style={styles.favoriteButtonSmall}>
            <Text style={[styles.favoriteIcon, isFavorite && { color: accentColor }]}>{isFavorite ? '♥' : '♡'}</Text>
          </Pressable>
        </View>
        <Text style={styles.contentTitle}>{item.title}</Text>
        <Text style={styles.contentDesc}>{shortText(item.description || 'Açıklama henüz eklenmedi.', 115)}</Text>
        <View style={styles.cardFooterRow}>
          <Text style={styles.mutedSmall}>{item.episode_count || 0} bölüm</Text>
          <Text style={styles.mutedSmall}>{ageLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function HistoryRail({ items, accentColor, onOpenHistoryItem }) {
  if (!items.length) return null;

  return (
    <View style={styles.historyWrap}>
      <Text style={styles.sectionTitleSmall}>Kaldığın yerden devam et</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyList}>
        {items.slice(0, 8).map((item) => (
          <Pressable key={`${item.episode_id}-${item.updated_at}`} onPress={() => onOpenHistoryItem(item)} style={styles.historyCard}>
            <CoverBlock url={item.cover_image_url} accentColor={accentColor} />
            <Text style={styles.historyTitle} numberOfLines={2}>{item.content_title}</Text>
            <Text style={styles.historySub} numberOfLines={1}>{item.episode_no}. {item.episode_title}</Text>
            <Text style={styles.historyProgress}>{formatDuration(item.progress_seconds)} dinlendi</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}


function HistoryItemCard({ item, accentColor, onPress }) {
  return (
    <Pressable onPress={() => onPress({ id: item.content_id })} style={({ pressed }) => [styles.historyListCard, pressed && styles.pressed]}>
      <CoverBlock url={item.cover_image_url} accentColor={accentColor} />
      <View style={styles.historyListInfo}>
        <Text style={[styles.badge, { color: accentColor }]}>{audienceMeta[item.audience_type]?.emoji || '🎧'} {item.category_name || 'Kategori yok'}</Text>
        <Text style={styles.contentTitle}>{item.content_title}</Text>
        <Text style={styles.contentDesc}>{item.episode_no}. {item.episode_title}</Text>
        <View style={styles.cardFooterRow}>
          <Text style={styles.mutedSmall}>{formatDuration(item.progress_seconds)} dinlendi</Text>
          <Text style={styles.mutedSmall}>{formatDateTime(item.updated_at)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function StatCard({ label, value, active, color, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.summaryCard, active && { borderColor: color, backgroundColor: `${color}12` }]}> 
      <Text style={[styles.summaryNumber, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </Pressable>
  );
}

function HomeScreen({ profile, onChangeProfile, onOpenContent, favoriteIds, onToggleFavorite }) {
  const meta = audienceMeta[profile.audience_type] || audienceMeta.child;
  const [categories, setCategories] = useState([]);
  const [contents, setContents] = useState([]);
  const [favoriteContents, setFavoriteContents] = useState([]);
  const [history, setHistory] = useState([]);
  const [historySummary, setHistorySummary] = useState({ listened_books: 0, listened_episodes: 0, total_progress_seconds: 0 });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('library');
  const [searchText, setSearchText] = useState('');
  const [sortMode, setSortMode] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const [categoryData, contentData, favoriteData, historyData, summaryData] = await Promise.all([
      api.categories(),
      api.contents(),
      api.favorites(profile.id),
      api.history(profile.id),
      api.historySummary(profile.id).catch(() => null)
    ]);
    setCategories(categoryData || []);
    setContents(contentData || []);
    setFavoriteContents(favoriteData || []);
    setHistory(historyData || []);
    setHistorySummary(summaryData || { listened_books: 0, listened_episodes: 0, total_progress_seconds: 0 });
  }, [profile.id]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    load().catch((err) => alive && setError(err.message)).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } catch (err) { setError(err.message); } finally { setRefreshing(false); }
  }, [load]);

  const handleToggleFavorite = useCallback(async (item) => {
    await onToggleFavorite(item);
    await load().catch(() => null);
  }, [load, onToggleFavorite]);

  const getSearchBlob = useCallback((item) => [
    item.title,
    item.content_title,
    item.description,
    item.content_description,
    item.episode_title,
    item.category_name
  ].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR'), []);

  const sortItems = useCallback((items) => {
    const copy = [...(items || [])];
    if (sortMode === 'title') {
      return copy.sort((a, b) => String(a.title || a.content_title || '').localeCompare(String(b.title || b.content_title || ''), 'tr-TR'));
    }
    if (sortMode === 'episodes') {
      return copy.sort((a, b) => Number(b.episode_count || 0) - Number(a.episode_count || 0));
    }
    return copy.sort((a, b) => String(b.favorite_created_at || b.updated_at || b.created_at || '').localeCompare(String(a.favorite_created_at || a.updated_at || a.created_at || '')));
  }, [sortMode]);

  const applyFilters = useCallback((items) => {
    const needle = searchText.trim().toLocaleLowerCase('tr-TR');
    const filtered = (items || []).filter((item) => {
      const categoryOk = selectedCategory === 'all' || String(item.category_id) === String(selectedCategory);
      const audienceOk = audienceFilter === 'all' || String(item.audience_type) === String(audienceFilter);
      const searchOk = !needle || getSearchBlob(item).includes(needle);
      return categoryOk && audienceOk && searchOk;
    });
    return sortItems(filtered);
  }, [audienceFilter, getSearchBlob, searchText, selectedCategory, sortItems]);

  const filteredLibrary = useMemo(() => applyFilters(contents), [applyFilters, contents]);
  const filteredFavorites = useMemo(() => applyFilters(favoriteContents), [applyFilters, favoriteContents]);
  const filteredHistory = useMemo(() => applyFilters(history), [applyFilters, history]);

  const activeData = activeTab === 'favorites' ? filteredFavorites : activeTab === 'history' ? filteredHistory : filteredLibrary;
  const activeTitle = activeTab === 'favorites' ? 'Favori içerikler' : activeTab === 'history' ? 'Dinleme geçmişi' : 'Kütüphane içerikleri';
  const activeEmpty = activeTab === 'favorites'
    ? 'Henüz favori içeriğin yok. Kütüphaneden kalp simgesine basarak favori listeni oluşturabilirsin.'
    : activeTab === 'history'
      ? 'Bu profilde henüz dinleme kaydı yok. Bir bölüm oynatınca burada görünür.'
      : 'Admin panelden bir içeriği Kütüphaneye al deyince burada tüm profiller için görünür.';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.homeHeroCard}>
        <View style={styles.homeHeroTop}>
          <View style={styles.brandRow}>
            <BrandMark />
            <View>
              <Text style={styles.logoCompact}>Sesli Sahne</Text>
              <Text style={styles.overline}>{profile.name}</Text>
            </View>
          </View>
          <Pressable onPress={onChangeProfile} style={styles.switchButton}>
            <Text style={styles.switchButtonText}>Profil değiştir</Text>
          </Pressable>
        </View>
        <Text style={styles.homeHeroTitle}>{meta.emoji} Bugün ne dinleyelim?</Text>
        <Text style={styles.homeHeroText}>Kütüphane herkes için ortak; favoriler ve geçmiş yalnızca bu profile özel.</Text>
        <View style={styles.collectionGrid}>
          <Pressable onPress={() => { setActiveTab('library'); setSearchText('uyku'); }} style={[styles.collectionCard, { backgroundColor: '#FFF7ED' }]}>
            <Text style={styles.collectionIcon}>🌙</Text>
            <Text style={styles.collectionTitle}>Uyku</Text>
          </Pressable>
          <Pressable onPress={() => { setActiveTab('library'); setSearchText('masal'); }} style={[styles.collectionCard, { backgroundColor: '#FEF3C7' }]}>
            <Text style={styles.collectionIcon}>📖</Text>
            <Text style={styles.collectionTitle}>Masal</Text>
          </Pressable>
          <Pressable onPress={() => { setActiveTab('library'); setSearchText('tiyatro'); }} style={[styles.collectionCard, { backgroundColor: '#F3E8FF' }]}>
            <Text style={styles.collectionIcon}>🎭</Text>
            <Text style={styles.collectionTitle}>Tiyatro</Text>
          </Pressable>
          <Pressable onPress={() => { setActiveTab('library'); setSearchText('rahatlama'); }} style={[styles.collectionCard, { backgroundColor: '#ECFDF5' }]}>
            <Text style={styles.collectionIcon}>🍃</Text>
            <Text style={styles.collectionTitle}>Rahatlama</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <StatCard label="Kütüphane" value={contents.length} active={activeTab === 'library'} color={meta.color} onPress={() => setActiveTab('library')} />
        <StatCard label="Favori" value={favoriteContents.length} active={activeTab === 'favorites'} color={meta.color} onPress={() => setActiveTab('favorites')} />
        <StatCard label="Kitap" value={historySummary.listened_books || 0} active={activeTab === 'history'} color={meta.color} onPress={() => setActiveTab('history')} />
      </View>
      <View style={styles.historyStatsStrip}>
        <Text style={styles.historyStatsText}>Bu profil: {historySummary.listened_episodes || 0} bölüm · {formatDurationLong(historySummary.total_progress_seconds || 0)} dinleme</Text>
      </View>

      <View style={styles.tabBar}>
        <Pressable onPress={() => setActiveTab('library')} style={[styles.tabButton, activeTab === 'library' && { backgroundColor: meta.color, borderColor: meta.color }]}>
          <Text style={[styles.tabText, activeTab === 'library' && styles.tabTextActive]}>Kütüphane</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab('favorites')} style={[styles.tabButton, activeTab === 'favorites' && { backgroundColor: meta.color, borderColor: meta.color }]}>
          <Text style={[styles.tabText, activeTab === 'favorites' && styles.tabTextActive]}>Favoriler</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab('history')} style={[styles.tabButton, activeTab === 'history' && { backgroundColor: meta.color, borderColor: meta.color }]}>
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Geçmiş</Text>
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder={activeTab === 'history' ? 'Geçmişte kitap veya bölüm ara' : 'Kitap, kategori veya açıklama ara'}
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
        {searchText ? (
          <Pressable onPress={() => setSearchText('')} style={styles.clearSearchButton}>
            <Text style={styles.clearSearchText}>Temizle</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
        <CategoryPill label="Yeni" active={sortMode === 'newest'} onPress={() => setSortMode('newest')} color={meta.color} />
        <CategoryPill label="A-Z" active={sortMode === 'title'} onPress={() => setSortMode('title')} color={meta.color} />
        {activeTab !== 'history' && <CategoryPill label="Çok bölümlü" active={sortMode === 'episodes'} onPress={() => setSortMode('episodes')} color={meta.color} />}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
        <CategoryPill label="Tüm türler" active={audienceFilter === 'all'} onPress={() => setAudienceFilter('all')} color={meta.color} />
        {Object.entries(audienceMeta).map(([key, item]) => (
          <CategoryPill key={key} label={`${item.emoji} ${item.label}`} active={audienceFilter === key} onPress={() => setAudienceFilter(key)} color={item.color} />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
        <CategoryPill label="Tüm kategoriler" active={selectedCategory === 'all'} onPress={() => setSelectedCategory('all')} color={meta.color} />
        {categories.map((category) => (
          <CategoryPill key={category.id} label={category.name} active={String(selectedCategory) === String(category.id)} onPress={() => setSelectedCategory(category.id)} color={meta.color} />
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={meta.color} />
          <Text style={styles.loadingText}>İçerikler yükleniyor...</Text>
        </View>
      ) : error ? (
        <EmptyState title="Backend bağlantısı kurulamadı" text={'Backend çalışıyor mu kontrol et. Mobil API adresi: ' + API_BASE_URL} />
      ) : (
        <FlatList
          data={activeData}
          keyExtractor={(item) => activeTab === 'history' ? `history-${item.episode_id}-${item.updated_at}` : `${activeTab}-${item.id}`}
          renderItem={({ item }) => activeTab === 'history' ? (
            <HistoryItemCard item={item} accentColor={audienceMeta[item.audience_type]?.color || meta.color} onPress={onOpenContent} />
          ) : (
            <ContentCard item={item} accentColor={audienceMeta[item.audience_type]?.color || meta.color} onPress={onOpenContent} isFavorite={favoriteIds.has(Number(item.id))} onToggleFavorite={handleToggleFavorite} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={(
            <View>
              {activeTab === 'library' && <HistoryRail items={history} accentColor={meta.color} onOpenHistoryItem={(item) => onOpenContent({ id: item.content_id })} />}
              <View style={styles.listHeaderRow}>
                <Text style={styles.sectionTitleSmall}>{activeTitle}</Text>
                <Text style={styles.listCount}>{activeData.length} kayıt</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<EmptyState title={activeTab === 'favorites' ? 'Favori listen boş' : activeTab === 'history' ? 'Geçmiş boş' : 'Kütüphane boş'} text={activeEmpty} />}
        />
      )}
    </SafeAreaView>
  );
}

function EpisodeRow({ episode, accentColor, active, playing, progress, onPress }) {
  const hasAudio = Boolean(episode.audio_url);
  const savedSeconds = Number(progress?.progress_seconds || 0);
  const percent = episode.duration_seconds ? Math.min(100, Math.round((savedSeconds / Number(episode.duration_seconds || 1)) * 100)) : 0;
  return (
    <Pressable onPress={() => onPress(episode)} style={({ pressed }) => [styles.episodeRow, active && { borderColor: accentColor }, pressed && styles.pressed]}>
      <View style={[styles.episodeNumber, { backgroundColor: `${accentColor}16` }]}>
        <Text style={[styles.episodeNumberText, { color: accentColor }]}>{episode.episode_no}</Text>
      </View>
      <View style={styles.episodeInfo}>
        <Text style={styles.episodeTitle}>{episode.title}</Text>
        <Text style={styles.episodeMeta}>{hasAudio ? formatDuration(episode.duration_seconds) : 'Ses henüz oluşturulmadı'}{savedSeconds > 0 ? ` · ${formatDuration(savedSeconds)} dinlendi` : ''}</Text>
        {savedSeconds > 0 && <View style={styles.episodeMiniProgress}><View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: accentColor }]} /></View>}
      </View>
      <Text style={[styles.playIcon, { color: hasAudio ? accentColor : colors.border }]}>{active && playing ? '❚❚' : '▶'}</Text>
    </Pressable>
  );
}

function MiniPlayer({ episode, status, accentColor, playbackRate, onRateChange, onToggle, onStop, onSeekBack, onSeekForward, onNext, onOpenFull }) {
  if (!episode) return null;
  const position = Math.floor((status.positionMillis || 0) / 1000);
  const duration = status.durationMillis ? Math.floor(status.durationMillis / 1000) : Math.floor(Number(episode.duration_seconds || 0));
  const progress = duration > 0 ? Math.min(100, Math.max(0, (position / duration) * 100)) : 0;
  const speedOptions = [0.8, 1, 1.25, 1.5];

  return (
    <View style={styles.miniPlayer}>
      <View style={styles.miniInfo}>
        <Text style={styles.miniLabel}>Şimdi çalıyor</Text>
        <Text style={styles.miniTitle} numberOfLines={1}>{episode.title}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: accentColor }]} />
        </View>
        <View style={styles.playerMetaRow}>
          <Text style={styles.miniTime}>{formatDuration(position)} / {formatDuration(duration)}</Text>
          <Text style={styles.miniTime}>{Number(playbackRate || 1).toFixed(playbackRate === 1 ? 0 : 2)}x</Text>
        </View>
      </View>
      <View style={styles.playerControls}>
        <Pressable onPress={onSeekBack} style={styles.iconPlayerButton}><Text style={styles.iconPlayerText}>-10 sn</Text></Pressable>
        <Pressable onPress={onToggle} style={[styles.playerButton, { backgroundColor: accentColor }]}>
          <Text style={styles.playerButtonText}>{status.isPlaying ? 'Duraklat' : 'Oynat'}</Text>
        </Pressable>
        <Pressable onPress={onSeekForward} style={styles.iconPlayerButton}><Text style={styles.iconPlayerText}>+10 sn</Text></Pressable>
        <Pressable onPress={onNext} style={styles.iconPlayerButton}><Text style={styles.iconPlayerText}>Sonraki</Text></Pressable>
        <Pressable onPress={onOpenFull} style={[styles.iconPlayerButton, { borderColor: accentColor }]}><Text style={[styles.iconPlayerText, { color: accentColor }]}>Tam ekran</Text></Pressable>
        <Pressable onPress={onStop} style={styles.stopButton}><Text style={styles.stopButtonText}>Kapat</Text></Pressable>
      </View>
      <View style={styles.speedRow}>
        {speedOptions.map((rate) => {
          const active = Math.abs(Number(playbackRate || 1) - rate) < 0.01;
          return (
            <Pressable key={rate} onPress={() => onRateChange(rate)} style={[styles.speedPill, active && { backgroundColor: accentColor, borderColor: accentColor }]}>
              <Text style={[styles.speedText, active && styles.speedTextActive]}>{rate}x</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}


function FullPlayerModal({
  visible,
  onClose,
  content,
  episode,
  status,
  accentColor,
  playbackRate,
  onRateChange,
  onToggle,
  onStop,
  onSeekBack,
  onSeekForward,
  onNext,
  sleepTimerMinutes,
  onSleepTimerChange,
  autoNextEnabled,
  onToggleAutoNext
}) {
  if (!episode) return null;
  const position = Math.floor((status.positionMillis || 0) / 1000);
  const duration = status.durationMillis ? Math.floor(status.durationMillis / 1000) : Math.floor(Number(episode.duration_seconds || 0));
  const progress = duration > 0 ? Math.min(100, Math.max(0, (position / duration) * 100)) : 0;
  const speedOptions = [0.8, 1, 1.25, 1.5];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.fullPlayerSafeArea}>
        <StatusBar style="dark" />
        <View style={styles.fullPlayerTopBar}>
          <Pressable onPress={onClose} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹ Küçült</Text>
          </Pressable>
          <Pressable onPress={onStop} style={styles.stopButton}>
            <Text style={styles.stopButtonText}>Kapat</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.fullPlayerContent}>
          <CoverBlock url={content.cover_image_url} accentColor={accentColor} size="large" />
          <Text style={[styles.detailBadge, { color: accentColor }]}>{content.category_name || 'Kategori yok'}</Text>
          <Text style={styles.fullPlayerTitle}>{content.title}</Text>
          <Text style={styles.fullPlayerEpisode}>{episode.episode_no}. {episode.title}</Text>

          <View style={styles.fullProgressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: accentColor }]} />
          </View>
          <View style={styles.fullPlayerTimeRow}>
            <Text style={styles.fullPlayerTime}>{formatDuration(position)}</Text>
            <Text style={styles.fullPlayerTime}>{formatDuration(duration)}</Text>
          </View>

          <View style={styles.fullMainControls}>
            <Pressable onPress={onSeekBack} style={styles.fullCircleButton}>
              <Text style={styles.fullCircleText}>-10</Text>
            </Pressable>
            <Pressable onPress={onToggle} style={[styles.fullPlayButton, { backgroundColor: accentColor }]}>
              <Text style={styles.fullPlayText}>{status.isPlaying ? 'Duraklat' : 'Oynat'}</Text>
            </Pressable>
            <Pressable onPress={onSeekForward} style={styles.fullCircleButton}>
              <Text style={styles.fullCircleText}>+10</Text>
            </Pressable>
          </View>

          <Pressable onPress={onNext} style={styles.fullNextButton}>
            <Text style={[styles.fullNextText, { color: accentColor }]}>Sonraki bölüme geç</Text>
          </Pressable>

          <View style={styles.fullSectionBox}>
            <Text style={styles.sectionTitleSmall}>Oynatma hızı</Text>
            <View style={styles.speedRow}>
              {speedOptions.map((rate) => {
                const active = Math.abs(Number(playbackRate || 1) - rate) < 0.01;
                return (
                  <Pressable key={rate} onPress={() => onRateChange(rate)} style={[styles.speedPill, active && { backgroundColor: accentColor, borderColor: accentColor }]}>
                    <Text style={[styles.speedText, active && styles.speedTextActive]}>{rate}x</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.fullSectionBox}>
            <PlaybackOptionRow autoNextEnabled={autoNextEnabled} onToggleAutoNext={onToggleAutoNext} accentColor={accentColor} />
          </View>

          <View style={styles.fullSectionBox}>
            <SleepTimer value={sleepTimerMinutes} onChange={onSleepTimerChange} accentColor={accentColor} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function PlaybackOptionRow({ autoNextEnabled, onToggleAutoNext, accentColor }) {
  return (
    <View style={styles.playbackOptionBox}>
      <View style={styles.playbackOptionTextWrap}>
        <Text style={styles.sectionTitleSmall}>Oynatma seçenekleri</Text>
        <Text style={styles.contentDesc}>Bölüm bitince otomatik olarak sıradaki sesli bölüme geçebilir.</Text>
      </View>
      <Pressable onPress={onToggleAutoNext} style={[styles.togglePill, autoNextEnabled && { backgroundColor: accentColor, borderColor: accentColor }]}> 
        <Text style={[styles.toggleText, autoNextEnabled && styles.toggleTextActive]}>{autoNextEnabled ? 'Otomatik açık' : 'Otomatik kapalı'}</Text>
      </Pressable>
    </View>
  );
}

function SleepTimer({ value, onChange, accentColor }) {
  const options = [0, 5, 10, 15, 30];
  return (
    <View style={styles.timerWrap}>
      <Text style={styles.sectionTitle}>Uyku zamanlayıcı</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timerList}>
        {options.map((minutes) => {
          const label = minutes === 0 ? 'Kapalı' : `${minutes} dk`;
          const active = value === minutes;
          return (
            <Pressable key={minutes} onPress={() => onChange(minutes)} style={[styles.timerPill, active && { backgroundColor: accentColor, borderColor: accentColor }]}>
              <Text style={[styles.timerText, active && styles.timerTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ContentDetailScreen({ profile, content, favoriteIds, onToggleFavorite, onBack }) {
  const meta = audienceMeta[profile.audience_type] || audienceMeta.child;
  const soundRef = useRef(null);
  const sleepTimerRef = useRef(null);
  const currentEpisodeRef = useRef(null);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [playbackStatus, setPlaybackStatus] = useState({});
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [autoNextEnabled, setAutoNextEnabled] = useState(true);
  const [playerFullOpen, setPlayerFullOpen] = useState(false);
  const [contentHistory, setContentHistory] = useState(null);

  const loadContentHistory = useCallback(async () => {
    try {
      const data = await api.contentHistory(content.id, profile.id);
      setContentHistory(data);
    } catch (_) {
      setContentHistory(null);
    }
  }, [content.id, profile.id]);

  useEffect(() => { loadContentHistory(); }, [loadContentHistory]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false
    }).catch(() => null);
  }, []);

  const progressByEpisode = useMemo(() => {
    const map = new Map();
    for (const item of contentHistory?.episodes || []) map.set(Number(item.episode_id), item);
    return map;
  }, [contentHistory]);

  const progressPercent = contentHistory?.progress_percent || 0;
  const episodes = content.episodes || [];
  const continueEpisode = useMemo(() => {
    const rows = contentHistory?.episodes || [];
    return rows.find((row) => Number(row.progress_seconds || 0) > 0 && Number(row.completed || 0) !== 1) || rows.find((row) => Number(row.progress_seconds || 0) > 0) || null;
  }, [contentHistory]);

  const clearSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = null;
  }, []);

  const saveListeningProgress = useCallback(async (episode, status, completed = false) => {
    if (!episode || !status?.isLoaded) return;
    const progressSeconds = Math.floor((status.positionMillis || 0) / 1000);
    try {
      await api.saveHistory(episode.id, { progress_seconds: progressSeconds, completed }, profile.id);
    } catch (_) {}
  }, [profile.id]);

  const stopAudio = useCallback(async () => {
    clearSleepTimer();
    if (soundRef.current) {
      const status = await soundRef.current.getStatusAsync().catch(() => null);
      if (status?.isLoaded) await saveListeningProgress(currentEpisodeRef.current, status, false);
      await soundRef.current.unloadAsync().catch(() => null);
    }
    soundRef.current = null;
    currentEpisodeRef.current = null;
    setCurrentEpisode(null);
    setPlaybackStatus({});
    setSleepTimerMinutes(0);
    setPlayerFullOpen(false);
  }, [clearSleepTimer, saveListeningProgress]);

  useEffect(() => () => { stopAudio(); }, [stopAudio]);

  const scheduleSleepTimer = useCallback((minutes) => {
    clearSleepTimer();
    setSleepTimerMinutes(minutes);
    if (!minutes) return;
    sleepTimerRef.current = setTimeout(() => {
      stopAudio();
      Alert.alert('Uyku zamanlayıcı', 'Ses otomatik kapatıldı.');
    }, minutes * 60 * 1000);
  }, [clearSleepTimer, stopAudio]);

  const playEpisode = useCallback(async (episode, options = {}) => {
    if (!episode.audio_url) {
      Alert.alert('Ses yok', 'Bu bölüm için henüz ses dosyası oluşturulmamış. Admin panelden Ses oluştur butonunu kullanabilirsin.');
      return;
    }

    if (currentEpisode?.id === episode.id && soundRef.current) {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await soundRef.current.pauseAsync();
        await saveListeningProgress(episode, status, false);
      } else if (status.isLoaded) {
        await soundRef.current.playAsync();
      }
      return;
    }

    try {
      await stopAudio();
      const source = { uri: mediaUrl(episode.audio_url) };
      const initialPositionMillis = Math.max(0, Number(options.startAtSeconds || 0)) * 1000;
      const { sound } = await Audio.Sound.createAsync(source, {
        shouldPlay: true,
        positionMillis: initialPositionMillis,
        rate: playbackRate,
        shouldCorrectPitch: true
      }, async (status) => {
        setPlaybackStatus(status || {});
        if (status?.isLoaded && status.didJustFinish) {
          await api.saveHistory(episode.id, {
            progress_seconds: Math.floor((status.durationMillis || 0) / 1000),
            completed: true
          }, profile.id).catch(() => null);
          loadContentHistory().catch(() => null);

          if (autoNextEnabled) {
            const list = episodes || [];
            const index = list.findIndex((row) => Number(row.id) === Number(episode.id));
            const next = list.slice(index + 1).find((row) => row.audio_url);
            if (next) setTimeout(() => playEpisode(next, { startAtSeconds: 0 }), 450);
          }
        }
      });
      soundRef.current = sound;
      currentEpisodeRef.current = episode;
      setCurrentEpisode(episode);
    } catch (err) {
      Alert.alert('Ses oynatılamadı', err.message || 'Bilinmeyen bir hata oluştu.');
    }
  }, [autoNextEnabled, currentEpisode, episodes, loadContentHistory, playbackRate, profile.id, saveListeningProgress, stopAudio]);

  const togglePlayer = useCallback(async () => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;
    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
      await saveListeningProgress(currentEpisodeRef.current, status, false);
    } else {
      await soundRef.current.playAsync();
    }
  }, [saveListeningProgress]);

  const seekBy = useCallback(async (seconds) => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;
    const duration = status.durationMillis || 0;
    const nextPosition = Math.max(0, Math.min(duration, (status.positionMillis || 0) + seconds * 1000));
    await soundRef.current.setPositionAsync(nextPosition);
    const nextStatus = await soundRef.current.getStatusAsync().catch(() => null);
    if (nextStatus?.isLoaded) setPlaybackStatus(nextStatus);
  }, []);

  const changePlaybackRate = useCallback(async (rate) => {
    setPlaybackRate(rate);
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync().catch(() => null);
    if (status?.isLoaded) {
      await soundRef.current.setRateAsync(rate, true).catch(() => null);
      const nextStatus = await soundRef.current.getStatusAsync().catch(() => null);
      if (nextStatus?.isLoaded) setPlaybackStatus(nextStatus);
    }
  }, []);

  const playNextEpisode = useCallback(async () => {
    const list = content.episodes || [];
    const currentId = currentEpisodeRef.current?.id || currentEpisode?.id;
    const index = list.findIndex((episode) => episode.id === currentId);
    const next = list.slice(index + 1).find((episode) => episode.audio_url);
    if (!next) {
      Alert.alert('Sonraki bölüm yok', 'Ses dosyası olan başka bölüm bulunamadı.');
      return;
    }
    await playEpisode(next);
  }, [content.episodes, currentEpisode, playEpisode]);

  const ageLabel = content.age_min || content.age_max ? `${content.age_min || 0}-${content.age_max || '+'} yaş` : 'Genel yaş';
  const isFavorite = favoriteIds.has(Number(content.id));

  const handleContinue = useCallback(() => {
    if (!continueEpisode) return;
    const target = episodes.find((episode) => Number(episode.id) === Number(continueEpisode.episode_id));
    if (target) playEpisode(target, { startAtSeconds: continueEpisode.progress_seconds || 0 });
  }, [continueEpisode, episodes, playEpisode]);

  const handleStartOver = useCallback(() => {
    const first = episodes.find((episode) => episode.audio_url) || episodes[0];
    if (first) playEpisode(first, { startAtSeconds: 0 });
  }, [episodes, playEpisode]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.detailTopBar}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Geri</Text>
        </Pressable>
        <Pressable onPress={() => onToggleFavorite(content)} style={[styles.favoriteButton, { borderColor: meta.color }]}> 
          <Text style={[styles.favoriteButtonText, { color: meta.color }]}>{isFavorite ? '♥ Favori' : '♡ Favori'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.detailContent}>
        <View style={[styles.detailHero, { borderColor: `${meta.color}55` }]}> 
          <CoverBlock url={content.cover_image_url} accentColor={meta.color} size="large" />
          <Text style={[styles.detailBadge, { color: meta.color }]}>{content.category_name || 'Kategori yok'} · {ageLabel}</Text>
          <Text style={styles.detailTitle}>{content.title}</Text>
          <Text style={styles.detailDesc}>{content.description || 'Bu içerik için açıklama henüz eklenmedi.'}</Text>
        </View>

        <View style={styles.progressPanel}>
          <View style={styles.progressPanelHeader}>
            <Text style={styles.sectionTitleSmall}>Kitap ilerlemesi</Text>
            <Text style={[styles.progressPercentText, { color: meta.color }]}>{progressPercent}%</Text>
          </View>
          <View style={styles.progressTrackLarge}>
            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: meta.color }]} />
          </View>
          <Text style={styles.contentDesc}>{contentHistory ? `${formatDurationLong(contentHistory.total_progress_seconds || 0)} dinlendi · ${contentHistory.completed_episodes || 0}/${episodes.length} bölüm tamamlandı` : 'Bu kitap için ilerleme kaydı henüz yok.'}</Text>
          <View style={styles.detailActionRow}>
            <Pressable onPress={handleContinue} disabled={!continueEpisode} style={[styles.primaryActionPill, { backgroundColor: continueEpisode ? meta.color : colors.border }]}>
              <Text style={styles.primaryActionText}>{continueEpisode ? 'Kaldığın yerden devam et' : 'Devam kaydı yok'}</Text>
            </Pressable>
            <Pressable onPress={handleStartOver} style={styles.secondaryActionPill}>
              <Text style={styles.secondaryActionText}>Baştan başla</Text>
            </Pressable>
          </View>
        </View>

        <SleepTimer value={sleepTimerMinutes} onChange={scheduleSleepTimer} accentColor={meta.color} />
        <PlaybackOptionRow autoNextEnabled={autoNextEnabled} onToggleAutoNext={() => setAutoNextEnabled((value) => !value)} accentColor={meta.color} />

        <Text style={styles.sectionTitle}>Bölümler</Text>
        {episodes.length === 0 ? (
          <EmptyState title="Bölüm yok" text="Bu içerik için henüz bölüm eklenmemiş." />
        ) : (
          episodes.map((episode) => (
            <EpisodeRow key={episode.id} episode={episode} accentColor={meta.color} active={currentEpisode?.id === episode.id} playing={Boolean(playbackStatus.isPlaying)} progress={progressByEpisode.get(Number(episode.id))} onPress={playEpisode} />
          ))
        )}
      </ScrollView>

      <FullPlayerModal
        visible={playerFullOpen}
        onClose={() => setPlayerFullOpen(false)}
        content={content}
        episode={currentEpisode}
        status={playbackStatus}
        accentColor={meta.color}
        playbackRate={playbackRate}
        onRateChange={changePlaybackRate}
        onToggle={togglePlayer}
        onStop={stopAudio}
        onSeekBack={() => seekBy(-10)}
        onSeekForward={() => seekBy(10)}
        onNext={playNextEpisode}
        sleepTimerMinutes={sleepTimerMinutes}
        onSleepTimerChange={scheduleSleepTimer}
        autoNextEnabled={autoNextEnabled}
        onToggleAutoNext={() => setAutoNextEnabled((value) => !value)}
      />
      <MiniPlayer episode={currentEpisode} status={playbackStatus} accentColor={meta.color} playbackRate={playbackRate} onRateChange={changePlaybackRate} onToggle={togglePlayer} onStop={stopAudio} onSeekBack={() => seekBy(-10)} onSeekForward={() => seekBy(10)} onNext={playNextEpisode} onOpenFull={() => setPlayerFullOpen(true)} />
    </SafeAreaView>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loadingContent, setLoadingContent] = useState(false);

  const loadFavoriteIds = useCallback(async () => {
    if (!profile) return setFavoriteIds(new Set());
    try {
      const favoriteData = await api.favorites(profile.id);
      setFavoriteIds(new Set((favoriteData || []).map((item) => Number(item.content_id))));
    } catch (_) {
      setFavoriteIds(new Set());
    }
  }, [profile]);

  useEffect(() => { loadFavoriteIds(); }, [loadFavoriteIds]);

  const toggleFavorite = useCallback(async (content) => {
    if (!profile) return;
    try {
      if (favoriteIds.has(Number(content.id))) await api.removeFavorite(content.id, profile.id);
      else await api.addFavorite(content.id, profile.id);
      await loadFavoriteIds();
    } catch (err) {
      Alert.alert('Favori güncellenemedi', err.message || 'Bilinmeyen hata.');
    }
  }, [favoriteIds, loadFavoriteIds, profile]);

  const openContent = useCallback(async (content) => {
    setLoadingContent(true);
    try {
      const detail = await api.content(content.id);
      setSelectedContent(detail);
    } catch (err) {
      Alert.alert('İçerik açılamadı', err.message || 'Bilinmeyen hata.');
    } finally {
      setLoadingContent(false);
    }
  }, []);

  const handleAuthenticated = useCallback((user, token) => {
    api.setAuthToken(token);
    setCurrentUser(user);
    setProfile(null);
    setSelectedContent(null);
    setFavoriteIds(new Set());
  }, []);

  const logout = useCallback(async () => {
    try { await api.logoutUser(); } catch (_) {}
    api.setAuthToken('');
    setCurrentUser(null);
    setProfile(null);
    setSelectedContent(null);
    setFavoriteIds(new Set());
  }, []);

  return (
    <SafeAreaProvider>
      <View style={styles.appRoot}>
        {!currentUser ? (
          <AuthScreen onAuthenticated={handleAuthenticated} />
        ) : !profile ? (
          <ProfileSelectionScreen user={currentUser} onLogout={logout} onSelect={(item) => { setSelectedContent(null); setProfile(item); }} />
        ) : selectedContent ? (
          <ContentDetailScreen profile={profile} content={selectedContent} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} onBack={() => setSelectedContent(null)} />
        ) : (
          <HomeScreen profile={profile} onChangeProfile={() => { setSelectedContent(null); setProfile(null); }} onOpenContent={openContent} favoriteIds={favoriteIds} onToggleFavorite={toggleFavorite} />
        )}

        {loadingContent && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={profile ? audienceMeta[profile.audience_type]?.color : colors.ink} />
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appRoot: { flex: 1, backgroundColor: colors.cream },
  safeArea: { flex: 1, backgroundColor: colors.cream },
  hero: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 18 },
  authWrap: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 34, gap: 14 },
  authCard: { marginTop: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 26, padding: 18 },
  authUserRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  logo: { fontSize: 18, fontWeight: '800', color: colors.ink, letterSpacing: 0.3, marginBottom: 18 },
  heroTitle: { fontSize: 34, lineHeight: 40, fontWeight: '900', color: colors.ink, marginBottom: 12 },
  heroText: { fontSize: 16, lineHeight: 24, color: colors.muted },
  profileGrid: { paddingHorizontal: 18, paddingBottom: 24, gap: 14 },
  profileCard: { backgroundColor: colors.white, borderWidth: 1, borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  profileEmoji: { fontSize: 38, marginBottom: 10 },
  profileName: { fontSize: 22, fontWeight: '900', color: colors.ink, marginBottom: 4 },
  profileType: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  profileAge: { fontSize: 13, color: colors.muted },
  profileDeleteButton: { marginTop: 12, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  profileDeleteText: { color: '#B91C1C', fontSize: 12, fontWeight: '900' },
  addProfileCard: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 24, padding: 22, alignItems: 'center', backgroundColor: '#FAFAFA' },
  addProfileIcon: { fontSize: 30, color: colors.muted, marginBottom: 6 },
  addProfileText: { fontSize: 15, fontWeight: '800', color: colors.muted },
  footerNote: { paddingHorizontal: 22, paddingBottom: 14, fontSize: 11, color: colors.muted },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  modalShade: { flex: 1, backgroundColor: 'rgba(17,24,39,0.45)', justifyContent: 'center', padding: 18 },
  modalCard: { backgroundColor: colors.white, borderRadius: 26, padding: 22, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 20, elevation: 5 },
  modalEmoji: { fontSize: 38, textAlign: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 23, fontWeight: '900', color: colors.ink, textAlign: 'center', marginBottom: 8 },
  modalText: { fontSize: 14, color: colors.muted, lineHeight: 21, textAlign: 'center', marginBottom: 16 },
  pinInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, fontSize: 22, textAlign: 'center', letterSpacing: 8, color: colors.ink, marginBottom: 16 },
  textInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.ink, marginBottom: 12, backgroundColor: '#fff' },
  rowGap: { flexDirection: 'row', gap: 10 },
  halfInput: { flex: 1 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  primaryButton: { flex: 1, borderRadius: 14, paddingVertical: 13, backgroundColor: colors.ink, alignItems: 'center' },
  primaryButtonWide: { borderRadius: 14, paddingVertical: 14, backgroundColor: colors.ink, alignItems: 'center', marginTop: 4, marginBottom: 10 },
  primaryButtonText: { color: colors.white, fontWeight: '900' },
  secondaryButton: { flex: 1, borderRadius: 14, paddingVertical: 13, backgroundColor: colors.faint, alignItems: 'center' },
  secondaryButtonWide: { borderRadius: 14, paddingVertical: 14, backgroundColor: colors.faint, alignItems: 'center', marginBottom: 8 },
  secondaryButtonText: { color: colors.ink, fontWeight: '900' },
  disabledButton: { opacity: 0.6 },
  segmentRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  segmentButton: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 10, alignItems: 'center' },
  segmentText: { fontSize: 12, fontWeight: '800', color: colors.muted },
  segmentTextActive: { color: colors.white },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  checkBox: { fontSize: 20, color: colors.ink },
  checkText: { fontSize: 14, fontWeight: '700', color: colors.ink },
  topBar: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  overline: { fontSize: 12, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  screenTitle: { fontSize: 28, fontWeight: '900', color: colors.ink, marginTop: 3 },
  screenSubtitle: { paddingHorizontal: 20, color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 14 },
  summaryGrid: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, marginBottom: 10 },
  summaryCard: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingVertical: 12, alignItems: 'center' },
  summaryNumber: { fontSize: 22, fontWeight: '900', marginBottom: 2 },
  summaryLabel: { fontSize: 10, lineHeight: 13, color: colors.muted, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.2, textAlign: 'center' },
  historyStatsStrip: { marginHorizontal: 18, marginBottom: 12, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10 },
  historyStatsText: { fontSize: 13, color: colors.muted, fontWeight: '800', textAlign: 'center' },
  tabBar: { flexDirection: 'row', gap: 7, paddingHorizontal: 14, marginBottom: 10 },
  tabButton: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 11, alignItems: 'center', backgroundColor: colors.white },
  tabText: { fontSize: 12, lineHeight: 16, fontWeight: '900', color: colors.muted, textAlign: 'center' },
  tabTextActive: { color: colors.white },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  listCount: { fontSize: 12, fontWeight: '900', color: colors.muted },
  switchButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.white },
  switchButtonText: { fontSize: 12, fontWeight: '800', color: colors.ink },
  searchBox: { marginHorizontal: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  searchInput: { flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 7 },
  clearSearchButton: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.faint },
  clearSearchText: { fontSize: 12, color: colors.ink, fontWeight: '900' },
  categoryList: { paddingHorizontal: 14, gap: 8, paddingBottom: 12 },
  categoryPill: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.white },
  categoryText: { fontSize: 13, fontWeight: '800', color: colors.muted },
  categoryTextActive: { color: colors.white },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: colors.muted, fontSize: 14 },
  listContent: { paddingHorizontal: 14, paddingBottom: 132, gap: 12 },
  contentCard: { flexDirection: 'row', gap: 12, backgroundColor: colors.white, borderRadius: 22, padding: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'flex-start' },
  coverPlaceholder: { width: 68, height: 82, borderRadius: 17, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  coverLarge: { width: '100%', height: 210, borderRadius: 24, marginBottom: 18 },
  coverImage: { width: '100%', height: '100%' },
  coverText: { fontSize: 32, fontWeight: '900' },
  contentInfo: { flex: 1 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, gap: 8 },
  badge: { fontSize: 11, lineHeight: 15, fontWeight: '900', flexShrink: 1 },
  favoriteButtonSmall: { paddingHorizontal: 6, paddingVertical: 2, flexShrink: 0 },
  favoriteIcon: { fontSize: 24, color: colors.border, fontWeight: '900' },
  contentTitle: { fontSize: 16, lineHeight: 21, fontWeight: '900', color: colors.ink, marginBottom: 5 },
  contentDesc: { fontSize: 13, color: colors.muted, lineHeight: 19, marginBottom: 8 },
  cardFooterRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  mutedSmall: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  emptyState: { padding: 28, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: colors.ink, marginBottom: 6, textAlign: 'center' },
  emptyText: { fontSize: 14, color: colors.muted, lineHeight: 21, textAlign: 'center' },
  historyWrap: { marginBottom: 16 },
  sectionTitleSmall: { fontSize: 16, fontWeight: '900', color: colors.ink, marginBottom: 10 },
  historyList: { gap: 10, paddingRight: 20 },
  historyCard: { width: 130, backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 10 },
  historyListCard: { flexDirection: 'row', gap: 14, backgroundColor: colors.white, borderRadius: 24, padding: 14, borderWidth: 1, borderColor: colors.border },
  historyListInfo: { flex: 1 },
  historyTitle: { fontSize: 13, fontWeight: '900', color: colors.ink, marginTop: 8 },
  historySub: { fontSize: 12, color: colors.muted, marginTop: 3 },
  historyProgress: { fontSize: 11, color: colors.muted, fontWeight: '800', marginTop: 6 },
  detailTopBar: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { paddingHorizontal: 12, paddingVertical: 9 },
  backButtonText: { fontSize: 16, fontWeight: '900', color: colors.ink },
  favoriteButton: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.white },
  favoriteButtonText: { fontSize: 13, fontWeight: '900' },
  detailContent: { paddingHorizontal: 14, paddingBottom: 150 },
  detailHero: { backgroundColor: colors.white, borderWidth: 1, borderRadius: 28, padding: 16, marginBottom: 18 },
  detailBadge: { fontSize: 13, fontWeight: '900', marginBottom: 6 },
  detailTitle: { fontSize: 24, lineHeight: 30, fontWeight: '900', color: colors.ink, marginBottom: 10 },
  detailDesc: { fontSize: 15, lineHeight: 23, color: colors.muted },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: colors.ink, marginTop: 4, marginBottom: 12 },
  episodeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 13, marginBottom: 10 },
  episodeNumber: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  episodeNumberText: { fontWeight: '900', fontSize: 16 },
  episodeInfo: { flex: 1 },
  episodeTitle: { fontSize: 15, fontWeight: '900', color: colors.ink },
  episodeMeta: { fontSize: 12, color: colors.muted, marginTop: 4 },
  playIcon: { fontSize: 20, fontWeight: '900' },
  timerWrap: { marginBottom: 12 },
  timerList: { gap: 8, paddingBottom: 6 },
  timerPill: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: colors.white },
  timerText: { fontSize: 13, fontWeight: '800', color: colors.muted },
  timerTextActive: { color: colors.white },
  miniPlayer: { position: 'absolute', left: 10, right: 10, bottom: 10, backgroundColor: colors.white, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 10, gap: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, elevation: 5 },
  miniInfo: { flex: 1 },
  miniTitle: { fontSize: 14, fontWeight: '900', color: colors.ink },
  miniTime: { fontSize: 12, color: colors.muted, marginTop: 2 },
  progressTrack: { height: 5, borderRadius: 999, backgroundColor: colors.faint, overflow: 'hidden', marginTop: 7 },
  progressFill: { height: '100%', borderRadius: 999 },
  playerControls: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  playerButton: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  iconPlayerButton: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: colors.faint },
  iconPlayerText: { color: colors.ink, fontWeight: '900', fontSize: 11 },
  playerButtonText: { color: colors.white, fontWeight: '900', fontSize: 12 },
  stopButton: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.faint },
  stopButtonText: { color: colors.ink, fontWeight: '900', fontSize: 12 },
  progressPanel: { backgroundColor: colors.white, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 16 },
  progressPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressPercentText: { fontSize: 18, fontWeight: '900' },
  progressTrackLarge: { height: 8, borderRadius: 999, backgroundColor: colors.faint, overflow: 'hidden', marginTop: 8, marginBottom: 10 },
  detailActionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  primaryActionPill: { flex: 1, borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
  primaryActionText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  secondaryActionPill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: colors.faint, alignItems: 'center' },
  secondaryActionText: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  episodeMiniProgress: { height: 4, borderRadius: 999, backgroundColor: colors.faint, overflow: 'hidden', marginTop: 7 },
  playbackOptionBox: { backgroundColor: colors.white, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  playbackOptionTextWrap: { flex: 1 },
  togglePill: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.faint },
  toggleText: { fontSize: 12, color: colors.ink, fontWeight: '900' },
  toggleTextActive: { color: colors.white },
  miniLabel: { fontSize: 10, color: colors.muted, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  playerMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  speedRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  speedPill: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.faint },
  speedText: { fontSize: 11, color: colors.ink, fontWeight: '900' },
  speedTextActive: { color: colors.white },
  brandMark: { width: 42, height: 42, borderRadius: 16, backgroundColor: '#1D2433', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  brandMarkLarge: { width: 76, height: 76, borderRadius: 26, alignSelf: 'center', marginBottom: 14 },
  brandMarkText: { color: '#FDE68A', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
  brandMarkTextLarge: { fontSize: 24 },
  logoCentered: { textAlign: 'center', fontSize: 18, fontWeight: '900', color: colors.ink, letterSpacing: 0.5, marginBottom: 10 },
  logoCompact: { fontSize: 16, fontWeight: '900', color: colors.ink, letterSpacing: 0.2 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  welcomeHeroCard: { backgroundColor: '#FFF1D6', borderWidth: 1, borderColor: '#F7D9A6', borderRadius: 34, padding: 22, shadowColor: '#92400E', shadowOpacity: 0.10, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  welcomeTitle: { textAlign: 'center', fontSize: 25, lineHeight: 31, fontWeight: '900', color: colors.ink, marginBottom: 10 },
  welcomeText: { textAlign: 'center', fontSize: 15, lineHeight: 22, color: colors.muted, marginBottom: 16 },
  welcomeFeatureRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  welcomeFeatureCard: { flex: 1, minWidth: 130, backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.95)', borderRadius: 22, padding: 12 },
  welcomeFeatureIcon: { fontSize: 24, marginBottom: 6 },
  welcomeFeatureTitle: { fontSize: 14, fontWeight: '900', color: colors.ink, marginBottom: 4 },
  welcomeFeatureText: { fontSize: 11, lineHeight: 16, color: colors.muted, fontWeight: '700' },
  authCardTitle: { fontSize: 18, fontWeight: '900', color: colors.ink, marginBottom: 4 },
  authCardSub: { fontSize: 13, color: colors.muted, lineHeight: 19, marginBottom: 14 },
  profileHeroCard: { margin: 18, backgroundColor: '#FFF1D6', borderWidth: 1, borderColor: '#F7D9A6', borderRadius: 30, padding: 18, shadowColor: '#92400E', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  homeHeroCard: { marginHorizontal: 12, marginTop: 10, marginBottom: 12, backgroundColor: '#FFF1D6', borderWidth: 1, borderColor: '#F7D9A6', borderRadius: 28, padding: 14, shadowColor: '#92400E', shadowOpacity: 0.09, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  homeHeroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' },
  homeHeroTitle: { fontSize: 23, lineHeight: 29, fontWeight: '900', color: colors.ink, marginBottom: 8 },
  homeHeroText: { fontSize: 13, lineHeight: 19, color: colors.muted, marginBottom: 12 },
  collectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  collectionCard: { width: '47.8%', borderRadius: 22, padding: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  collectionIcon: { fontSize: 21, marginBottom: 7 },
  collectionTitle: { fontSize: 13, lineHeight: 17, fontWeight: '900', color: colors.ink },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' }
});
