// ============================================
// INTEGRITY POST — Supabase API Client (FIXED)
// ============================================
// Database: Supabase PostgreSQL
// Gambar: Cloudinary URL
// Realtime: Supabase WebSocket
// Cache: localStorage (fallback only)
// ============================================

import { supabase, isSupabaseReady } from '../lib/supabase';
import type { NewsArticle } from '../data/newsData';
import { newsArticles as seedData } from '../data/newsData';
import type { SidebarSlot } from '../store/sidebarStore';
import { DEFAULT_SIDEBARS } from '../data/sidebarDefaults';

// ============================================
// DATA MAPPING (DB ↔ Frontend)
// ============================================

function mapDbToArticle(row: any): NewsArticle {
  return {
    id: row.id,
    title: row.title || '',
    excerpt: row.excerpt || '',
    content: row.content || '',
    category: row.category || 'Nasional',
    author: row.author || '',
    date: row.date || new Date().toISOString(),
    scheduledAt: row.scheduled_at || undefined,
    image: row.image || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    views: row.views || 0,
    featured: Boolean(row.featured),
    breaking: Boolean(row.breaking),
    trending: Boolean(row.trending),
  };
}

function articleToDb(a: NewsArticle) {
  return {
    id: a.id,
    title: a.title,
    excerpt: a.excerpt,
    content: a.content,
    category: a.category,
    author: a.author,
    date: a.date,
    scheduled_at: a.scheduledAt || null,
    image: a.image,
    tags: a.tags,
    views: a.views,
    featured: a.featured,
    breaking: a.breaking,
    trending: a.trending,
  };
}

function mapDbToSidebar(row: any): SidebarSlot {
  return {
    id: row.id,
    title: row.title || '',
    enabled: Boolean(row.enabled),
    url: row.url || '',
    image: row.image || '',
    type: row.type === 'long' ? 'long' : 'normal',
  };
}

function sidebarToDb(s: SidebarSlot) {
  return { id: s.id, title: s.title, enabled: s.enabled, url: s.url, image: s.image, type: s.type };
}

// ============================================
// CACHE (localStorage — fallback ONLY)
// ============================================

const CACHE_KEY = 'ip_cache_v5';

function saveCache(articles: NewsArticle[], sidebars: SidebarSlot[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ articles, sidebars })); } catch {}
}

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as { articles: NewsArticle[]; sidebars: SidebarSlot[] };
  } catch {}
  return { articles: seedData, sidebars: DEFAULT_SIDEBARS };
}

// ============================================
// READ (GET dari Supabase, fallback ke cache)
// ============================================

export async function getAllNews(): Promise<NewsArticle[]> {
  if (!isSupabaseReady) {
    console.warn('[READ] Supabase not ready, using cache');
    return loadCache().articles;
  }

  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .order('date', { ascending: false })
    .limit(500);

  if (error) {
    console.error('[READ] ❌ Fetch articles failed:', error.message);
    return loadCache().articles;
  }

  const articles = (data || []).map(mapDbToArticle);
  if (articles.length > 0) {
    saveCache(articles, loadCache().sidebars);
  }
  return articles.length > 0 ? articles : loadCache().articles;
}

export async function getAllSidebars(): Promise<SidebarSlot[]> {
  if (!isSupabaseReady) return loadCache().sidebars;

  const { data, error } = await supabase
    .from('sidebars')
    .select('*')
    .order('id');

  if (error) {
    console.error('[READ] ❌ Fetch sidebars failed:', error.message);
    return loadCache().sidebars;
  }

  const sidebars = (data || []).map(mapDbToSidebar);
  if (sidebars.length > 0) {
    saveCache(loadCache().articles, sidebars);
  }
  return sidebars.length > 0 ? sidebars : DEFAULT_SIDEBARS;
}

// ============================================
// WRITE (INSERT/UPDATE/DELETE ke Supabase)
// ============================================

export async function createNews(article: NewsArticle): Promise<boolean> {
  if (!isSupabaseReady) {
    console.error('[ARTICLE CREATE] ❌ Supabase not ready! Cannot save to cloud.');
    return false;
  }

  const { error } = await supabase.from('articles').upsert(articleToDb(article));
  if (error) {
    console.error('[ARTICLE CREATE] ❌ Failed:', error.message);
    return false;
  }
  console.log('[ARTICLE CREATED] ✅', article.title);
  return true;
}

export async function updateNews(id: string, article: NewsArticle): Promise<boolean> {
  if (!isSupabaseReady) {
    console.error('[ARTICLE UPDATE] ❌ Supabase not ready!');
    return false;
  }

  const { error } = await supabase.from('articles').update(articleToDb(article)).eq('id', id);
  if (error) {
    console.error('[ARTICLE UPDATE] ❌ Failed:', error.message);
    return false;
  }
  console.log('[ARTICLE UPDATED] ✅', id);
  return true;
}

export async function deleteNews(id: string): Promise<boolean> {
  if (!isSupabaseReady) {
    console.error('[ARTICLE DELETE] ❌ Supabase not ready!');
    return false;
  }

  const { error } = await supabase.from('articles').delete().eq('id', id);
  if (error) {
    console.error('[ARTICLE DELETE] ❌ Failed:', error.message);
    return false;
  }
  console.log('[ARTICLE DELETED] ✅', id);
  return true;
}

export async function saveAllSidebars(sidebars: SidebarSlot[]): Promise<boolean> {
  if (!isSupabaseReady) {
    console.error('[SIDEBAR UPDATE] ❌ Supabase not ready!');
    return false;
  }

  // Delete all then re-insert
  const { error: delErr } = await supabase.from('sidebars').delete().neq('id', '');
  if (delErr) {
    console.error('[SIDEBAR UPDATE] ❌ Delete failed:', delErr.message);
    return false;
  }

  const { error: insErr } = await supabase.from('sidebars').insert(sidebars.map(sidebarToDb));
  if (insErr) {
    console.error('[SIDEBAR UPDATE] ❌ Insert failed:', insErr.message);
    return false;
  }

  console.log('[SIDEBAR UPDATED] ✅', sidebars.length, 'slots');
  return true;
}

// ============================================
// REALTIME SUBSCRIPTION (WebSocket)
// ============================================

type ArticleCb = (articles: NewsArticle[]) => void;
type SidebarCb = (sidebars: SidebarSlot[]) => void;

let articleCbs: ArticleCb[] = [];
let sidebarCbs: SidebarCb[] = [];
let initialized = false;

async function fetchAndBroadcast() {
  const articles = await getAllNews();
  const sidebars = await getAllSidebars();
  articleCbs.forEach(cb => cb(articles));
  sidebarCbs.forEach(cb => cb(sidebars));
}

function setupRealtime() {
  if (initialized) return;
  initialized = true;

  // Initial data fetch
  fetchAndBroadcast();

  if (!isSupabaseReady) {
    console.warn('[REALTIME] Supabase not ready, no realtime subscription');
    return;
  }

  // Subscribe to realtime changes
  supabase
    .channel('integrity-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, () => {
      console.log('[REALTIME] 📰 Articles changed — refreshing...');
      fetchAndBroadcast();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'sidebars' }, () => {
      console.log('[REALTIME] 🖼️ Sidebars changed — refreshing...');
      fetchAndBroadcast();
    })
    .subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        console.log('[REALTIME CONNECTED] ✅ WebSocket active');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[REALTIME] ❌ Channel error — check Supabase Replication settings');
      } else if (status === 'TIMED_OUT') {
        console.warn('[REALTIME] ⏰ Connection timed out, will retry...');
      }
    });
}

export function subscribeToNews(callback: ArticleCb): () => void {
  articleCbs.push(callback);
  setupRealtime();
  return () => {
    articleCbs = articleCbs.filter(cb => cb !== callback);
  };
}

export function subscribeToSidebars(callback: SidebarCb): () => void {
  sidebarCbs.push(callback);
  setupRealtime();
  return () => {
    sidebarCbs = sidebarCbs.filter(cb => cb !== callback);
  };
}

// Legacy exports
export const isApiConfigured = () => isSupabaseReady;
export const loadApiConfig = async () => ({});
