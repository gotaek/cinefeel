import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Event } from '@/types';
import { EventCard } from './EventCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getDiffDays, parseStartDate } from '@/lib/eventUtils';

interface TrendingSectionProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  isLoading?: boolean;
}

export const TrendingSection: React.FC<TrendingSectionProps> = ({ events, onEventClick, isLoading = false }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const trendingEvents = useMemo(() => {
    if (isLoading) return [];
    return events
      .filter(event => {
        const diff = getDiffDays(event.period);
        return diff !== null && diff >= 0 && diff <= 3;
      })
      .sort((a, b) => parseStartDate(a.period) - parseStartDate(b.period));
  }, [events, isLoading]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    handleScroll();
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, [trendingEvents]);

  if (!isLoading && trendingEvents.length === 0) return null;

  return (
    <section className="mb-12 relative group">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl bg-red-600/5 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="flex items-center gap-3 mb-6 px-2">
        <div className="relative flex h-3 w-3">
          <span className="animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Trending Now</h2>
        <span className="text-xs font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 mt-1">
          이번 주 놓치면 안 될 굿즈
        </span>
      </div>

      <div className="relative">
        {!isLoading && showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full text-white border border-white/10 shadow-lg transition-all opacity-0 group-hover:opacity-100 -ml-2 md:-ml-4"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {!isLoading && showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full text-white border border-white/10 shadow-lg transition-all opacity-0 group-hover:opacity-100 -mr-2 md:-mr-4"
          >
            <ChevronRight size={24} />
          </button>
        )}

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto py-8 px-4 scroll-smooth snap-x snap-mandatory no-scrollbar items-start gap-4 md:gap-6 relative z-0"
        >
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-none w-[200px] md:w-[240px] snap-start">
                <div className="aspect-[2/3] w-full bg-neutral-800 rounded-2xl animate-pulse" />
              </div>
            ))
          ) : (
            trendingEvents.map((event, index) => (
              <div
                key={event.id}
                className="flex-none w-[200px] md:w-[240px] snap-start transform transition-all duration-500 hover:-translate-y-2"
              >
                <div className="relative group/card">
                  <div className="absolute -inset-0.5 bg-gradient-to-b from-red-500 to-transparent rounded-2xl opacity-20 group-hover:opacity-50 blur transition duration-500"></div>
                  <EventCard
                    event={event}
                    onClick={onEventClick}
                    className="relative shadow-2xl"
                    priority={index < 2}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};
