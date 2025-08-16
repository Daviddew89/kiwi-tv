import React, { useRef, useEffect } from 'react';
import { Channel, EpgData } from '../types';
import DeckChannelCard from './ChannelCard'; // Repurposed to be DeckChannelCard

interface ChannelDeckProps {
    channels: Channel[];
    epg: EpgData;
    activeChannelId: string | null;
    onChannelActivate: (channelId: string) => void;
    onChannelSelect: (channelId:string) => void;
}

const ChannelDeck: React.FC<ChannelDeckProps> = ({ channels, epg, activeChannelId, onChannelActivate, onChannelSelect }) => {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    // This ref is used to prevent the IntersectionObserver from firing during a programmatic scroll,
    // which would cause an infinite scroll feedback loop.
    const isProgrammaticScrollActive = useRef(false);
    const scrollEndTimeout = useRef<number | null>(null);

    // Effect to set up the IntersectionObserver for manual scrolling
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
                // Ignore intersections that happen during a programmatic scroll
                if (isProgrammaticScrollActive.current) return;

                const intersectingEntry = entries.find(entry => entry.isIntersecting && entry.intersectionRatio >= 0.75);
                if (intersectingEntry) {
                    const channelId = (intersectingEntry.target as HTMLElement).dataset.channelId;
                    if(channelId) {
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

    // Effect to handle programmatic scrolling when activeChannelId changes (e.g., from keyboard)
    useEffect(() => {
        if (!activeChannelId || !scrollerRef.current) return;

        const cardElement = scrollerRef.current.querySelector(`[data-channel-id="${activeChannelId}"]`);
        if (cardElement) {
            // Set a flag to disable the observer logic during the scroll animation
            isProgrammaticScrollActive.current = true;
            
            cardElement.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest'
            });

            // Clear any existing timeout to handle rapid key presses
            if (scrollEndTimeout.current) {
                clearTimeout(scrollEndTimeout.current);
            }

            // After a delay, re-enable the observer logic. This timeout should be long enough
            // for the smooth scroll animation to complete.
            scrollEndTimeout.current = window.setTimeout(() => {
                isProgrammaticScrollActive.current = false;
            }, 500); // 500ms is a safe duration for most smooth-scroll animations.
        }

        return () => {
            if (scrollEndTimeout.current) {
                clearTimeout(scrollEndTimeout.current);
            }
        };
    }, [activeChannelId]);

    return (
        <div 
            className="w-full h-[520px] py-4 relative"
            role="region"
            aria-label="Channel selection deck. Use left and right arrow keys to navigate channels, and press Enter to view details."
            aria-activedescendant={activeChannelId ? `channel-card-${activeChannelId}` : undefined}
        >
            <div 
                ref={scrollerRef}
                className="absolute inset-0 flex items-center gap-4 md:gap-6 px-[50%] overflow-x-auto overflow-y-hidden snap-x snap-mandatory custom-scrollbar"
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
             {/* Gradient Overlays */}
            <div className="absolute left-0 top-0 bottom-0 w-1/4 bg-gradient-to-r from-[var(--md-sys-color-background)] to-transparent pointer-events-none z-10"></div>
            <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-gradient-to-l from-[var(--md-sys-color-background)] to-transparent pointer-events-none z-10"></div>
        </div>
    );
};

export default ChannelDeck;