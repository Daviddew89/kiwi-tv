import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Channel, EpgData, Programme } from '../types';
import { useProgramImage } from '../hooks/useShowImage';
import CustomVideoControls from './CustomVideoControls';

// HLS.js is loaded from a script tag in index.html, so we declare it here.
declare const Hls: any;

const findCurrentProgrammeIndex = (programmes: Programme[] | undefined): number => {
    if (!programmes || programmes.length === 0) return -1;
    const now = new Date();
    return programmes.findIndex(p => now >= p.start && now < p.stop);
};

const NextUpCard: React.FC<{ programme: Programme, channel: Channel }> = ({ programme, channel }) => {
    const { posterUrl } = useProgramImage(programme, channel);
    if (!posterUrl) return null;
    return (
        <div className="w-64 bg-slate-900/80 backdrop-blur-md rounded-lg shadow-2xl overflow-hidden flex items-center p-3 animate-slide-in-up border border-white/10">
            <img src={posterUrl} alt={programme.title} className="w-16 h-24 object-cover rounded-md flex-shrink-0" />
            <div className="ml-3 overflow-hidden">
                <p className="text-xs text-gray-300">Next Up</p>
                <p className="text-white font-bold text-sm leading-tight text-ellipsis-3-lines">{programme.title}</p>
            </div>
        </div>
    );
};

interface VideoPlayerProps {
    streamUrl: string;
    onClose: () => void;
    channel: Channel;
    epg: EpgData;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ streamUrl, onClose, channel, epg }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<number | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [volume, setVolume] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isControlsVisible, setIsControlsVisible] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isCastAvailable, setIsCastAvailable] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);

    const { currentProgramme, nextProgramme } = useMemo(() => {
        const programmes = epg.get(channel.epg_id);
        const currentIndex = findCurrentProgrammeIndex(programmes);
        if (currentIndex === -1 || !programmes) {
            return { currentProgramme: null, nextProgramme: null };
        }
        return {
            currentProgramme: programmes[currentIndex],
            nextProgramme: programmes[currentIndex + 1] || null,
        };
    }, [channel.epg_id, epg]);

    const [showNextUp, setShowNextUp] = useState(false);

    // HLS Logic
    useEffect(() => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        let hls: any;
        const playVideo = () => video.play().catch(e => console.error("Autoplay was prevented:", e));

        const hlsConfig: any = { 
            enableWorker: true, 
            lowLatencyMode: true 
        };

        if (channel.headers && channel.headers['x-forwarded-for']) {
            hlsConfig.xhrSetup = (xhr: XMLHttpRequest, url: string) => {
                xhr.setRequestHeader('x-forwarded-for', channel.headers['x-forwarded-for']);
            };
        }
        
        let finalStreamUrl = streamUrl;
        if (channel.needsProxy) {
            finalStreamUrl = `https://corsproxy.io/?${streamUrl}`;
        }

        if (finalStreamUrl.endsWith('.m3u8')) {
            if (Hls.isSupported()) {
                hls = new Hls(hlsConfig);
                hls.loadSource(finalStreamUrl);
                hls.attachMedia(video);
                hls.on(Hls.Events.MANIFEST_PARSED, playVideo);
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = finalStreamUrl;
                video.addEventListener('loadedmetadata', playVideo);
            }
        } else {
            video.src = finalStreamUrl;
            playVideo();
        }

        return () => {
            if (hls) hls.destroy();
        };
    }, [streamUrl, channel.headers, channel.needsProxy]);

    const showControls = useCallback(() => {
        setIsControlsVisible(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = window.setTimeout(() => {
            if (isPlaying) setIsControlsVisible(false);
        }, 3000);
    }, [isPlaying]);

    // Player event listeners
    useEffect(() => {
        const video = videoRef.current;
        const container = playerContainerRef.current;
        if (!video || !container) return;

        const updatePlayState = () => setIsPlaying(!video.paused);
        const updateTime = () => setCurrentTime(video.currentTime);
        const updateDuration = () => setDuration(video.duration);
        const handleWaiting = () => setIsBuffering(true);
        const handlePlaying = () => setIsBuffering(false);

        video.addEventListener('play', updatePlayState);
        video.addEventListener('pause', updatePlayState);
        video.addEventListener('timeupdate', updateTime);
        video.addEventListener('durationchange', updateDuration);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);
        
        container.addEventListener('mousemove', showControls);
        showControls();

        return () => {
            video.removeEventListener('play', updatePlayState);
            video.removeEventListener('pause', updatePlayState);
            video.removeEventListener('timeupdate', updateTime);
            video.removeEventListener('durationchange', updateDuration);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('playing', handlePlaying);
            container.removeEventListener('mousemove', showControls);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        };
    }, [showControls]);

    // Fullscreen and Cast API listeners
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        const checkCastAvailability = () => {
             if ('remote' in video && typeof video.remote.watchAvailability === 'function') {
                video.remote.watchAvailability((available) => setIsCastAvailable(available)).catch(() => {
                    // If there's an error setting up the watch, assume not available.
                    setIsCastAvailable(false);
                });
            } else if ((window as any).WebKitPlaybackTargetAvailabilityEvent) {
                video.addEventListener('webkitplaybacktargetavailabilitychanged', (event: any) => {
                    setIsCastAvailable(event.availability === "available");
                });
            }
        };
        checkCastAvailability();

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);
    
    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const video = videoRef.current;
            if (!video) return;

            // Allow typing in text fields without triggering shortcuts
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            switch (e.key.toLowerCase()) {
                case ' ': e.preventDefault(); video.paused ? video.play() : video.pause(); break;
                case 'm': video.muted = !video.muted; break;
                case 'f': handleFullscreenToggle(); break;
                case 'arrowright': video.currentTime += 10; break;
                case 'arrowleft': video.currentTime -= 10; break;
                case 'arrowup': video.volume = Math.min(1, video.volume + 0.1); break;
                case 'arrowdown': video.volume = Math.max(0, video.volume - 0.1); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Next Up card logic
    useEffect(() => {
        if (!currentProgramme || !nextProgramme) return;
        const checkTime = () => {
            const timeLeft = currentProgramme.stop.getTime() - new Date().getTime();
            setShowNextUp(timeLeft <= 60000 && timeLeft > 0);
        };
        const intervalId = setInterval(checkTime, 1000);
        checkTime();
        return () => clearInterval(intervalId);
    }, [currentProgramme, nextProgramme]);
    
    const handlePlayPause = () => videoRef.current?.paused ? videoRef.current?.play() : videoRef.current?.pause();
    const handleMuteToggle = () => { if(videoRef.current) videoRef.current.muted = !videoRef.current.muted; setIsMuted(m => !m); };
    const handleVolumeChange = (newVolume: number) => { if (videoRef.current) { videoRef.current.volume = newVolume; videoRef.current.muted = newVolume === 0; } setVolume(newVolume); setIsMuted(newVolume === 0); };
    const handleSeek = (time: number) => { if(videoRef.current) videoRef.current.currentTime = time; };
    const handleFullscreenToggle = () => {
        if (!playerContainerRef.current) return;
        if (!isFullscreen) playerContainerRef.current.requestFullscreen().catch(err => console.error(err));
        else document.exitFullscreen();
    };
    const handleCast = () => {
        const video = videoRef.current;
        if (!video) return;
        // Use the state `isCastAvailable` to check for availability.
        if (isCastAvailable && 'remote' in video && typeof video.remote.prompt === 'function') {
            video.remote.prompt().catch(e => console.error("Cast prompt failed:", e));
        } else if ((video as any).webkitShowPlaybackTargetPicker) {
            // Fallback for Safari/WebKit
            (video as any).webkitShowPlaybackTargetPicker();
        }
    };

    return (
        <div 
            ref={playerContainerRef}
            className="fixed inset-0 bg-black z-50 animate-fade-in group"
            role="dialog"
            aria-modal="true"
        >
            <video 
                ref={videoRef} 
                className="w-full h-full object-contain" 
                autoPlay 
                playsInline
                muted={isMuted}
                x-webkit-airplay="allow"
            />

            {isBuffering && isPlaying && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white/80"></div>
                </div>
            )}
            
            <CustomVideoControls
                isVisible={isControlsVisible}
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                volume={volume}
                isMuted={isMuted}
                onVolumeChange={handleVolumeChange}
                onMuteToggle={handleMuteToggle}
                currentTime={currentTime}
                duration={duration}
                onSeek={handleSeek}
                isFullscreen={isFullscreen}
                onFullscreenToggle={handleFullscreenToggle}
                isCastAvailable={isCastAvailable}
                onCast={handleCast}
                channelName={channel.name}
                programmeTitle={currentProgramme?.title || 'Live Stream'}
            />

            <button
                onClick={onClose}
                className="absolute top-4 right-4 h-12 w-12 bg-black/50 rounded-full text-white/80 text-3xl font-bold hover:bg-black/80 hover:text-white transition-opacity z-20 flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100"
                aria-label="Close player"
            >
                &times;
            </button>
            
            {showNextUp && nextProgramme && (
                <div className="absolute bottom-24 right-8 z-20 pointer-events-none">
                    <NextUpCard programme={nextProgramme} channel={channel} />
                </div>
            )}
        </div>
    );
};

export default VideoPlayer;