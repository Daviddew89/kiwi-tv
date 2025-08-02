import React from 'react';

interface ScheduleTimelineProps {
    pixelsPerHour: number;
    scheduleStartTime: Date;
    nowHourIndex: number;
}

const ScheduleTimeline: React.FC<ScheduleTimelineProps> = ({ pixelsPerHour, scheduleStartTime, nowHourIndex }) => {
    const hoursInAWeek = 24 * 7;
    const hours = Array.from({ length: hoursInAWeek + 1 }, (_, i) => i); // Add one extra hour to ensure the last block fits

    // We need a stable reference to the start time's day to compare against
    let lastDay = -1; // Use -1 to ensure the first day always gets a label

    return (
        <div className="sticky left-0 bg-app-bg z-10 w-24 flex-shrink-0">
            <div className="h-24 sticky top-0 bg-app-bg z-20 border-b border-r border-app-outline flex items-center justify-center">
                <span className="font-bold text-app-on-surface">Time</span>
            </div>
            <div className="relative">
                {hours.map(hourIndex => {
                    const currentDate = new Date(scheduleStartTime.getTime() + hourIndex * 60 * 60 * 1000);
                    const currentDayNum = currentDate.getDay();

                    let showDayLabel = false;
                    if (currentDayNum !== lastDay) {
                        showDayLabel = true;
                        lastDay = currentDayNum;
                    }

                    return (
                        <div 
                            key={hourIndex}
                            className="h-[120px] relative border-r border-b border-white/10 text-right pr-2"
                            style={{ height: `${pixelsPerHour}px` }}
                        >
                            {showDayLabel && (
                                <div className="absolute -top-3 left-0 w-full text-center z-10">
                                    <span className="bg-app-surface-variant backdrop-blur-sm border border-app-outline text-white px-3 py-1 rounded-full text-sm font-bold">
                                        {currentDate.toLocaleDateString('en-NZ', { weekday: 'long' })}
                                    </span>
                                </div>
                            )}
                             <span className={`text-sm ${hourIndex === nowHourIndex ? 'text-primary-red-ochre font-bold' : 'text-white/60'}`}>
                                {currentDate.toLocaleTimeString('en-NZ', { hour: 'numeric', hour12: true })}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ScheduleTimeline;