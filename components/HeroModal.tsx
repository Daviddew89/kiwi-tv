import React, { useMemo, useEffect, useRef } from 'react';
import { Channel, EpgData, Programme } from '../types';
import ProgressBar from './ProgressBar';
import { useProgramImage } from '../hooks/useShowImage';
import RatingBadge from './RatingBadge';
import { countryCodeMap } from '../utils/countryCodes';

interface ExpandedDetailProps {
    config: {
        programme: Programme;
        channel: Channel;
        context: 'live' | 'schedule';
    } | null;
    onClose: () => void;
    onPlay: (url: string) => void;
    onOpenSchedule: () => void;
    epg: EpgData;
}

const FlagIcon: React.FC<{ countryName: string }> = ({ countryName }) => {
    const countryCode = countryCodeMap[countryName];
    if (countryCode) {
        return <img 
            src={`https://flagsapi.com/${countryCode}/shiny/24.png`} 
            alt={countryName} 
            className="w-4 h-4 rounded-sm object-cover"
            // Add an error handler to show a fallback icon if the flag fails to load
            onError={(e) => (e.currentTarget.style.display = 'none')}
        />;
    }
    // Fallback to globe icon
    return <span className="material-symbols-outlined">public</span>;
};

const InfoTag: React.FC<{ icon: React.ReactNode; label: string; title?: string }> = ({ icon, label, title }) => (
    <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/10 text-gray-300 text-xs rounded-full px-3 py-1.5" title={title || label}>
        {icon}
        <span className="font-medium">{label}</span>
    </div>
);

const findNextProgrammes = (programmes: Programme[] | undefined, currentProgramme: Programme, count: number): Programme[] => {
    if (!programmes || !currentProgramme) return [];
    const currentIndex = programmes.findIndex(p => p.start.getTime() === currentProgramme.start.getTime() && p.title === currentProgramme.title);
    if (currentIndex === -1) return [];
    return programmes.slice(currentIndex + 1, currentIndex + 1 + count);
};

const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const ExpandedDetail: React.FC<ExpandedDetailProps> = ({ config, onClose, onPlay, onOpenSchedule, epg }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const watchNowButtonRef = useRef<HTMLButtonElement>(null);
    const scheduleButtonRef = useRef<HTMLButtonElement>(null);

    const isOpen = !!config;
    const { programme, channel, context } = config || {};

    const channelProgrammes = useMemo(() => channel ? epg.get(channel.epg_id) : [], [channel, epg]);
    const nextProgrammes = useMemo(() => 
        (context === 'live' && programme) ? findNextProgrammes(channelProgrammes, programme, 2) : [],
    [channelProgrammes, programme, context]);

    const { posterUrl } = useProgramImage(programme, channel);
    
    const displayCategory = useMemo(() => {
        if (!programme?.categories || programme.categories.length === 0) return null;
        // Prefer a more specific category over a generic one like "Lifestyle"
        return programme.categories.find(c => !['lifestyle', 'other'].includes(c.toLowerCase())) || programme.categories[0];
    }, [programme?.categories]);

    useEffect(() => {
        if (isOpen && context === 'live') {
            const timer = setTimeout(() => {
                watchNowButtonRef.current?.focus();
            }, 150);
            return () => clearTimeout(timer);
        } else if (isOpen) {
             const timer = setTimeout(() => {
                closeButtonRef.current?.focus();
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [isOpen, context]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const focusableElements = [
            watchNowButtonRef.current,
            scheduleButtonRef.current,
            closeButtonRef.current
        ].filter(Boolean) as HTMLElement[];
        
        if (focusableElements.length === 0) return;

        if (e.key === 'Tab') {
            e.preventDefault();
            const activeElement = document.activeElement;
            const currentIndex = focusableElements.indexOf(activeElement as HTMLElement);
            const nextIndex = (currentIndex + (e.shiftKey ? -1 : 1) + focusableElements.length) % focusableElements.length;
            focusableElements[nextIndex].focus();
            return;
        }

        if (['ArrowLeft', 'ArrowRight'].includes(e.key) && context === 'live') {
            const activeElement = document.activeElement;
            if (activeElement === watchNowButtonRef.current && e.key === 'ArrowRight') {
                scheduleButtonRef.current?.focus();
            } else if (activeElement === scheduleButtonRef.current && e.key === 'ArrowLeft') {
                watchNowButtonRef.current?.focus();
            }
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        
        if (['Enter', ' '].includes(e.key) && document.activeElement !== modalRef.current) {
             e.stopPropagation();
        }
    };

    const handlePlayClick = () => {
        if (channel) onPlay(channel.url);
    };

    return (
        <div
            className={`fixed inset-0 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-hidden={!isOpen}
            aria-labelledby={programme ? 'detail-program-title' : undefined}
        >
            <div className="absolute inset-0 bg-black/60"></div>

            <div 
                ref={modalRef}
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                className={`outline-none absolute bottom-0 left-0 right-0 w-full max-w-5xl mx-auto p-4 md:p-6 lg:p-8 bg-app-surface backdrop-blur-xl border-t-2 border-primary-red-ochre rounded-t-xl shadow-2xl shadow-black/50 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'translate-y-0' : 'translate-y-full'} max-h-[90vh] overflow-y-auto custom-scrollbar`}
                onClick={e => e.stopPropagation()}
            >
                <button
                    ref={closeButtonRef}
                    onClick={onClose}
                    className="absolute top-4 right-5 h-10 w-10 bg-app-surface rounded-full text-app-on-surface text-2xl font-bold hover:bg-primary-red-ochre hover:text-white transition-colors z-20 flex items-center justify-center shadow-lg border border-app-outline focus:outline-none focus:ring-2 focus:ring-primary-red-ochre"
                    aria-label="Close details"
                >
                    &times;
                </button>

                {!channel || !programme ? (
                     <div className="text-center py-10">
                        <p className="text-lg text-gray-400">Program information not available.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                            <img src={posterUrl || channel.logo} alt={programme.title} className={`w-full aspect-[2/3] object-cover rounded-lg shadow-xl ${!posterUrl && 'p-8'}`} />
                        </div>
                        <div className="md:col-span-2 flex flex-col">
                             <div className="flex-grow">
                                <div className="flex items-end gap-3 mb-2">
                                    <img src={channel.logo} alt="" className="h-10 max-h-10 object-contain" />
                                    <p className="text-lg text-gray-400 font-medium pb-1">{channel.name}</p>
                                </div>

                                <h3 id="detail-program-title" className="text-xl md:text-2xl font-bold text-white mb-2">{programme.title}</h3>
                                
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
                                     {programme.rating && <RatingBadge rating={programme.rating} />}
                                     {programme.isNew && <div className="bg-primary-red-ochre text-white text-xs font-bold px-2 py-1 rounded-md">NEW</div>}
                                     {programme.episodeNum && <span className="text-sm text-gray-300 truncate">{programme.episodeNum}</span>}
                                </div>
                               
                                <p className="text-sm text-app-on-surface-variant mb-4">{programme.description}</p>
                                
                                {/* Info Tags Bar */}
                                <div className="flex flex-wrap items-center gap-2 my-4">
                                    {programme.starRating && programme.starRating !== '0/10' && (
                                        <InfoTag icon={<span className="material-symbols-outlined text-amber-400">grade</span>} label={programme.starRating} title="Star Rating" />
                                    )}
                                    {displayCategory && (
                                        <InfoTag icon={<span className="material-symbols-outlined">movie</span>} label={displayCategory} title="Category" />
                                    )}
                                    {programme.country && (
                                        <InfoTag icon={<FlagIcon countryName={programme.country} />} label={programme.country} title="Country of Origin" />
                                    )}
                                    {programme.videoQuality && (
                                        <InfoTag icon={<span className="material-symbols-outlined">hd</span>} label={programme.videoQuality} title="Video Quality" />
                                    )}
                                    {programme.audio && (
                                        <InfoTag icon={<span className="material-symbols-outlined">surround_sound</span>} label={programme.audio.charAt(0).toUpperCase() + programme.audio.slice(1)} title="Audio Format" />
                                    )}
                                    {programme.subtitles && (
                                        <InfoTag icon={<span className="material-symbols-outlined">subtitles</span>} label="Available" title="Subtitles Available" />
                                    )}
                                </div>
                                
                                {context === 'live' ? (
                                    <div className="mt-4">
                                        <ProgressBar start={programme.start} stop={programme.stop} />
                                        <div className="flex justify-between text-xs text-gray-300 mt-1">
                                            <span>{formatTime(programme.start)}</span>
                                            <span>{formatTime(programme.stop)}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4 text-center bg-black/20 p-3 rounded-lg border border-white/10">
                                        <p className="text-xs font-semibold text-gray-300 tracking-wider uppercase">Airs At</p>
                                        <p className="text-lg text-white font-mono">{formatTime(programme.start)} - {formatTime(programme.stop)}</p>
                                        <p className="text-xs text-gray-400">{programme.start.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                    </div>
                                )}
                                
                                {context === 'live' && nextProgrammes.length > 0 && (
                                    <div className="mt-6">
                                        <h4 className="text-sm font-semibold text-gray-300 mb-2 tracking-wider uppercase">Next Up</h4>
                                        <div className="space-y-2">
                                            {nextProgrammes.map((prog) => (
                                                <div key={prog.start.toISOString()} className="flex justify-between items-center text-sm border-t border-white/10 pt-2 first:border-t-0 first:pt-0">
                                                    <p className="text-gray-200 truncate pr-4">{prog.title}</p>
                                                    <p className="text-gray-400 font-mono flex-shrink-0">{formatTime(prog.start)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                             </div>

                            {context === 'live' && (
                                <div className="mt-6 flex flex-wrap items-center gap-4">
                                    <button
                                        ref={watchNowButtonRef}
                                        onClick={handlePlayClick}
                                        className="flex items-center gap-2 bg-primary-red-ochre text-white font-bold py-3 px-6 rounded-full transition-transform hover:scale-105 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-app-surface focus:ring-primary-red-ochre"
                                        style={{textShadow: '1px 1px 2px rgba(0,0,0,0.3)'}}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm14.024-.983a1.125 1.125 0 010 1.966l-5.603 3.113A1.125 1.125 0 019 15.113V8.887c0-.857.921-1.4 1.671-.983l5.603 3.113z" clipRule="evenodd" />
                                        </svg>
                                        Watch Now
                                    </button>
                                    <button
                                        ref={scheduleButtonRef}
                                        onClick={onOpenSchedule}
                                        className="flex items-center gap-2 bg-white/10 text-app-on-surface border border-app-outline font-bold py-3 px-6 rounded-full transition-all hover:scale-105 hover:bg-white/20 hover:border-white/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-app-surface focus:ring-primary-red-ochre"
                                    >
                                        Full Schedule
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExpandedDetail;