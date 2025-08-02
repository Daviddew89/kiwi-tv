import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Channel, EpgData, Programme } from '../types';
import { useProgramImage } from '../hooks/useShowImage';
import CustomVideoControls from './CustomVideoControls';
import { debugLogToTerminal, errorLogToTerminal } from '../utils/debug';

// HLS.js is loaded from a script tag in index.html, so we declare it here.
declare const Hls: any;

// --- Start of Custom HLS.js Loader for Proxied Streams ---
const PROXY_URLS = [
    'https://corsproxy.io/?',
    'https://cors.eu.org/',
    'https://thingproxy.freeboard.io/fetch/',
];

class ProxiedHlsLoader {
    private channel: Channel;
    private currentProxyIndex: number = 0;

    constructor(channel: Channel) {
        super();
        this.channel = channel;
        this.logDebug('ProxiedHlsLoader constructor called');
    }

    private logDebug(message: string, data?: any) {
        const logMessage = `[ProxiedHlsLoader:${this.channel.name}] ${message}`;
        if (data !== undefined) {
            console.log(logMessage, data);
            debugLogToTerminal(logMessage, data);
        } else {
            console.log(logMessage);
            debugLogToTerminal(logMessage);
        }
    }

    private getProxiedUrl(originalUrl: string): string {
        const proxy = PROXY_URLS[this.currentProxyIndex];
        // Some proxies require the protocol to be stripped
        const cleanUrl = originalUrl.replace(/^https?:\/\//, '');
        return `${proxy}${cleanUrl}`;
    }

    load(context: any, config: any, callbacks: any) {
        this.logDebug('=== PROXIED HLS LOADER START ===');
        this.logDebug('Context:', context);
        this.logDebug('Config:', config);

        // Create a default loader instance
        const defaultLoader = new Hls.DefaultConfig.loader();
        
        // Override the xhrSetup to proxy ALL requests (manifest, segments, keys)
        const originalXhrSetup = config.xhrSetup;
        config.xhrSetup = (xhr: XMLHttpRequest, url: string) => {
            this.logDebug(`XHR Setup for URL: ${url}`);
            
            // Check if this URL needs to be proxied
            // Proxy requests to the original domain AND to Akamai CDN (for Sky Open segments)
            const originalDomain = this.channel.url.replace(/^https?:\/\//, '').split('/')[0];
            const requestDomain = url.replace(/^https?:\/\//, '').split('/')[0];
            
            let finalUrl = url;
            if (requestDomain === originalDomain || requestDomain === 'primetv-prod.akamaized.net') {
                // This is a request to the original domain or Akamai CDN, proxy it
                finalUrl = this.getProxiedUrl(url);
                this.logDebug(`Proxying request: ${url} -> ${finalUrl}`);
            } else {
                this.logDebug(`Direct request (not proxied): ${url}`);
            }
            
            // Apply channel headers
            if (this.channel.headers) {
                Object.entries(this.channel.headers).forEach(([key, value]) => {
                    this.logDebug(`Setting header: ${key} = ${value}`);
                    xhr.setRequestHeader(key, value);
                });
            }

            // Call original xhrSetup if it exists
            if (originalXhrSetup) {
                originalXhrSetup(xhr, finalUrl);
            }

            // Add error handling for this specific request
            xhr.addEventListener('error', (e) => {
                this.logDebug(`XHR Error for ${url}:`, e);
                this.handleLoadError(context, config, callbacks);
            });

            xhr.addEventListener('timeout', (e) => {
                this.logDebug(`XHR Timeout for ${url}:`, e);
                this.handleLoadError(context, config, callbacks);
            });
        };

        // Use the default loader to handle the actual loading
        defaultLoader.load(context, config, callbacks);
    }


}
// --- End of Custom HLS.js Loader ---

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

    // Debug logging function
    const logDebug = useCallback((message: string, data?: any) => {
        const logMessage = `[VideoPlayer:${channel.name}] ${message}`;
        if (data !== undefined) {
            console.log(logMessage, data);
            debugLogToTerminal(logMessage, data);
        } else {
            console.log(logMessage);
            debugLogToTerminal(logMessage);
        }
    }, [channel.name]);

    // HLS Logic with comprehensive debugging
    useEffect(() => {
        logDebug('=== STREAM INITIALIZATION START ===');
        logDebug('Channel data:', {
            id: channel.id,
            name: channel.name,
            url: channel.url,
            epg_id: channel.epg_id,
            needsProxy: channel.needsProxy,
            headers: channel.headers
        });
        logDebug('Stream URL:', streamUrl);
        logDebug('Stream type:', streamUrl.endsWith('.m3u8') ? 'HLS' : 'Direct');

        if (!videoRef.current) {
            logDebug('ERROR: Video element not available');
            return;
        }

        const video = videoRef.current;
        let hls: any;

        const playVideo = () => {
            logDebug('Attempting to play video...');
            video.play().catch(e => {
                const errorMsg = `Autoplay was prevented: ${e.message}`;
                logDebug('ERROR: ' + errorMsg, e);
                errorLogToTerminal('Autoplay failed', e);
                setStreamError(errorMsg);
            });
        };

        const hlsConfig: any = { 
            enableWorker: true, 
            lowLatencyMode: true,
            debug: true // Enable HLS.js internal debugging
        };

        logDebug('HLS configuration:', hlsConfig);

        if (channel.needsProxy) {
            logDebug('Using proxied HLS loader');
            const proxiedLoader = new ProxiedHlsLoader(channel);
            logDebug('ProxiedHlsLoader created:', proxiedLoader);
            hlsConfig.loader = proxiedLoader;
        } else if (channel.headers && channel.headers['x-forwarded-for']) {
            logDebug('Setting up custom headers for non-proxied channel');
            hlsConfig.xhrSetup = (xhr: XMLHttpRequest, url: string) => {
                logDebug('Setting x-forwarded-for header:', channel.headers['x-forwarded-for']);
                xhr.setRequestHeader('x-forwarded-for', channel.headers['x-forwarded-for']);
            };
        }

        const finalStreamUrl = streamUrl; // ProxiedHlsLoader will handle proxying internally
        logDebug('Final stream URL:', finalStreamUrl);

        if (streamUrl.endsWith('.m3u8')) {
            logDebug('Processing HLS stream...');
            
            if (Hls.isSupported()) {
                logDebug('HLS.js is supported, creating HLS instance');
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
                        logDebug(`HLS Event [${event}]:`, { eventType, data });
                        
                        if (event === 'ERROR') {
                            logDebug('HLS ERROR DETAILS:', {
                                type: data.type,
                                details: data.details,
                                fatal: data.fatal,
                                url: data.url
                            });
                            setStreamError(`HLS Error: ${data.details} (${data.type})`);
                        }
                    });
                });

                logDebug('Loading HLS source:', streamUrl);
                hls.loadSource(streamUrl);
                hls.attachMedia(video);
                
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    logDebug('HLS manifest parsed successfully, starting playback');
                    setStreamError(null);
                    playVideo();
                });

            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                logDebug('Using native HLS support');
                video.src = finalStreamUrl;
                video.addEventListener('loadedmetadata', () => {
                    logDebug('Native HLS metadata loaded, starting playback');
                    setStreamError(null);
                    playVideo();
                });
            } else {
                logDebug('ERROR: HLS not supported by browser');
                setStreamError('HLS streaming not supported by this browser');
            }
        } else {
            logDebug('Processing direct stream...');
            video.src = finalStreamUrl;
            video.addEventListener('loadedmetadata', () => {
                logDebug('Direct stream metadata loaded, starting playback');
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
            logDebug('Video element error:', errorData);
            errorLogToTerminal('Video element error', errorData);
            
            if (video.error) {
                const errorMessage = `Video Error: ${video.error.message} (Code: ${video.error.code})`;
                logDebug(errorMessage);
                errorLogToTerminal(errorMessage);
                setStreamError(errorMessage);
            }
        };

        video.addEventListener('error', handleVideoError);

        return () => {
            logDebug('Cleaning up stream...');
            if (hls) {
                logDebug('Destroying HLS instance');
                hls.destroy();
                hlsInstanceRef.current = null;
            }
            video.removeEventListener('error', handleVideoError);
            setStreamError(null);
        };
    }, [streamUrl, channel.headers, channel.needsProxy, logDebug]);

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
            logDebug(`Play state changed: ${newState ? 'playing' : 'paused'}`);
            setIsPlaying(newState);
        };
        
        const updateTime = () => setCurrentTime(video.currentTime);
        const updateDuration = () => {
            logDebug(`Duration updated: ${video.duration}s`);
            setDuration(video.duration);
        };
        
        const handleWaiting = () => {
            logDebug('Video waiting for data');
            setIsBuffering(true);
        };
        
        const handlePlaying = () => {
            logDebug('Video playing');
            setIsBuffering(false);
        };

        const handleCanPlay = () => {
            logDebug('Video can start playing');
            setIsBuffering(false);
        };

        const handleLoadStart = () => {
            logDebug('Video load started');
            setIsBuffering(true);
        };

        const handleLoadedData = () => {
            logDebug('Video data loaded');
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
    }, [showControls, logDebug]);

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
            />

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
                                logDebug('User requested stream retry');
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