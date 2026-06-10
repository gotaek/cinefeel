"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/Header';
import { CinemaFilter } from '@/components/CinemaFilter';
import { EventCard } from '@/components/EventCard';
import { EventModal } from '@/components/EventModal';
import { TrendingSection } from '@/components/TrendingSection';
import { Skeleton } from '@/components/ui/Skeleton';
import { ScrollToTop } from '@/components/ScrollToTop';
import { Event } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { parseStartDate, getStatusPriority } from '@/lib/eventUtils';

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'MOG - 영화관 3사 굿즈 모아보기',
    url: 'https://mog-web.pages.dev',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://mog-web.pages.dev/?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'MOG는 어떤 서비스인가요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'MOG는 CGV, 롯데시네마, 메가박스 등 국내 주요 영화관의 특전(굿즈) 정보를 실시간으로 모아 보여주는 서비스입니다. 오리지널 티켓, 시그니처 아트카드, TTT 등 한정판 굿즈의 재고와 배포 일정을 한눈에 확인할 수 있습니다.'
        }
      },
      {
        '@type': 'Question',
        name: '영화 특전 재고는 어떻게 확인하나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'MOG에서는 각 영화관의 공식 데이터를 기반으로 굿즈 재고 상황을 알려드립니다. 마감 임박한 굿즈는 "마감임박" 태그로 표시되며, 이미 종료된 이벤트는 회색으로 표시됩니다.'
        }
      },
      {
        '@type': 'Question',
        name: '어떤 영화관의 굿즈를 볼 수 있나요?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '현재 CGV, 롯데시네마, 메가박스 3사의 모든 시그니처 굿즈(오리지널 티켓, 아트카드, 필름마크, 무비씰, 포스터 등) 정보를 지원합니다.'
        }
      }
    ]
  }
];

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [filter, setFilter] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    const fetchEvents = async () => {
      if (!isSupabaseConfigured() || !supabase) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            cinemas (name)
          `)
          .eq('is_visible', true);

        if (error) {
          console.error('Supabase fetch error:', error);
          return;
        }

        if (data && data.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mappedEvents: Event[] = data.map((item: any) => ({
            id: item.id,
            title: item.event_title || item.title || 'Untitled Event',
            cinema: item.cinemas?.name || 'Unknown',
            goodsType: item.goods_type || 'Unknown',
            period: item.period || '',
            imageUrl: item.image_url || '',
            locations: item.locations || [],
            officialUrl: item.official_url || '',
            status: item.status || '진행중'
          }));
          setEvents(mappedEvents);
        }
      } catch (err) {
        console.error('Failed to load live data', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const aPriority = getStatusPriority(a);
      const bPriority = getStatusPriority(b);
      if (aPriority !== bPriority) return aPriority - bPriority;
      return parseStartDate(a.period) - parseStartDate(b.period);
    });
  }, [events]);

  const filteredEvents = useMemo(() => {
    return sortedEvents.filter(event => {
      const matchFilter = filter === '전체' || event.cinema === filter;
      const matchSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          event.goodsType.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [sortedEvents, filter, searchQuery]);

  return (
    <div className="min-h-screen">
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="max-w-6xl mx-auto px-4 py-8 min-h-[80vh]">
        <TrendingSection events={events} onEventClick={setSelectedEvent} isLoading={isLoading} />

        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Cinema Goods
              {isLoading && <span className="ml-4 text-sm font-normal text-neutral-500 animate-pulse">Syncing...</span>}
            </h2>
            <p className="text-neutral-400 mt-1">영화관 3사의 굿즈를 한눈에 모아보세요.</p>
          </div>

          <CinemaFilter
            filter={filter}
            setFilter={setFilter}
            className="w-full md:w-auto mb-0 justify-start md:justify-end"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="aspect-[2/3] w-full rounded-2xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredEvents.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={setSelectedEvent}
                priority={index < 4}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-neutral-500">
            <p>검색 결과가 없습니다.</p>
          </div>
        )}
      </main>

      <ScrollToTop />

      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          closeModal={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
