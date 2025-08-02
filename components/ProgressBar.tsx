import React, { useState, useEffect } from 'react';

interface ProgressBarProps {
    start: Date;
    stop: Date;
}

const calculateProgress = (start: Date, stop: Date): number => {
    const now = Date.now();
    const startTime = start.getTime();
    const stopTime = stop.getTime();
    
    if (now < startTime) return 0;
    if (now > stopTime) return 100;

    const totalDuration = stopTime - startTime;
    const elapsed = now - startTime;

    return (elapsed / totalDuration) * 100;
};

const ProgressBar: React.FC<ProgressBarProps> = ({ start, stop }) => {
    const [progress, setProgress] = useState(() => calculateProgress(start, stop));

    useEffect(() => {
        setProgress(calculateProgress(start, stop)); // Recalculate when props change

        const interval = setInterval(() => {
            setProgress(calculateProgress(start, stop));
        }, 30000); // Update every 30 seconds

        return () => clearInterval(interval);
    }, [start, stop]);

    return (
        <div className="w-full bg-black/30 rounded-full h-2.5 overflow-hidden border border-white/10">
            <div 
                className="bg-primary-red-ochre h-full rounded-full transition-all duration-500 ease-linear shadow-glow-primary"
                style={{ 
                    width: `${progress}%`,
                }}
            ></div>
        </div>
    );
};

export default ProgressBar;