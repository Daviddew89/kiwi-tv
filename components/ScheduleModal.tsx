import React, { useEffect, useRef, useMemo } from 'react';
import { Channel, EpgData, Programme } from '../types';
import ScheduleTimeline from './ScheduleTimeline';
import ScheduleGrid from './ScheduleGrid';

interface ScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    channels: Channel[];
    epg: EpgData;
    onProgrammeSelect: (programme: Programme, channel: Channel) => void;
}

const PIXELS_PER_HOUR = 120;
const PAST_HOURS_TO_SHOW = 2;

const ScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose, channels, epg, onProgrammeSelect }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const { scheduleStartTime, nowLineOffset } = useMemo(() => {
        if (!isOpen) return { scheduleStartTime: null, nowLineOffset: 0 };
        
        const now = new Date();
        const startTime = new Date(now.getTime() - PAST_HOURS_TO_SHOW * 60 * 60 * 1000);
        const offset = PAST_HOURS_TO_SHOW * PIXELS_PER_HOUR + (now.getMinutes() / 60) * PIXELS_PER_HOUR;

        return { scheduleStartTime: startTime, nowLineOffset: offset };
    }, [isOpen]);


    useEffect(() => {
        if (isOpen && scrollContainerRef.current && nowLineOffset > 0) {
            const timer = setTimeout(() => {
                const scrollContainer = scrollContainerRef.current;
                if (scrollContainer) {
                    const containerHeight = scrollContainer.clientHeight;
                    const centeredScrollTop = nowLineOffset - (containerHeight / 2);
                    
                    scrollContainer.scrollTo({
                        top: centeredScrollTop,
                        behavior: 'instant' 
                    });
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen, nowLineOffset]);


    if (!isOpen || !scheduleStartTime) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-30 flex flex-col p-4 sm:p-6 lg:p-8 animate-fade-in"
            role="dialog"
            aria-modal="true"
        >
            <div className="flex-shrink-0 flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white drop-shadow-lg">7-Day Schedule</h2>
                <button
                    onClick={onClose}
                    className="h-10 w-10 bg-app-surface rounded-full text-app-on-surface text-2xl font-bold hover:bg-primary-red-ochre hover:text-white transition-colors flex items-center justify-center shadow-lg border border-app-outline"
                    aria-label="Close schedule"
                >
                    &times;
                </button>
            </div>
            <div 
                className="flex-grow bg-app-bg border border-app-outline rounded-lg shadow-2xl shadow-black/50 overflow-hidden flex relative"
            >
                <div 
                    ref={scrollContainerRef}
                    className="flex-grow overflow-auto custom-scrollbar"
                >
                    <div className="relative flex">
                        <ScheduleTimeline 
                            pixelsPerHour={PIXELS_PER_HOUR} 
                            scheduleStartTime={scheduleStartTime} 
                            nowHourIndex={PAST_HOURS_TO_SHOW}
                        />
                        <ScheduleGrid 
                            channels={channels}
                            epg={epg}
                            pixelsPerHour={PIXELS_PER_HOUR}
                            scheduleStartTime={scheduleStartTime}
                            nowLineOffset={nowLineOffset}
                            onProgrammeSelect={onProgrammeSelect}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScheduleModal;