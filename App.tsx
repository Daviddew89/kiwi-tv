import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Channel, EpgData, Programme } from './types';
import { fetchChannels, fetchEpg } from './services/tvService';
import ChannelDeck from './components/ChannelList'; 
import ExpandedDetail from './components/HeroModal'; 
import VideoPlayer from './components/VideoPlayer';
import ScheduleModal from './components/ScheduleModal';
import DarkVeil from './components/DarkVeil';

const AppHeader: React.FC<{ 
    onOpenSchedule: () => void;
    scheduleButtonRef: React.RefObject<HTMLButtonElement>;
}> = ({ onOpenSchedule, currentShowTitle, scheduleButtonRef }) => (
    <header className="fixed top-0 left-0 right-0 z-20 h-20 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <h1 className="text-2xl font-bold text-white drop-shadow-lg pointer-events-auto">Free<span className="text-primary-red-ochre">TV</span></h1>

        <button
            ref={scheduleButtonRef}
            onClick={onOpenSchedule}
            className="flex items-center gap-2 bg-app-surface backdrop-blur-sm border border-app-outline text-app-on-surface font-bold py-2 px-4 rounded-full transition-all hover:scale-105 hover:border-primary-red-ochre hover:text-primary-red-ochre shadow-lg pointer-events-auto focus:outline-none focus:ring-2 focus:ring-primary-red-ochre focus:ring-offset-2 focus:ring-offset-app-bg"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Schedule
        </button>
    </header>
);

const App: React.FC = () => {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [epg, setEpg] = useState<EpgData>(new Map());
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
    const [playingChannel, setPlayingChannel] = useState<Channel | null>(null);
    const [selectedScheduleItem, setSelectedScheduleItem] = useState<{ programme: Programme, channel: Channel } | null>(null);
    
    const [scheduleViewConfig, setScheduleViewConfig] = useState<{
        isOpen: boolean;
        channelContext: Channel | null;
    }>({ isOpen: false, channelContext: null });

    const [focusLocation, setFocusLocation] = useState<'deck' | 'header'>('deck');
    const scheduleButtonRef = useRef<HTMLButtonElement>(null);
    const keyPressCooldown = useRef(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [channelsData, epgData] = await Promise.all([
                fetchChannels(),
                fetchEpg()
            ]);
            
            setChannels(channelsData);
            setEpg(epgData);

            if (channelsData.length > 0) {
                setActiveChannelId(channelsData[0].id);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const activeChannel = useMemo(() => channels.find(c => c.id === activeChannelId), [channels, activeChannelId]);
    
    const activeProgramme = useMemo(() => {
        if (!activeChannel || !epg) return null;
        const programmes = epg.get(activeChannel.epg_id);
        if (!programmes) return null;
        const now = new Date();
        return programmes.find(p => now >= p.start && now < p.stop) || null;
    }, [activeChannel, epg]);
    
    const detailData = useMemo(() => {
        if (selectedScheduleItem) {
            return {
                programme: selectedScheduleItem.programme,
                channel: selectedScheduleItem.channel,
                context: 'schedule' as const,
            };
        }
        if (selectedChannelId) {
            const channel = channels.find(c => c.id === selectedChannelId);
            if (!channel) return null;

            const programmes = epg.get(channel.epg_id);
            const now = new Date();
            let programme = programmes?.find(p => now >= p.start && now < p.stop);
            
            // If no current programme is found, create a fallback to allow the detail view to open.
            // This handles channels with sparse or missing EPG data.
            if (!programme) {
                programme = {
                    channelId: channel.epg_id,
                    start: new Date(now.getTime() - 10 * 60 * 1000), // Say it started 10 mins ago
                    stop: new Date(now.getTime() + 60 * 60 * 1000), // And ends in an hour
                    title: channel.name, // Use channel name as title
                    description: `Live feed from ${channel.name}. Detailed programme information is not available at this time.`,
                };
            }

            return {
                programme,
                channel,
                context: 'live' as const,
            };
        }
        return null;
    }, [selectedChannelId, selectedScheduleItem, channels, epg]);

    const handleChannelSelect = useCallback((channelId: string) => {
        setSelectedChannelId(channelId);
    }, []);
    
    const handlePlay = (url: string) => {
        if (detailData?.context === 'live') {
            setPlayingChannel(detailData.channel);
            setCurrentStreamUrl(url);
        }
    };

    const handleClosePlayer = useCallback(() => {
        setPlayingChannel(null);
        setCurrentStreamUrl(null);
        setFocusLocation('deck');
    }, []);
    
    const handleCloseDetail = useCallback(() => {
        setSelectedChannelId(null);
        setSelectedScheduleItem(null);
        // Only reset focus to deck if the schedule is not open underneath.
        if (!scheduleViewConfig.isOpen) {
            setFocusLocation('deck');
        }
    }, [scheduleViewConfig.isOpen]);

    const handleOpenSchedule = useCallback((channel: Channel | null = null) => {
        // If a detail view is open, close it before opening the schedule.
        // This transitions the user from the detail view to the schedule view.
        if (selectedChannelId || selectedScheduleItem) {
            setSelectedChannelId(null);
            setSelectedScheduleItem(null);
        }
        setScheduleViewConfig({ isOpen: true, channelContext: channel });
    }, [selectedChannelId, selectedScheduleItem]);

    const handleCloseSchedule = useCallback(() => {
        setScheduleViewConfig({ isOpen: false, channelContext: null });
        setFocusLocation('deck');
    }, []);
    
    const handleProgrammeSelect = useCallback((programme: Programme, channel: Channel) => {
        setSelectedScheduleItem({ programme, channel });
    }, []);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (playingChannel) {
                    handleClosePlayer();
                } else if (detailData) {
                    handleCloseDetail();
                } else if (scheduleViewConfig.isOpen) {
                    handleCloseSchedule();
                }
                return;
            }

            const isNavigationActive = !playingChannel && !detailData && !scheduleViewConfig.isOpen;
            if (!isNavigationActive) return;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    if (focusLocation === 'deck') {
                        setFocusLocation('header');
                        scheduleButtonRef.current?.focus();
                    }
                    break;
                
                case 'ArrowDown':
                    e.preventDefault();
                    if (focusLocation === 'header') {
                        setFocusLocation('deck');
                        scheduleButtonRef.current?.blur();
                    }
                    break;
                
                case 'ArrowLeft':
                case 'ArrowRight':
                    if (focusLocation === 'deck' && channels.length > 0 && activeChannelId) {
                        e.preventDefault();
                        if (keyPressCooldown.current) return;
                        keyPressCooldown.current = true;
                        setTimeout(() => { keyPressCooldown.current = false; }, 150);

                        const currentIndex = channels.findIndex(c => c.id === activeChannelId);
                        if (currentIndex === -1) return;

                        const direction = e.key === 'ArrowRight' ? 1 : -1;
                        const nextIndex = (currentIndex + direction + channels.length) % channels.length;
                        setActiveChannelId(channels[nextIndex].id);
                    }
                    break;

                case 'Enter':
                case ' ':
                    if (focusLocation === 'header') {
                        e.preventDefault();
                        handleOpenSchedule();
                    } else if (focusLocation === 'deck' && activeChannelId) {
                        e.preventDefault();
                        handleChannelSelect(activeChannelId);
                    }
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        playingChannel, 
        detailData,
        scheduleViewConfig.isOpen, 
        channels, 
        activeChannelId,
        focusLocation,
        handleClosePlayer, 
        handleCloseDetail,
        handleCloseSchedule,
        handleChannelSelect,
        handleOpenSchedule
    ]);

    const [currentStreamUrl, setCurrentStreamUrl] = useState<string | null>(null);

    const channelsForSchedule = scheduleViewConfig.channelContext
        ? [scheduleViewConfig.channelContext]
        : channels;

    const redOchreRGB: [number, number, number] = [169 / 255, 67 / 255, 50 / 255];

    return (
        <div className="h-screen w-screen flex flex-col relative z-0 overflow-hidden bg-app-bg">
            <div className="fixed inset-0 z-[-1] overflow-hidden bg-app-bg">
                <DarkVeil 
                    speed={0.3}
                    noiseIntensity={0.02}
                    scanlineIntensity={0.1}
                    scanlineFrequency={8}
                    warpAmount={0.2}
                    brandColor={redOchreRGB}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/80 pointer-events-none"></div>
            </div>

            <AppHeader 
                scheduleButtonRef={scheduleButtonRef}
                onOpenSchedule={() => handleOpenSchedule()} 
                currentShowTitle={activeProgramme?.title || null} 
            />

            <main className="flex-grow flex flex-col relative overflow-hidden pt-20">
                {loading && (
                    <div className="flex flex-col justify-center items-center h-96 gap-4">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-red-ochre"></div>
                         <p className="text-lg">Loading Channels...</p>
                    </div>
                )}

                {error && (
                    <div className="text-center bg-primary-red-ochre/20 border border-primary-red-ochre/50 text-primary-red-ochre px-4 py-3 rounded-lg max-w-md mx-auto" role="alert">
                        <strong className="font-bold">Error:</strong>
                        <span className="block sm:inline ml-2">{error}</span>
                        <button onClick={loadData} className="mt-4 px-4 py-2 bg-primary-red-ochre text-white rounded-full font-semibold">
                            Retry
                        </button>
                    </div>
                )}

                {!loading && !error && channels.length > 0 && (
                     <>
                        <ChannelDeck 
                            channels={channels}
                            epg={epg}
                            activeChannelId={activeChannelId}
                            onChannelActivate={setActiveChannelId}
                            onChannelSelect={handleChannelSelect}
                        />
                        <div className="flex-grow-[1]" /> {/* This spacer takes up the remaining 25% of the vertical space */}
                    </>
                )}
                
                <ExpandedDetail
                    config={detailData}
                    onClose={handleCloseDetail}
                    onPlay={handlePlay}
                    onOpenSchedule={() => handleOpenSchedule(detailData?.channel ?? null)}
                    epg={epg}
                />
            </main>
            
            {currentStreamUrl && playingChannel && (
                <VideoPlayer 
                    streamUrl={currentStreamUrl} 
                    onClose={handleClosePlayer} 
                    channel={playingChannel}
                    epg={epg}
                />
            )}
            
            <ScheduleModal 
                isOpen={scheduleViewConfig.isOpen}
                onClose={handleCloseSchedule}
                channels={channelsForSchedule}
                epg={epg}
                onProgrammeSelect={handleProgrammeSelect}
            />
        </div>
    );
};

export default App;