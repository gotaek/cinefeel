import React from 'react';
import { Tag, Calendar } from 'lucide-react';
import Image from 'next/image';
import { Event } from '@/types';
import { CinemaBadge } from '@/components/ui/CinemaBadge';
import { isEventEnded, isEventActive, getDiffDays } from '@/lib/eventUtils';

interface EventCardProps {
  event: Event;
  onClick: (event: Event) => void;
  className?: string;
  priority?: boolean;
}

export const EventCard: React.FC<EventCardProps> = React.memo(({ event, onClick, className = '', priority = false }) => {
  const isEnded = isEventEnded(event);
  const isActive = isEventActive(event);
  const diff = isEnded || !event.period ? null : getDiffDays(event.period);

  const showDDay = diff === 0;
  const showUpcoming = diff !== null ? diff > 0 : event.status === '예정';
  const upcomingLabel = diff !== null && diff > 0 ? `D-${diff}` : '예정';

  return (
    <div
      onClick={() => onClick(event)}
      className={`group cursor-pointer ${className}`}
    >
      <div className={`relative aspect-[2/3] overflow-hidden rounded-2xl bg-neutral-900 border shadow-lg transition-all duration-300 will-change-transform
        ${isEnded ? 'grayscale opacity-60 border-neutral-800' : 'border-neutral-800 group-hover:border-red-500/50'}
        ${!isEnded ? 'group-hover:shadow-red-500/10 group-hover:-translate-y-1' : ''}
      `}>
        <Image
          src={event.imageUrl}
          alt={event.title}
          width={400}
          height={600}
          priority={priority}
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
          className={`w-full h-full object-cover transition-transform duration-500 ${isEnded ? '' : 'group-hover:scale-110'} opacity-80 ${isEnded ? '' : 'group-hover:opacity-100'}`}
        />
        <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
          <CinemaBadge cinema={event.cinema} />
        </div>
        <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
          {event.status === '마감임박' && !isEnded && (
            <div className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse shadow-lg">
              마감임박
            </div>
          )}
          {isEnded && (
            <div className="bg-neutral-700 text-neutral-300 text-[10px] font-bold px-2 py-0.5 rounded shadow-lg">
              종료됨
            </div>
          )}
          {showDDay && (
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-red-500/50 text-red-500 text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping absolute opacity-75"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 relative"></div>
              D-Day
            </div>
          )}
          {!showDDay && showUpcoming && !isActive && (
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md border border-blue-500/30 text-blue-400 text-[10px] font-bold px-2 py-1 rounded-full shadow-lg">
              {upcomingLabel}
            </div>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-12 pb-6 px-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
          <p className="text-xs text-red-400 font-bold mb-1 uppercase tracking-wider italic flex items-center gap-1 drop-shadow-md">
            <Tag className="w-3 h-3" /> {event.goodsType}
          </p>
          <h3 className="text-sm font-bold leading-tight mb-1 break-words text-white drop-shadow-md">{event.title}</h3>
          {event.period && (
            <p className="text-[10px] text-neutral-300 flex items-center gap-1 font-medium opacity-90 drop-shadow-md">
              <span className="w-2.5 h-2.5"><Calendar size={10} /></span>
              {event.period.split('~')[0]} ~
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

EventCard.displayName = 'EventCard';
