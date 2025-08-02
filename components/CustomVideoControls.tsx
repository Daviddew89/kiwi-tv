import React, { useState, useRef } from 'react';
import { formatTime } from '../utils/formatTime';

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
    channelName, programmeTitle
}) => {
    const seekBarRef = useRef<HTMLInputElement>(null);
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div 
            className={`absolute inset-0 text-white transition-opacity duration-300 flex flex-col justify-between pointer-events-none ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        >
            {/* Top Info Bar */}
            <div className="p-4 bg-gradient-to-b from-black/60 to-transparent">
                <h3 className="text-xl font-bold drop-shadow-lg">{channelName}</h3>
                <p className="text-sm text-gray-200 drop-shadow-lg">{programmeTitle}</p>
            </div>

            {/* Bottom Controls */}
            <div className="p-2 md:p-4 bg-gradient-to-t from-black/60 to-transparent pointer-events-auto">
                {/* Seek Bar */}
                <div className="w-full group mb-2">
                    <input
                        ref={seekBarRef}
                        type="range"
                        min="0"
                        max={duration || 1}
                        value={currentTime}
                        onChange={(e) => onSeek(Number(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer range-slider group-hover:h-2 transition-all"
                        style={{ '--progress': `${progress}%` } as React.CSSProperties}
                    />
                </div>
                
                {/* Main Controls Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 md:gap-3">
                        <button onClick={onPlayPause} className="p-2">
                            <span className="material-symbols-outlined text-4xl">{isPlaying ? 'pause' : 'play_arrow'}</span>
                        </button>
                        <VolumeControl volume={volume} isMuted={isMuted} onVolumeChange={onVolumeChange} onMuteToggle={onMuteToggle} />
                        <div className="text-xs md:text-sm font-mono ml-2">
                            <span>{formatTime(currentTime)}</span>
                            <span className="text-gray-400"> / {formatTime(duration)}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1 md:gap-3">
                        {isCastAvailable && (
                            <button onClick={onCast} title="Cast to device" className="p-2">
                                <span className="material-symbols-outlined">cast</span>
                            </button>
                        )}
                        <button onClick={onFullscreenToggle} className="p-2">
                             <span className="material-symbols-outlined">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomVideoControls;