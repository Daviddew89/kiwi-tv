import React, { useState, useRef } from 'react';
import { formatTime } from '../utils/formatTime';

// An SVG icon for subtitles
const SubtitlesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h2a1 1 0 011 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2a1 1 0 011-1zM9 10h2a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1v-2a1 1 0 011-1zM15 10h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2a1 1 0 011-1z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 18h16" />
    </svg>
);

interface CustomControlsProps {
    isVisible: boolean;
    isPlaying: boolean;
    onPlayPause: () => void;
    volume: number;
    isMuted: boolean;
    onVolumeChange: (volume: number) => void;
    onMuteToggle: () => void;
    currentTime: number;
    duration: number;
    onSeek: (time: number) => void;
    isFullscreen: boolean;
    onFullscreenToggle: () => void;
    isCastAvailable: boolean;
    onCast: () => void;
    channelName: string;
    programmeTitle: string;
    areSubtitlesAvailable: boolean;
    subtitlesEnabled: boolean;
    onToggleSubtitles: () => void;
}

const VolumeControl: React.FC<{
    volume: number;
    isMuted: boolean;
    onVolumeChange: (volume: number) => void;
    onMuteToggle: () => void;
}> = ({ volume, isMuted, onVolumeChange, onMuteToggle }) => {
    const [showSlider, setShowSlider] = useState(false);
    const getVolumeIcon = () => {
        if (isMuted || volume === 0) return 'volume_off';
        if (volume < 0.5) return 'volume_down';
        return 'volume_up';
    };

    return (
        <div 
            className="relative flex items-center"
            onMouseEnter={() => setShowSlider(true)}
            onMouseLeave={() => setShowSlider(false)}
        >
            <button onClick={onMuteToggle} className="p-2">
                <span className="material-symbols-outlined">{getVolumeIcon()}</span>
            </button>
            <div className={`transition-all duration-300 ease-in-out origin-left ${showSlider ? 'w-24 scale-x-100 opacity-100' : 'w-0 scale-x-0 opacity-0'}`}>
                 <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => onVolumeChange(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer range-slider"
                />
            </div>
        </div>
    );
};

const CustomVideoControls: React.FC<CustomControlsProps> = ({
    isVisible, isPlaying, onPlayPause, volume, isMuted, onVolumeChange, onMuteToggle,
    currentTime, duration, onSeek, isFullscreen, onFullscreenToggle, isCastAvailable, onCast,
    channelName, programmeTitle, areSubtitlesAvailable, subtitlesEnabled, onToggleSubtitles
}) => {
    const seekBarRef = useRef<HTMLInputElement>(null);
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className={`absolute inset-0 text-white transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {/* Gradient overlay */}
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent"></div>
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent"></div>

            {/* Top Controls */}
            <div className="absolute top-0 left-0 right-0 p-4">
                <h2 className="text-xl font-bold">{channelName}</h2>
                <p className="text-md">{programmeTitle}</p>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                {/* Seek Bar */}
                <div className="w-full group">
                    <input
                        ref={seekBarRef}
                        type="range"
                        min="0"
                        max={duration || 1}
                        value={currentTime}
                        onChange={(e) => onSeek(Number(e.target.value))}
                        className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-red-500"
                        style={{ backgroundSize: `${progress}% 100%` }}
                    />
                </div>

                {/* Main Controls Row */}
                <div className="flex items-center justify-between">
                    {/* Left Controls */}
                    <div className="flex items-center space-x-4">
                        <button onClick={onPlayPause} className="focus:outline-none">
                            {isPlaying ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            )}
                        </button>
                        <VolumeControl volume={volume} isMuted={isMuted} onVolumeChange={onVolumeChange} onMuteToggle={onMuteToggle} />
                        <div className="text-sm">{formatTime(currentTime)} / {formatTime(duration)}</div>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center space-x-4">
                        {areSubtitlesAvailable && (
                            <button onClick={onToggleSubtitles} className={`focus:outline-none ${subtitlesEnabled ? 'text-red-500' : 'text-white'}`}>
                                <SubtitlesIcon />
                            </button>
                        )}
                        {isCastAvailable && (
                            <button onClick={onCast} className="focus:outline-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M3 18.364V12a1 1 0 011-1h1" /></svg>
                            </button>
                        )}
                        <button onClick={onFullscreenToggle} className="focus:outline-none">
                            {isFullscreen ? <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1v4m0 0h-4m4 0l-5-5M4 16v4m0 0h4m-4 0l5-5m11 1v-4m0 0h-4m4 0l-5 5" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m7 7l5 5m0 0v-4m0 4h-4" /></svg>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomVideoControls;