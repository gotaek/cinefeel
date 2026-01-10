"use client";

import React, { useState, useEffect } from 'react';
import { Trash2, Plus, Loader2, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { AdminHeader } from '@/components/AdminHeader';
import { CinemaBadge } from '@/components/ui/CinemaBadge';

// Helper for type safety if needed, or simply use 'any' for admin prototype speed
interface AdminEvent {
  id: number;
  title: string;
  cinema_id: number; // 1: CGV, 2: MegaBox, 3: Lotte
  goods_type: string;
  period: string;
  image_url: string;
  official_url: string;
  status: string;
  locations: string[];
}

export default function AdminPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    cinema_id: 1,
    goods_type: '',
    period: '',
    image_url: '',
    official_url: '',
    locationsInput: '' // comma separated
  });

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
    fetchEvents();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    if (!supabase) return;

    setActionLoading(true);
    const { error } = await supabase.from('events').delete().eq('id', id);
    
    if (error) {
      setMessage({ type: 'error', text: '삭제 실패: ' + error.message });
    } else {
      setMessage({ type: 'success', text: '삭제되었습니다.' });
      fetchEvents();
    }
    setActionLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    setActionLoading(true);
    const locationsArray = formData.locationsInput.split(',').map(s => s.trim()).filter(Boolean);

    const { error } = await supabase.from('events').insert([{
      title: formData.title,
      cinema_id: formData.cinema_id,
      goods_type: formData.goods_type,
      period: formData.period,
      image_url: formData.image_url,
      official_url: formData.official_url,
      locations: locationsArray,
      status: '진행중'
    }]);

    if (error) {
      setMessage({ type: 'error', text: '등록 실패: ' + error.message });
    } else {
      setMessage({ type: 'success', text: '이벤트가 등록되었습니다.' });
      setFormData({
        title: '',
        cinema_id: 1,
        goods_type: '',
        period: '',
        image_url: '',
        official_url: '',
        locationsInput: ''
      });
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans pb-20">
      <AdminHeader />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {message && (
          <div className={`p-4 mb-6 rounded-lg font-bold text-sm ${message.type === 'success' ? 'bg-green-900/50 text-green-300 border border-green-800' : 'bg-red-900/50 text-red-300 border border-red-800'}`}>
            {message.text}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-500" /> 새 이벤트 등록
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">영화 제목</label>
                  <input 
                    required
                    type="text" 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none"
                    placeholder="예: 듄: 파트 2"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">영화관</label>
                    <select 
                      value={formData.cinema_id}
                      onChange={e => setFormData({...formData, cinema_id: Number(e.target.value)})}
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
                      onChange={e => setFormData({...formData, goods_type: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none"
                      placeholder="예: TTT"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">진행 기간</label>
                  <input 
                    required
                    type="text" 
                    value={formData.period}
                    onChange={e => setFormData({...formData, period: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none"
                    placeholder="예: 2024.03.01 ~ 소진 시"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">이미지 URL</label>
                  <input 
                    required
                    type="text" 
                    value={formData.image_url}
                    onChange={e => setFormData({...formData, image_url: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">공식 링크</label>
                  <input 
                    type="text" 
                    value={formData.official_url}
                    onChange={e => setFormData({...formData, official_url: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">진행 지점 (쉼표로 구분)</label>
                  <textarea 
                    value={formData.locationsInput}
                    onChange={e => setFormData({...formData, locationsInput: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-red-500 outline-none h-20 resize-none"
                    placeholder="용산, 왕십리, 영등포..."
                  />
                </div>

                <button 
                  disabled={actionLoading}
                  type="submit" 
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '이벤트 등록'}
                </button>
              </form>
            </div>
          </div>

          {/* List Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold">등록된 이벤트 ({events.length})</h2>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />}
            </div>

            {events.length === 0 && !loading ? (
              <div className="text-neutral-500 bg-neutral-900/50 p-8 rounded-2xl text-center border border-dashed border-neutral-800">
                아직 등록된 이벤트가 없습니다.
              </div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-4 flex gap-4 transition-all">
                  <div className="w-16 h-24 bg-neutral-800 rounded-lg shrink-0 overflow-hidden">
                    <img src={event.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <CinemaBadge cinema={event.cinemas?.name} />
                      <span className="text-xs text-red-400 font-bold uppercase">{event.goods_type}</span>
                    </div>
                    <h3 className="font-bold text-lg truncate mb-1">{event.title}</h3>
                    <p className="text-xs text-neutral-500 mb-2">{event.period}</p>
                    <div className="flex gap-1 overflow-hidden">
                       {event.locations?.slice(0, 3).map((loc: string, i: number) => (
                         <span key={i} className="text-[10px] bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-400">{loc}</span>
                       ))}
                       {(event.locations?.length || 0) > 3 && <span className="text-[10px] text-neutral-500 pl-1">...</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                     <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${event.status === '마감임박' ? 'bg-orange-900 text-orange-200' : 'bg-green-900 text-green-200'}`}>
                        {event.status}
                     </span>
                     <button 
                      onClick={() => handleDelete(event.id)}
                      disabled={actionLoading}
                      className="p-2 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                       <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
