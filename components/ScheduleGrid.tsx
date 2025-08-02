import React from 'react';
import { Channel, EpgData, Programme } from '../types';
import ProgramBlock from './ProgramBlock';

interface ScheduleGridProps {
    channels: Channel[];
    epg: EpgData;
    pixelsPerHour: number;
    scheduleStartTime: Date;
    nowLineOffset: number;
    onProgrammeSelect: (programme: Programme, channel: Channel) => void;
}

const ScheduleGrid: React.FC<ScheduleGridProps> = ({ channels, epg, pixelsPerHour, scheduleStartTime, nowLineOffset, onProgrammeSelect }) => {
    const channelsWithEpg = channels.filter(channel => 
        epg.get(channel.epg_id)?.some(p => p.stop > scheduleStartTime)
    );

    return (
        <div className="flex-grow relative">
            <div className="sticky top-0 z-20 flex bg-app-bg">
                {channelsWithEpg.map(channel => (
                    <div 
                        key={channel.id} 
                        className="w-48 flex-shrink-0 h-24 border-b border-r border-app-outline flex items-center justify-center p-2"
                    >
                        <img 
                            src={channel.logo}
                            alt={`${channel.name} logo`}
                            className="max-h-full max-w-full object-contain"
                            loading="lazy"
                        />
                    </div>
                ))}
            </div>

            <div className="relative flex">
                {channelsWithEpg.map(channel => (
                    <div key={channel.id} className="w-48 flex-shrink-0 relative border-r border-white/10">
                        {epg.get(channel.epg_id)
                            ?.filter(programme => programme.stop > scheduleStartTime)
                            .map(programme => (
                                <ProgramBlock 
                                    key={programme.start.toISOString() + programme.title}
                                    programme={programme}
                                    pixelsPerHour={pixelsPerHour}
                                    scheduleStartTime={scheduleStartTime}
                                    onSelect={() => onProgrammeSelect(programme, channel)}
                                />
                            ))}
                    </div>
                ))}
                <div 
                    className="absolute left-0 w-full h-0.5 bg-primary-red-ochre shadow-glow-primary z-10"
                    style={{ top: `${nowLineOffset}px` }}
                    role="presentation"
                >
                    <div className="absolute -left-2 -top-1.5 h-3 w-3 rounded-full bg-primary-red-ochre border-2 border-white"></div>
                </div>
            </div>
        </div>
    );
};

export default ScheduleGrid;