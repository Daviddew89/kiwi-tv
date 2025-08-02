import React, { useMemo } from 'react';
import { Channel, Programme } from '../types';
import { useProgramImage } from '../hooks/useShowImage';

interface DeckChannelCardProps {
    channel: Channel;
    programmes: Programme[] | undefined;
    onSelect: () => void;
    isActive: boolean;
}

const findCurrentProgramme = (programmes: Programme[] | undefined): Programme | null => {
    if (!programmes || programmes.length === 0) return null;
    const now = new Date();
    return programmes.find(p => now >= p.start && now < p.stop) || null;
};

const DeckChannelCard: React.FC<DeckChannelCardProps> = ({ channel, programmes, onSelect, isActive }) => {
    const currentProgramme = useMemo(() => findCurrentProgramme(programmes), [programmes]);
    const { posterUrl } = useProgramImage(currentProgramme, channel);

    const containerClasses = `
        flex flex-col items-center gap-3
        transition-all duration-500 ease-in-out
        cursor-pointer
        ${isActive ? 'scale-105 opacity-100' : 'scale-90 opacity-60'}
    `;

    const cardClasses = `
        w-[45vw] sm:w-[35vw] md:w-[22vw] lg:w-[18vw] flex-shrink-0 
        aspect-[2/3] rounded-lg
        snap-center overflow-hidden
        shadow-2xl shadow-black/50
        relative bg-app-surface-variant border
        transition-all duration-500 ease-in-out
        ${isActive ? 'border-primary-red-ochre shadow-glow-primary' : 'border-transparent'}
    `;
    
    const nameClasses = `
        font-medium text-sm text-center truncate w-full px-2
        transition-colors duration-300
        ${isActive ? 'text-white' : 'text-gray-500'}
    `;

    return (
        <div
            id={`channel-card-${channel.id}`}
            onClick={onSelect}
            className={containerClasses}
            role="option"
            aria-selected={isActive}
            aria-label={`Select channel ${channel.name}, currently playing ${currentProgramme?.title || 'Live'}`}
            data-channel-id={channel.id}
        >
            <div 
                className={cardClasses}
            >
                {/* Background Image */}
                <img 
                    src={posterUrl || channel.logo}
                    alt={currentProgramme?.title || channel.name}
                    className={`w-full h-full transition-opacity duration-500 ${posterUrl ? 'object-cover' : 'object-contain p-8'}`}
                    loading="lazy"
                />
                {/* Gradient Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <img src={channel.logo} alt="" className="h-10 max-w-[100px] object-contain drop-shadow-lg mb-2" />
                    {currentProgramme ? (
                        <p className="font-semibold truncate text-sm drop-shadow-md" title={currentProgramme.title}>
                            {currentProgramme.title}
                        </p>
                    ) : (
                        <p className="text-sm text-gray-300">Live</p>
                    )}
                </div>
                {currentProgramme?.isNew && (
                    <div 
                        className="absolute top-2 right-2 bg-primary-red-ochre text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg"
                        title="This is a new episode or premiere"
                    >
                        NEW
                    </div>
                )}
            </div>
            <p className={nameClasses}>{channel.name}</p>
        </div>
    );
};

export default DeckChannelCard;