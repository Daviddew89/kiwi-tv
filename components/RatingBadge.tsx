import React from 'react';

interface RatingBadgeProps {
    rating: string;
}

const getRatingClasses = (rating: string): string => {
    const upperRating = rating.toUpperCase().replace(/\s/g, ''); // Normalize rating
    
    // G, PG - Cool tones
    if (upperRating.startsWith('G')) return 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_6px_var(--color-emerald-500)]';
    if (upperRating.startsWith('PG')) return 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-[0_0_6px_var(--color-sky-500)]';
    
    // M - Warning tone
    if (upperRating.startsWith('M')) return 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_6px_var(--color-amber-500)]';
   
    // R ratings - Hot tones
    if (upperRating.includes('13')) return 'bg-orange-600/20 border-orange-500 text-orange-400 shadow-[0_0_6px_var(--color-orange-500)]';
    if (upperRating.includes('15')) return 'bg-rose-600/20 border-rose-500 text-rose-400 shadow-[0_0_6px_var(--color-rose-500)]';
    if (upperRating.includes('16')) return 'bg-red-600/20 border-red-500 text-red-400 shadow-[0_0_6px_var(--color-red-500)]';
    if (upperRating.includes('18')) return 'bg-purple-600/20 border-purple-500 text-purple-400 shadow-[0_0_6px_var(--color-purple-500)]';
    if (upperRating === 'AO') return 'bg-fuchsia-600/20 border-fuchsia-500 text-fuchsia-400 shadow-[0_0_6px_var(--color-fuchsia-500)]';

    return 'bg-gray-600/20 border-gray-500 text-gray-300'; // Default
};


const RatingBadge: React.FC<RatingBadgeProps> = ({ rating }) => {
    if (!rating || rating.toLowerCase() === 'unrated') return null;

    const ratingCode = rating.split(' ')[0].toUpperCase();
    const classes = getRatingClasses(ratingCode);

    return (
        <div
            className={`flex-shrink-0 px-2.5 py-1 text-xs font-bold rounded-md border backdrop-blur-sm ${classes}`}
            title={`Classification: ${rating}`}
            aria-label={`Classification: ${rating}`}
        >
            {ratingCode}
        </div>
    );
};

export default RatingBadge;