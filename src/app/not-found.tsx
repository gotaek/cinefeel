import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white px-4">
      <div className="text-center space-y-6 max-w-md">
        {/* Logo/Icon */}
        <div className="mx-auto w-24 h-24 bg-neutral-900 rounded-full flex items-center justify-center border border-neutral-800 mb-8">
           {/* eslint-disable-next-line @next/next/no-img-element */}
           <img src="/mog-logo-final.svg" alt="MOG Logo" className="w-12 h-12 object-contain opacity-50 grayscale" />
        </div>

        <h1 className="text-8xl font-black text-neutral-800 tracking-tighter select-none">
          404
        </h1>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-neutral-200">
            페이지를 찾을 수 없습니다
          </h2>
          <p className="text-neutral-400 text-sm">
            요청하신 페이지가 삭제되었거나, 이름이 변경되었거나, 일시적으로 사용할 수 없습니다.
          </p>
        </div>

        <div className="pt-8">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold text-sm hover:bg-neutral-200 transition-colors"
          >
            <Home size={16} />
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
