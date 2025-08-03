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
    onStreamStatusChange?: (status: {
        isPlaying: boolean;
        isBuffering: boolean;
        error: string | null;
        currentTime: number;
        duration: number;
    }) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ streamUrl, onClose, channel, epg, onStreamStatusChange }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<number | null>(null);
    const hlsInstanceRef = useRef<any>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [volume, setVolume] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isControlsVisible, setIsControlsVisible] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isCastAvailable, setIsCastAvailable] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [streamError, setStreamError] = useState<string | null>(null);
    const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);

    useEffect(() => {
        const styleId = 'custom-subtitle-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
        video::cue {
            position: absolute;
            bottom: 5%;
            left: 50%;
            transform: translateX(-50%);
            width: auto;
            max-width: 90%;
            padding: 0.5em 1em;
            background-color: rgba(0, 0, 0, 0.7);
            border-radius: 4px;
            text-align: center;
            font-size: 1.5rem;
            line-height: 1.4;
        }
        `;
        document.head.appendChild(style);

        return () => {
            const styleElement = document.getElementById(styleId);
            if (styleElement) {
                document.head.removeChild(styleElement);
            }
        };
    }, []);

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

    // Call onStreamStatusChange whenever stream status changes
    useEffect(() => {
        if (onStreamStatusChange) {
            onStreamStatusChange({
                isPlaying,
                isBuffering,
                error: streamError,
                currentTime,
                duration
            });
        }
    }, [isPlaying, isBuffering, streamError, currentTime, duration, onStreamStatusChange]);

    

    const handleToggleSubtitles = useCallback(() => {
        setSubtitlesEnabled(prev => !prev);
    }, []);

    // HLS Logic with comprehensive debugging
    useEffect(() => {
        
        
        
        

        if (!videoRef.current) {
            
            return;
        }

        const video = videoRef.current;
        let hls: any;

        const playVideo = () => {
            video.play().catch(e => {
                const errorMsg = `Autoplay was prevented: ${e instanceof Error ? e.message : String(e)}`;
                setStreamError(errorMsg);
            });
        };

        const hlsConfig: any = { 
            enableWorker: true, 
            lowLatencyMode: true,
        };

        

        if (channel.headers && Object.keys(channel.headers).length > 0) {
            
            hlsConfig.xhrSetup = (xhr: XMLHttpRequest, url: string) => {
                Object.entries(channel.headers).forEach(([key, value]) => {
                    // Skip setting problematic headers
                    if (key.toLowerCase() === 'referer' && value === ' ') {
                        
                        return;
                    }
                    if (key.toLowerCase() === 'user-agent' && value === 'otg/1.5.1 (AppleTv Apple TV 4; tvOS16.0; appletv.client) libcurl/7.58.0 OpenSSL/1.0.2o zlib/1.2.11 clib/1.8.56') {
                        
                        return;
                    }
                    
                    xhr.setRequestHeader(key, String(value));
                });
            };
        }

        const finalStreamUrl = channel.needsProxy 
            ? `/api/stream-proxy?url=${encodeURIComponent(streamUrl)}&${new URLSearchParams(channel.headers || {}).toString()}`
            : streamUrl; // Use the proxy if needed, otherwise use the direct stream URL
        
        
        

        if (streamUrl.endsWith('.m3u8')) {
            
            
            if (Hls.isSupported()) {
                
                try {
                    hls = new Hls(hlsConfig);
                    hlsInstanceRef.current = hls;

                    // Comprehensive HLS event logging
                    const hlsEvents = [
                        'MEDIA_ATTACHED',
                        'MANIFEST_PARSED',
                        'LEVEL_LOADED',
                        'LEVEL_SWITCHED',
                        'FRAG_LOADED',
                        'FRAG_PARSED',
                        'ERROR',
                        'STALLED',
                        'FRAG_LOAD_ERROR',
                        'KEY_LOAD_ERROR',
                        'MANIFEST_LOAD_ERROR'
                    ];

                    hlsEvents.forEach(event => {
                        hls.on(Hls.Events[event], (eventType: string, data: any) => {
                            
                            
                            if (event === 'ERROR') {
                                
                            }
                        });
                    });

                    
                    hls.loadSource(finalStreamUrl);
                    hls.attachMedia(video);
                    
                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        
                        setStreamError(null);
                        playVideo();
                    });

                } catch (e: any) {
                    
                    setStreamError(`Failed to initialize HLS.js: ${e.message}`);
                    hlsInstanceRef.current = null; // Ensure ref is null if creation fails
                }

            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                
                video.src = finalStreamUrl;
                video.addEventListener('loadedmetadata', () => {
                    
                    setStreamError(null);
                    playVideo();
                });
            } else {
                
                setStreamError('HLS streaming not supported by this browser');
            }
        } else {
            
            video.src = finalStreamUrl;
            video.addEventListener('loadedmetadata', () => {
                
                setStreamError(null);
                playVideo();
            });
        }

        // Video element error handling
        const handleVideoError = (e: Event) => {
            const video = e.target as HTMLVideoElement;
            const errorData = {
                error: video.error,
                networkState: video.networkState,
                readyState: video.readyState,
                src: video.src
            };
            
            
            
            if (video.error) {
                const errorMessage = `Video Error: ${video.error.message} (Code: ${video.error.code})`;
                
                
                setStreamError(errorMessage);
            }
        };

        video.addEventListener('error', handleVideoError);

        return () => {
            
            const instanceToDestroy = hlsInstanceRef.current; // Capture the instance
            hlsInstanceRef.current = null; // Immediately nullify the ref

            if (instanceToDestroy) {
                try {
                    if (typeof instanceToDestroy.destroy === 'function') {
                        
                        instanceToDestroy.destroy();
                    } else {
                        
                    }
                } catch (e: any) {
                    
                }
            }
            video.removeEventListener('error', handleVideoError);
            setStreamError(null);
        };
    }, [streamUrl, channel.headers, channel.needsProxy]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const setTracksMode = () => {
            if (!video.textTracks) return;
            for (let i = 0; i < video.textTracks.length; i++) {
                video.textTracks[i].mode = subtitlesEnabled ? 'showing' : 'hidden';
            }
        };

        // Set mode whenever enabled state changes or new tracks are added.
        setTracksMode(); 

        video.textTracks.addEventListener('addtrack', setTracksMode);

        return () => {
            if (video.textTracks) {
                video.textTracks.removeEventListener('addtrack', setTracksMode);
            }
        };
    }, [subtitlesEnabled, currentProgramme]); // Re-run effect when programme changes

    const showControls = useCallback(() => {
        setIsControlsVisible(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = window.setTimeout(() => {
            if (isPlaying) setIsControlsVisible(false);
        }, 3000);
    }, [isPlaying]);

    // Player event listeners with debugging
    useEffect(() => {
        const video = videoRef.current;
        const container = playerContainerRef.current;
        if (!video || !container) return;

        const updatePlayState = () => {
            const newState = !video.paused;
            
            setIsPlaying(newState);
        };
        
        const updateTime = () => setCurrentTime(video.currentTime);
        const updateDuration = () => {
            
            setDuration(video.duration);
        };
        
        const handleWaiting = () => {
            
            setIsBuffering(true);
        };
        
        const handlePlaying = () => {
            
            setIsBuffering(false);
        };

        const handleCanPlay = () => {
            
            setIsBuffering(false);
        };

        const handleLoadStart = () => {
            
            setIsBuffering(true);
        };

        const handleLoadedData = () => {
            
            setIsBuffering(false);
        };

        video.addEventListener('play', updatePlayState);
        video.addEventListener('pause', updatePlayState);
        video.addEventListener('timeupdate', updateTime);
        video.addEventListener('durationchange', updateDuration);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('loadstart', handleLoadStart);
        video.addEventListener('loadeddata', handleLoadedData);
        
        container.addEventListener('mousemove', showControls);
        showControls();

        return () => {
            video.removeEventListener('play', updatePlayState);
            video.removeEventListener('pause', updatePlayState);
            video.removeEventListener('timeupdate', updateTime);
            video.removeEventListener('durationchange', updateDuration);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('playing', handlePlaying);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('loadstart', handleLoadStart);
            video.removeEventListener('loadeddata', handleLoadedData);
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

    // Stream status reporting
    useEffect(() => {
        if (onStreamStatusChange) {
            onStreamStatusChange({
                isPlaying,
                isBuffering,
                error: streamError,
                currentTime,
                duration
            });
        }
    }, [isPlaying, isBuffering, streamError, currentTime, duration, onStreamStatusChange]);
    
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
            >
                {/* Subtitle tracks are handled by the browser for in-band streams, no need to add <track> elements manually here */}
            </video>

            {isBuffering && isPlaying && (
                 <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white/80"></div>
                </div>
            )}

            {streamError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-none">
                    <div className="bg-red-900/80 border border-red-500 text-white p-6 rounded-lg max-w-md text-center">
                        <h3 className="text-lg font-bold mb-2">Stream Error</h3>
                        <p className="text-sm mb-4">{streamError}</p>
                        <button 
                            onClick={() => {

                                setStreamError(null);
                                // Force re-initialization by updating a dependency
                                window.location.reload();
                            }}
                            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-semibold"
                        >
                            Retry Stream
                        </button>
                    </div>
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
                areSubtitlesAvailable={!!currentProgramme?.subtitles}
                subtitlesEnabled={subtitlesEnabled}
                onToggleSubtitles={handleToggleSubtitles}
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