import React from 'react';
import { X, Calendar, MapPin, ExternalLink } from 'lucide-react';
import { Event } from '@/types';
import { CinemaBadge } from '@/components/ui/CinemaBadge';

interface EventModalProps {
  event: Event;
  closeModal: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({ event, closeModal }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={closeModal}
      ></div>
      
      <div className="relative bg-neutral-900 border border-neutral-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-2xl flex flex-col md:flex-row animate-in fade-in zoom-in duration-300">
        <button 
          onClick={closeModal}
          className="absolute top-6 right-6 z-10 p-2 bg-black/50 hover:bg-neutral-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Poster Half */}
        <div className="md:w-[40%] aspect-[2/3] md:aspect-auto relative shrink-0">
           {/* Using standard img for now */}
          <img 
            src={event.imageUrl} 
            className="w-full h-full object-cover" 
            alt={event.title} 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent"></div>
        </div>

        {/* Content Half */}
        <div className="md:w-[60%] p-8 md:p-12 flex flex-col bg-neutral-900">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <CinemaBadge cinema={event.cinema} />
              <span className="text-red-500 font-bold text-xs uppercase tracking-[0.2em]">{event.goodsType}</span>
            </div>
            <h2 className="text-4xl font-black mb-2 tracking-tight">{event.title}</h2>
          </div>

          <div className="space-y-8 flex-grow">
            <div className="grid grid-cols-2 gap-6">
              <section>
                <h4 className="text-neutral-500 text-[10px] font-black uppercase mb-2 flex items-center gap-2 tracking-widest leading-none">
                  <Calendar className="w-3 h-3 text-red-500" /> 증정 기간
                </h4>
                <p className="text-sm font-semibold">{event.period}</p>
              </section>
              <section>
                <h4 className="text-neutral-500 text-[10px] font-black uppercase mb-2 flex items-center gap-2 tracking-widest leading-none">
                  <MapPin className="w-3 h-3 text-red-500" /> 진행 정보
                </h4>
                <p className="text-sm font-semibold">{event.locations.length}개 지점 진행</p>
              </section>
            </div>

            <section>
              <h4 className="text-neutral-500 text-[10px] font-black uppercase mb-3 tracking-widest leading-none">진행 지점 상세</h4>
              <div className="flex flex-wrap gap-2">
                {event.locations.map(loc => (
                  <span key={loc} className="bg-neutral-800 px-3 py-1.5 rounded-lg text-xs text-neutral-300 border border-neutral-700 hover:border-red-500 transition-colors cursor-default">
                    {loc}
                  </span>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-8">
            <a 
              href={event.officialUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-500 text-white font-black py-5 rounded-2xl transition-all shadow-2xl shadow-red-600/20 group"
            >
              공식 홈페이지 공지 확인
              <ExternalLink className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
