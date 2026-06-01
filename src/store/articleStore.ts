// ============================================
// INTEGRITY POST — Article Store (Supabase-First)
// ============================================

import { create } from 'zustand';
import { NewsArticle, newsArticles as seedData } from '../data/newsData';
import {
  createNews,
  updateNews,
  deleteNews,
  subscribeToNews,
} from '../api/newsApi';

interface ArticleState {
  articles: NewsArticle[];
  loading: boolean;
  error: string | null;
  addArticle: (article: NewsArticle) => Promise<void>;
  updateArticle: (id: string, article: NewsArticle) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;
  subscribeRealtime: () => () => void;
}

export const useArticleStore = create<ArticleState>((set) => ({
  articles: seedData, // Tampilkan seed data saat loading awal
  loading: true,
  error: null,

  addArticle: async (article) => {
    set({ loading: true, error: null });
    const ok = await createNews(article);
    if (!ok) {
      set({ loading: false, error: 'Gagal menyimpan berita ke database. Cek koneksi atau konfigurasi Supabase.' });
    } else {
      set({ loading: false });
      // Data akan di-refresh otomatis oleh realtime subscription
    }
  },

  updateArticle: async (id, article) => {
    set({ loading: true, error: null });
    const ok = await updateNews(id, article);
    if (!ok) {
      set({ loading: false, error: 'Gagal mengupdate berita.' });
    } else {
      set({ loading: false });
    }
  },

  deleteArticle: async (id) => {
    set({ loading: true, error: null });
    const ok = await deleteNews(id);
    if (!ok) {
      set({ loading: false, error: 'Gagal menghapus berita.' });
    } else {
      set({ loading: false });
    }
  },

  subscribeRealtime: () => {
    return subscribeToNews((articles) => {
      set({ articles, loading: false, error: null });
    });
  },
}));
