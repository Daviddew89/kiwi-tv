import React, { useRef, useEffect, useCallback } from 'react';
import { Channel, EpgData } from '../types';
import DeckChannelCard from './ChannelCard';

interface ChannelDeckProps {
    channels: Channel[];
    epg: EpgData;
    activeChannelId: string | null;
    onChannelActivate: (channelId: string) => void;
    onChannelSelect: (channelId: string) => void;
}

const ChannelDeck: React.FC<ChannelDeckProps> = ({ channels, epg, activeChannelId, onChannelActivate, onChannelSelect }) => {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const isProgrammaticScrollActive = useRef(false);
    const scrollEndTimeout = useRef<number | null>(null);

    useEffect(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;

        let debounceTimeoutId: number;
        const debouncedActivate = (id: string) => {
            clearTimeout(debounceTimeoutId);
            debounceTimeoutId = window.setTimeout(() => {
                onChannelActivate(id);
            }, 150);
        };

        const observer = new IntersectionObserver(
            (entries) => {
                if (isProgrammaticScrollActive.current) return;

                const intersectingEntry = entries.find(entry => entry.isIntersecting && entry.intersectionRatio >= 0.75);
                if (intersectingEntry) {
                    const channelId = (intersectingEntry.target as HTMLElement).dataset.channelId;
                    if (channelId) {
                        debouncedActivate(channelId);
                    }
                }
            },
            {
                root: scroller,
                threshold: 0.75
            }
        );

        observerRef.current = observer;
        Array.from(scroller.children).forEach(child => observer.observe(child as Element));

        return () => {
            clearTimeout(debounceTimeoutId);
            observer.disconnect();
        };
    }, [channels, onChannelActivate]);

    useEffect(() => {
        if (!activeChannelId || !scrollerRef.current) return;

        const cardElement = scrollerRef.current.querySelector(`[data-channel-id="${activeChannelId}"]`);
        if (cardElement) {
            isProgrammaticScrollActive.current = true;
            
            cardElement.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest'
            });

            if (scrollEndTimeout.current) {
                clearTimeout(scrollEndTimeout.current);
            }

            scrollEndTimeout.current = window.setTimeout(() => {
                isProgrammaticScrollActive.current = false;
            }, 500);
        }

        return () => {
            if (scrollEndTimeout.current) {
                clearTimeout(scrollEndTimeout.current);
            }
        };
    }, [activeChannelId]);

    const handleArrowClick = useCallback((direction: 'prev' | 'next') => {
        if (!activeChannelId || channels.length === 0) return;

        const currentIndex = channels.findIndex(c => c.id === activeChannelId);
        if (currentIndex === -1) return;

        const directionValue = direction === 'next' ? 1 : -1;
        const nextIndex = (currentIndex + directionValue + channels.length) % channels.length;
        
        const nextChannelId = channels[nextIndex].id;
        onChannelActivate(nextChannelId);
    }, [activeChannelId, channels, onChannelActivate]);

    return (
        <div 
            className="w-full flex-grow-[3] py-4 relative"
            role="region"
            aria-label="Channel selection deck. Use arrow keys or on-screen buttons to navigate channels, and press Enter to view details."
            aria-activedescendant={activeChannelId ? `channel-card-${activeChannelId}` : undefined}
        >
            <button
                onClick={() => handleArrowClick('prev')}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/20 text-white/70 backdrop-blur-sm transition-all hover:bg-black/40 hover:text-white hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-red-ochre"
                aria-label="Previous channel"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            <button
                onClick={() => handleArrowClick('next')}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/20 text-white/70 backdrop-blur-sm transition-all hover:bg-black/40 hover:text-white hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-red-ochre"
                aria-label="Next channel"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
            </button>

            <div 
                ref={scrollerRef}
                // The 'scrollbar-hide' class is used here. If it doesn't work, you may need to install
                // the 'tailwind-scrollbar-hide' plugin or add this to your global CSS:
                // .scrollbar-hide::-webkit-scrollbar { display: none; }
                // .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                className="absolute inset-0 flex items-center gap-4 md:gap-6 px-[50%] overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide"
                aria-label="List of channels"
            >
                {channels.map(channel => (
                     <DeckChannelCard 
                        key={channel.id}
                        channel={channel}
                        programmes={epg.get(channel.epg_id)}
                        onSelect={() => onChannelSelect(channel.id)}
                        isActive={channel.id === activeChannelId}
                    />
                ))}
            </div>
            
            {/* Gradient Overlays to fade out edges */}
            <div className="absolute left-0 top-0 bottom-0 w-1/4 bg-gradient-to-r from-app-bg to-transparent pointer-events-none z-10"></div>
            <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-gradient-to-l from-app-bg to-transparent pointer-events-none z-10"></div>
        </div>
    );
};

export default ChannelDeck;