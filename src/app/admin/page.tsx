"use client";

import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Loader2, AlertCircle, Search, Image as ImageIcon, X, Pencil, RotateCcw, Sparkles } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { AdminHeader } from '@/components/AdminHeader';
import { CinemaBadge } from '@/components/ui/CinemaBadge';
import { searchMovies, getPosterUrl, TMDBMovie } from '@/lib/tmdb';
import { useRouter } from 'next/navigation';

const GOODS_TYPE_PRESETS = ['TTT', '오리지널티켓', '아트카드', '포토카드', '관람권', '스티커팩'];

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
  activeColor?: string;
}
function ToggleSwitch({ checked, onChange, label, activeColor = 'bg-green-500' }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-neutral-900 ${checked ? activeColor : 'bg-neutral-700'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      <span className="sr-only">{label}</span>
    </button>
  );
}

interface DeleteConfirmModalProps {
  event: { id: number; title: string };
  onConfirm: () => void;
  onCancel: () => void;
}
function DeleteConfirmModal({ event, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-red-900/50 w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-base">이벤트 영구 삭제</h3>
            <p className="text-xs text-neutral-500 mt-0.5">이 작업은 되돌릴 수 없습니다.</p>
          </div>
        </div>
        <div className="bg-neutral-800 rounded-lg p-3 border border-neutral-700">
          <p className="text-sm text-neutral-300 font-medium truncate">{event.title}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-2.5 rounded-xl transition-colors text-sm"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
          >
            삭제 확인
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [inlineLoading, setInlineLoading] = useState<number | null>(null);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; title: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);

  const [isPosterModalOpen, setIsPosterModalOpen] = useState(false);
  const [posterQuery, setPosterQuery] = useState('');
  const [posterResults, setPosterResults] = useState<TMDBMovie[]>([]);
  const [isSearchingPoster, setIsSearchingPoster] = useState(false);

  const [formData, setFormData] = useState({
    event_title: '',
    movie_title: '',
    cinema_id: 1,
    goods_type: '',
    period: '',
    image_url: '',
    official_url: '',
    locationsInput: '',
    status: '예정',
    is_visible: false,
    is_new: false
  });

  const [filterVisibility, setFilterVisibility] = useState<'visible' | 'hidden' | 'ended'>('visible');

  const stats = React.useMemo(() => ({
    total: events.length,
    visible: events.filter((e: any) => e.is_visible).length,
    hidden: events.filter((e: any) => !e.is_visible).length,
    active: events.filter((e: any) => e.status === '진행중').length,
  }), [events]);

  const filterCounts = React.useMemo(() => ({
    visible: events.filter((e: any) => e.is_visible).length,
    hidden: events.filter((e: any) => !e.is_visible).length,
    ended: events.filter((e: any) => e.status === '종료').length,
  }), [events]);

  const sortedAdminEvents = React.useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result = [...events];

    if (filterVisibility === 'visible') {
      result = result.filter((e: any) => e.is_visible);
    } else if (filterVisibility === 'hidden') {
      result = result.filter((e: any) => !e.is_visible);
    } else if (filterVisibility === 'ended') {
      result = result.filter((e: any) => e.status === '종료');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e: any) =>
        (e.event_title || '').toLowerCase().includes(q) ||
        (e.movie_title || '').toLowerCase().includes(q) ||
        (e.goods_type || '').toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (a.is_new && !b.is_new) return -1;
      if (!a.is_new && b.is_new) return 1;
      const periodA = a.period || '';
      const periodB = b.period || '';
      if (periodA > periodB) return -1;
      if (periodA < periodB) return 1;
      return 0;
    });

    return result;
  }, [events, filterVisibility, searchQuery]);

  const fetchEvents = async () => {
    if (!isSupabaseConfigured() || !supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*, cinemas(name)')
      .order('id', { ascending: false });

    if (error) {
      console.error(error);
      setMessage({ type: 'error', text: '데이터 로딩 실패' });
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    const checkAuth = async () => {
      if (!isSupabaseConfigured() || !supabase) return;
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }
      setAuthChecking(false);
      fetchEvents();
    };
    checkAuth();
  }, [router]);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
      </div>
    );
  }

  const resetForm = () => {
    setFormData({
      event_title: '',
      movie_title: '',
      cinema_id: 1,
      goods_type: '',
      period: '',
      image_url: '',
      official_url: '',
      locationsInput: '',
      status: '예정',
      is_visible: true,
      is_new: false
    });
    setEditingId(null);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEdit = (event: any) => {
    setEditingId(event.id);
    setFormData({
      event_title: event.event_title || event.title || '',
      movie_title: event.movie_title || '',
      cinema_id: event.cinema_id || 1,
      goods_type: event.goods_type || '',
      period: event.period || '',
      image_url: event.image_url || '',
      official_url: event.official_url || '',
      locationsInput: event.locations ? event.locations.join(', ') : '',
      status: event.status || '예정',
      is_visible: event.is_visible ?? false,
      is_new: event.is_new ?? false
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const requestDelete = (id: number, title: string) => {
    setDeleteConfirm({ id, title });
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirm || !supabase) return;
    const { id } = deleteConfirm;
    setDeleteConfirm(null);
    setActionLoading(true);
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      setMessage({ type: 'error', text: '삭제 실패: ' + error.message });
    } else {
      setMessage({ type: 'success', text: '이벤트가 영구적으로 삭제되었습니다.' });
      if (editingId === id) resetForm();
      fetchEvents();
    }
    setActionLoading(false);
  };

  const handleInlineStatusChange = async (id: number, newStatus: string) => {
    if (!supabase) return;
    setInlineLoading(id);
    const { error } = await supabase.from('events').update({ status: newStatus }).eq('id', id);
    if (error) {
      setMessage({ type: 'error', text: '상태 변경 실패: ' + error.message });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setEvents(prev => prev.map((e: any) => e.id === id ? { ...e, status: newStatus } : e));
    }
    setInlineLoading(null);
  };

  const handleInlineVisibilityToggle = async (id: number, currentVisible: boolean) => {
    if (!supabase) return;
    setInlineLoading(id);
    const { error } = await supabase.from('events').update({ is_visible: !currentVisible }).eq('id', id);
    if (error) {
      setMessage({ type: 'error', text: '공개 상태 변경 실패: ' + error.message });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setEvents(prev => prev.map((e: any) => e.id === id ? { ...e, is_visible: !currentVisible } : e));
    }
    setInlineLoading(null);
  };

  const toggleNewStatus = async (id: number, currentStatus: boolean) => {
    if (!supabase) return;
    setActionLoading(true);
    const { error } = await supabase.from('events').update({ is_new: !currentStatus }).eq('id', id);
    if (error) {
      setMessage({ type: 'error', text: '상태 변경 실패: ' + error.message });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setEvents(prev => prev.map((e: any) => e.id === id ? { ...e, is_new: !currentStatus } : e));
    }
    setActionLoading(false);
  };

  const handleSearchPoster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posterQuery.trim()) return;
    setIsSearchingPoster(true);
    const results = await searchMovies(posterQuery);
    setPosterResults(results);
    setIsSearchingPoster(false);
  };

  const handleSelectPoster = (movie: TMDBMovie) => {
    if (movie.poster_path) {
      setFormData({
        ...formData,
        image_url: getPosterUrl(movie.poster_path),
        movie_title: movie.title
      });
      setIsPosterModalOpen(false);
      setPosterQuery('');
      setPosterResults([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setActionLoading(true);
    const locationsArray = formData.locationsInput.split(',').map(s => s.trim()).filter(Boolean);

    const payload = {
      event_title: formData.event_title,
      movie_title: formData.movie_title,
      cinema_id: formData.cinema_id,
      goods_type: formData.goods_type,
      period: formData.period,
      image_url: formData.image_url,
      official_url: formData.official_url,
      locations: locationsArray,
      status: formData.status,
      is_visible: formData.is_visible,
      is_new: formData.is_visible ? false : formData.is_new
    };

    let result;
    if (editingId) {
      result = await supabase.from('events').update(payload).eq('id', editingId);
    } else {
      result = await supabase.from('events').insert([payload]);
    }

    if (result.error) {
      setMessage({ type: 'error', text: (editingId ? '수정' : '등록') + ' 실패: ' + result.error.message });
    } else {
      setMessage({ type: 'success', text: (editingId ? '수정' : '등록') + '되었습니다.' });
      resetForm();
      fetchEvents();
    }
    setActionLoading(false);
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold">DB 연결 필요</h2>
          <p className="text-neutral-400">Admin 페이지를 사용하려면 Supabase 설정이 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans flex flex-col">
      <div className="shrink-0">
        <AdminHeader />
      </div>

      {/* Stats Bar */}
      <div className="shrink-0 bg-neutral-900/70 border-b border-neutral-800 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-4 gap-4">
          {[
            { label: '전체', value: stats.total, color: 'text-neutral-300' },
            { label: '공개', value: stats.visible, color: 'text-green-400' },
            { label: '비공개', value: stats.hidden, color: 'text-red-400' },
            { label: '진행중', value: stats.active, color: 'text-blue-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <div className={`text-xl font-black ${color}`}>{value}</div>
              <div className="text-[10px] text-neutral-600 uppercase tracking-wider font-bold mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {message && (
          <div className={`p-4 mb-4 rounded-lg font-bold text-sm shrink-0 ${message.type === 'success' ? 'bg-green-900/50 text-green-300 border border-green-800' : 'bg-red-900/50 text-red-300 border border-red-800'}`}>
            {message.text}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Form Section */}
          <div className="lg:col-span-1 pr-2">
            <div className={`bg-neutral-900 border ${editingId ? 'border-red-500/50' : 'border-neutral-800'} rounded-2xl p-6 transition-colors`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {editingId ? <Pencil className="w-5 h-5 text-red-500" /> : <Plus className="w-5 h-5 text-red-500" />}
                  {editingId ? '이벤트 수정' : '새 이벤트 등록'}
                </h2>
                {editingId && (
                  <button onClick={resetForm} className="text-xs text-neutral-400 hover:text-white flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> 취소
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Section 1: 영화 & 포스터 */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">영화 & 포스터</p>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">영화 원제 (포스터 검색용)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.movie_title}
                        onChange={e => setFormData({ ...formData, movie_title: e.target.value })}
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none"
                        placeholder="예: 듄: 파트 2"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPosterQuery(formData.movie_title || formData.event_title);
                          setIsPosterModalOpen(true);
                        }}
                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 p-2 rounded-lg transition-colors"
                        title="TMDB 영화 검색"
                      >
                        <Search className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">포스터 이미지 URL</label>
                    <input
                      required
                      type="text"
                      value={formData.image_url}
                      onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none truncate"
                      placeholder="https://..."
                    />
                    {formData.image_url && (
                      <div className="mt-2 w-32 aspect-[2/3] bg-neutral-800 rounded overflow-hidden border border-neutral-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 2: 이벤트 정보 */}
                <div className="space-y-3 pt-1">
                  <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest border-t border-neutral-800 pt-4">이벤트 정보</p>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">이벤트 제목 (화면 표시)</label>
                    <input
                      required
                      type="text"
                      value={formData.event_title}
                      onChange={e => setFormData({ ...formData, event_title: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none"
                      placeholder="예: 듄: 파트 2 오리지널 티켓"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">영화관</label>
                      <select
                        value={formData.cinema_id}
                        onChange={e => setFormData({ ...formData, cinema_id: Number(e.target.value) })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none"
                      >
                        <option value={1}>CGV</option>
                        <option value={2}>메가박스</option>
                        <option value={3}>롯데시네마</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">굿즈 종류</label>
                      <input
                        required
                        type="text"
                        value={formData.goods_type}
                        onChange={e => setFormData({ ...formData, goods_type: e.target.value })}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none"
                        placeholder="예: TTT"
                      />
                    </div>
                  </div>

                  {/* Goods Type Presets */}
                  <div className="flex flex-wrap gap-1.5">
                    {GOODS_TYPE_PRESETS.map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFormData({ ...formData, goods_type: preset })}
                        className={`px-2 py-0.5 text-[10px] rounded-md font-bold border transition-all ${
                          formData.goods_type === preset
                            ? 'bg-red-600/30 border-red-500 text-red-300'
                            : 'bg-neutral-800 border-neutral-700 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">진행 기간</label>
                    <input
                      required
                      type="text"
                      value={formData.period}
                      onChange={e => setFormData({ ...formData, period: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none"
                      placeholder="예: 2024.03.01 ~ 2024.03.02"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">공식 링크</label>
                    <input
                      type="text"
                      value={formData.official_url}
                      onChange={e => setFormData({ ...formData, official_url: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                {/* Section 3: 설정 */}
                <div className="space-y-3 pt-1">
                  <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest border-t border-neutral-800 pt-4">설정</p>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">상태</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none"
                    >
                      <option value="진행중">진행중</option>
                      <option value="마감임박">마감임박</option>
                      <option value="종료">종료</option>
                      <option value="예정">예정</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-2 px-3 bg-neutral-950 rounded-lg border border-neutral-800">
                    <div>
                      <p className="text-xs font-bold text-neutral-300">공개 여부</p>
                      <p className="text-[10px] text-neutral-600 mt-0.5">
                        {formData.is_visible ? '사용자에게 공개됨' : '비공개 상태'}
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={formData.is_visible}
                      onChange={(val) => setFormData({ ...formData, is_visible: val })}
                      label="공개 여부"
                      activeColor="bg-green-500"
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 px-3 bg-neutral-950 rounded-lg border border-neutral-800">
                    <div>
                      <p className="text-xs font-bold text-neutral-300">NEW 뱃지</p>
                      <p className="text-[10px] text-neutral-600 mt-0.5">
                        {formData.is_new ? 'NEW 표시 활성' : 'NEW 표시 없음'}
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={formData.is_new}
                      onChange={(val) => setFormData({ ...formData, is_new: val })}
                      label="NEW 뱃지"
                      activeColor="bg-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">진행 지점 (쉼표로 구분)</label>
                    <textarea
                      value={formData.locationsInput}
                      onChange={e => setFormData({ ...formData, locationsInput: e.target.value })}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none h-20 resize-none"
                      placeholder="용산, 왕십리, 영등포..."
                    />
                  </div>
                </div>

                <button
                  disabled={actionLoading}
                  type="submit"
                  className={`w-full ${editingId ? 'bg-blue-600 hover:bg-blue-500' : 'bg-red-600 hover:bg-red-500'} text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50`}
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? '수정 사항 저장' : '이벤트 등록'}
                </button>
              </form>
            </div>
          </div>

          {/* List Section */}
          <div className="lg:col-span-2 space-y-4 sticky top-8 h-[calc(100vh-4rem)] overflow-y-auto pr-2 custom-scrollbar flex flex-col">
            <div className="sticky top-0 bg-neutral-950 z-20 pt-2 pb-4 space-y-3 shadow-xl shadow-neutral-950/50">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  등록된 이벤트
                  <span className="text-neutral-500 text-sm font-normal">({events.length})</span>
                </h2>
                {loading && <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-600 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="이벤트 검색..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-8 py-2 text-sm focus:border-red-500 outline-none placeholder:text-neutral-600"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Tabs with Counts */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800 shrink-0">
                  <button
                    onClick={() => setFilterVisibility('visible')}
                    className={`px-3 py-1 text-xs rounded-md font-bold transition-all ${filterVisibility === 'visible' ? 'bg-green-900/30 text-green-400 shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                  >
                    공개 ({filterCounts.visible})
                  </button>
                  <button
                    onClick={() => setFilterVisibility('hidden')}
                    className={`px-3 py-1 text-xs rounded-md font-bold transition-all ${filterVisibility === 'hidden' ? 'bg-red-900/30 text-red-400 shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                  >
                    미공개 ({filterCounts.hidden})
                  </button>
                  <button
                    onClick={() => setFilterVisibility('ended')}
                    className={`px-3 py-1 text-xs rounded-md font-bold transition-all ${filterVisibility === 'ended' ? 'bg-neutral-800 text-neutral-300 shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                  >
                    종료 ({filterCounts.ended})
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 pb-10">
              {sortedAdminEvents.length === 0 && !loading ? (
                <div className="text-neutral-500 bg-neutral-900/50 p-8 rounded-2xl text-center border border-dashed border-neutral-800">
                  {events.length === 0 ? '아직 등록된 이벤트가 없습니다.' : '조건에 맞는 이벤트가 없습니다.'}
                </div>
              ) : (
                sortedAdminEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`bg-neutral-900 border ${editingId === event.id ? 'border-blue-500/50 bg-blue-900/10' : !event.is_visible ? 'border-red-900/30 bg-red-900/5' : 'border-neutral-800 hover:border-neutral-700'} rounded-xl p-4 flex gap-4 transition-all group`}
                  >
                    {/* Image */}
                    <div className="w-14 h-20 bg-neutral-800 rounded shrink-0 overflow-hidden relative border border-neutral-800/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={event.image_url} alt="" className={`w-full h-full object-cover ${!event.is_visible ? 'grayscale opacity-70' : ''}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-grow min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <CinemaBadge cinema={event.cinemas?.name} size="sm" />
                          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{event.goods_type}</span>

                          {/* Inline Visibility Toggle */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInlineVisibilityToggle(event.id, event.is_visible);
                            }}
                            disabled={inlineLoading === event.id}
                            title={event.is_visible ? '클릭하여 비공개로 전환' : '클릭하여 공개로 전환'}
                            className={`text-[10px] px-1.5 py-0.5 rounded border font-bold transition-all disabled:opacity-50 ${
                              event.is_visible
                                ? 'bg-green-900/20 border-green-900/50 text-green-500 hover:bg-red-900/20 hover:border-red-900/50 hover:text-red-400'
                                : 'bg-red-950 border-red-900 text-red-500 hover:bg-green-900/20 hover:border-green-900/50 hover:text-green-400'
                            }`}
                          >
                            {inlineLoading === event.id ? '...' : event.is_visible ? '공개' : '비공개'}
                          </button>

                          {/* NEW Toggle */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleNewStatus(event.id, event.is_new);
                            }}
                            className={`transition-colors p-0.5 rounded-full hover:bg-neutral-800 ${event.is_new ? 'text-yellow-400' : 'text-neutral-700 hover:text-yellow-400'}`}
                            title={event.is_new ? 'NEW 상태 해제' : 'NEW 상태로 설정'}
                            aria-label={event.is_new ? 'NEW 상태 해제' : 'NEW 상태로 설정'}
                            aria-pressed={event.is_new}
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${event.is_new ? 'fill-yellow-400/50' : ''}`} />
                          </button>

                          <span className="text-[9px] font-mono text-neutral-700 ml-auto">#{event.id}</span>
                        </div>
                        <h3 className={`font-bold text-base truncate leading-tight ${!event.is_visible ? 'text-neutral-400 line-through decoration-red-900/50' : 'text-neutral-100'}`}>
                          {event.event_title || event.title}
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5 font-mono">{event.period}</p>
                      </div>

                      <div className="flex items-center gap-1 mt-1 overflow-hidden">
                        {event.locations?.slice(0, 4).map((loc: string, i: number) => (
                          <span key={i} className="text-[9px] bg-neutral-800/80 px-1.5 py-0.5 rounded text-neutral-500 border border-neutral-800">{loc}</span>
                        ))}
                      </div>
                    </div>

                    {/* Actions & Status */}
                    <div className="flex flex-col items-end justify-between gap-2 pl-2 border-l border-neutral-800/50">
                      {/* Inline Status Dropdown */}
                      <select
                        value={event.status}
                        disabled={inlineLoading === event.id}
                        onChange={e => handleInlineStatusChange(event.id, e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className={`text-[10px] px-2 py-0.5 rounded font-bold border cursor-pointer appearance-none bg-transparent outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50 ${
                          event.status === '종료' ? 'border-neutral-700 text-neutral-600' :
                          event.status === '마감임박' ? 'border-orange-900/50 text-orange-200' :
                          event.status === '예정' ? 'border-blue-900/30 text-blue-300' :
                          'border-green-900/30 text-green-300'
                        }`}
                      >
                        <option value="진행중" className="bg-neutral-900 text-green-300">진행중</option>
                        <option value="마감임박" className="bg-neutral-900 text-orange-200">마감임박</option>
                        <option value="종료" className="bg-neutral-900 text-neutral-400">종료</option>
                        <option value="예정" className="bg-neutral-900 text-blue-300">예정</option>
                      </select>

                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(event)}
                          disabled={actionLoading}
                          className={`p-1.5 rounded-md transition-colors ${editingId === event.id ? 'text-blue-400 bg-blue-500/20' : 'text-neutral-600 hover:text-blue-400 hover:bg-neutral-800'}`}
                          title="수정"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => requestDelete(event.id, event.event_title || event.title)}
                          disabled={actionLoading || inlineLoading === event.id}
                          className="p-1.5 rounded-md transition-colors text-neutral-600 hover:text-red-400 hover:bg-neutral-800 disabled:opacity-50"
                          title="영구 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* TMDB Search Modal */}
      {isPosterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <h3 className="font-bold text-lg">TMDB 영화 포스터 검색</h3>
              <button onClick={() => setIsPosterModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>

            <div className="p-4">
              <form onSubmit={handleSearchPoster} className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  value={posterQuery}
                  onChange={e => setPosterQuery(e.target.value)}
                  placeholder="영화 제목 (예: 듄)"
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:border-red-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={isSearchingPoster}
                  className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold"
                >
                  {isSearchingPoster ? <Loader2 className="w-5 h-5 animate-spin" /> : '검색'}
                </button>
              </form>
            </div>

            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {posterResults.map(movie => (
                <button
                  key={movie.id}
                  onClick={() => handleSelectPoster(movie)}
                  className="text-left group"
                >
                  <div className="aspect-[2/3] bg-neutral-800 rounded-lg overflow-hidden mb-2 relative">
                    {movie.poster_path ? (
                      <img
                        src={getPosterUrl(movie.poster_path)}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold leading-tight line-clamp-2">{movie.title}</p>
                    <p className="text-[10px] text-neutral-500">{movie.release_date?.split('-')[0]}</p>
                  </div>
                </button>
              ))}
              {!isSearchingPoster && posterResults.length === 0 && posterQuery && (
                <div className="col-span-full text-center py-10 text-neutral-500">
                  검색 결과가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <DeleteConfirmModal
          event={deleteConfirm}
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
