import React from 'react';

export const Footer: React.FC = () => {
    return (
        <footer className="border-t border-neutral-900 bg-neutral-950 py-12 px-4 mt-20">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8 opacity-60 hover:opacity-100 transition-opacity">
                
                <div className="space-y-4 max-w-md">
                    <p className="text-xs text-neutral-500 leading-relaxed">
                        본 사이트(MOG)는 영화관별 공식 굿즈 정보를 모아 보여주는 정보 제공 서비스입니다.
                        <br />
                        사이트 내 사용된 모든 영화관 로고(CGV, 롯데시네마, 메가박스 등) 및 영화 포스터 이미지의 저작권은
                        각 배급사 및 해당 기업에 있습니다.
                    </p>
                    <p className="text-xs text-neutral-600">
                        저작권 관련 문의: deriko@naver.com <br/>
                        (저작권자의 요청 시 관련 이미지는 즉시 삭제될 수 있습니다.)
                    </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                     <div className="flex items-center gap-2">
                        {/* TMDB Logo SVG could go here, using text for now as per requirements */}
                        <div className="h-8 w-20 bg-gradient-to-r from-[#90cea1] to-[#01b4e4] rounded flex items-center justify-center font-black text-[#0d253f] text-xs">
                            TMDB
                        </div>
                    </div>
                     <p className="text-[10px] text-neutral-500 text-right max-w-[200px]">
                        This product uses the TMDB API but is not endorsed or certified by TMDB.
                    </p>
                </div>

            </div>
            <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-neutral-900 text-center">
                 <p className="text-[10px] text-neutral-700 font-mono">
                    © 2024 MOG. All rights reserved.
                </p>
            </div>
        </footer>
    );
};
