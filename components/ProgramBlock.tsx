import React from 'react';
import { Programme } from '../types';
import RatingBadge from './RatingBadge';

interface ProgramBlockProps {
    programme: Programme;
    pixelsPerHour: number;
    scheduleStartTime: Date;
    onSelect: () => void;
}

const MIN_HEIGHT = 60; // Enforce a minimum height for visibility

const getCategoryColor = (category?: string): string => {
    if (!category) return 'bg-slate-800/60 border-slate-700 hover:bg-slate-700/80';
    
    const cat = category.toLowerCase();
    if (cat.includes('movie')) return 'bg-blue-900/50 border-blue-700 hover:bg-blue-800/70';
    if (cat.includes('sport')) return 'bg-green-900/50 border-green-700 hover:bg-green-800/70';
    if (cat.includes('news')) return 'bg-amber-900/50 border-amber-700 hover:bg-amber-800/70';
    if (cat.includes('drama')) return 'bg-purple-900/50 border-purple-700 hover:bg-purple-800/70';
    if (cat.includes('children') || cat.includes('kids')) return 'bg-pink-900/50 border-pink-700 hover:bg-pink-800/70';
    
    return 'bg-slate-800/50 border-slate-700 hover:bg-slate-700/70';
}

const ProgramBlock: React.FC<ProgramBlockProps> = ({ programme, pixelsPerHour, scheduleStartTime, onSelect }) => {
    
    const startTimeMs = programme.start.getTime();
    const stopTimeMs = programme.stop.getTime();
    const scheduleStartMs = scheduleStartTime.getTime();

    const effectiveStartMs = Math.max(startTimeMs, scheduleStartMs);

    const startOffsetMs = effectiveStartMs - scheduleStartMs;
    const top = (startOffsetMs / (1000 * 60 * 60)) * pixelsPerHour;

    const durationMs = stopTimeMs - startTimeMs;
    const calculatedHeight = (durationMs / (1000 * 60 * 60)) * pixelsPerHour;
    
    const height = Math.max(calculatedHeight, MIN_HEIGHT);

    if (stopTimeMs < scheduleStartMs) {
        return null;
    }

    const showDetails = height > 40;
    const bgColor = getCategoryColor(programme.categories?.[0]);

    return (
        <div
            onClick={onSelect}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
            className={`absolute w-full p-2 rounded-lg border text-white transition-colors duration-200 overflow-hidden ${bgColor} cursor-pointer hover:z-10`}
            style={{
                top: `${top}px`,
                height: `${height - 2}px`,
                left: '2px',
                width: 'calc(100% - 4px)'
            }}
            title={`${programme.title}\n${programme.description}`}
        >
            <p className="font-bold text-sm leading-tight text-ellipsis-2-lines">{programme.title}</p>
            {showDetails && (
                <div className="mt-1 space-y-1">
                    <p className="text-xs text-white/70 text-ellipsis-3-lines">{programme.description}</p>
                    <div className="flex items-center gap-2 pt-1">
                        {programme.isNew && (
                            <span className="flex-shrink-0 bg-primary-red-ochre text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                NEW
                            </span>
                        )}
                        {programme.rating && <RatingBadge rating={programme.rating} />}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProgramBlock;