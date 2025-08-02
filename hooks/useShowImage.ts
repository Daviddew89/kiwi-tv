import { useState, useEffect } from 'react';
import { fetchShowImage } from '../services/imageService';
import { Programme, Channel } from '../types';

/**
 * A set of channel IDs for which we should always ignore the EPG icon
 * and fetch from the TVmaze API instead, due to known data issues.
 */
const FORCE_TVMAZE_CHANNELS = new Set([
    'mjh-discovery-ptmb', // MythBusters
    'mjh-discovery-ptgn', // The Graham Norton Show
]);


/**
 * Processes an EPG icon URL to fix common issues and validate its format.
 * @param url The raw icon URL from the EPG.
 * @returns A processed, valid image URL or undefined if the URL is invalid.
 */
const processEpgIconUrl = (url: string | undefined): string | undefined => {
    if (!url) return undefined;

    let processedUrl = url;

    // 1. Fix mixed content issues by ensuring HTTPS
    if (processedUrl.startsWith('http:')) {
        processedUrl = processedUrl.replace('http:', 'https:');
    }

    // 2. Fix placeholder dimensions in specific CDN URLs
    if (processedUrl.includes('cdn.fullscreen.nz')) {
        // Replace placeholders with reasonable dimensions for a poster (2:3 aspect ratio)
        processedUrl = processedUrl
            .replace('[height]', '450')
            .replace('[width]', '300');
    }

    // 3. Final validation: Ensure the result is a valid, absolute HTTP/HTTPS URL
    // that also looks like a direct link to an image file.
    try {
        const parsed = new URL(processedUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return undefined; // Not an HTTP/S URL
        }

        // NEW, STRICTER VALIDATION:
        // A heuristic to avoid valid-looking URLs that aren't direct image links.
        // We check if the URL path ends with a common image extension. This helps
        // filter out links to web pages or invalid API endpoints from the EPG.
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const pathname = parsed.pathname.toLowerCase();

        if (!imageExtensions.some(ext => pathname.endsWith(ext))) {
            // This URL is technically valid but doesn't look like a direct image link.
            // It's safer to reject it and fall back to the more reliable TVmaze API.
            return undefined;
        }

    } catch (e) {
        // new URL() failed, so it's not a valid URL format.
        return undefined;
    }

    return processedUrl;
};

/**
 * A custom hook to fetch a TV show's poster and banner images.
 * It prioritizes the icon provided in the EPG data and falls back to TVmaze.
 * @param programme The programme object which may contain an icon url.
 * @param channel The channel the programme is on. Used to force fallbacks for problematic channels.
 * @returns An object containing the posterUrl, bannerUrl, and a loading state.
 */
export const useProgramImage = (programme: Programme | null | undefined, channel: Channel | null | undefined) => {
    const [posterUrl, setPosterUrl] = useState<string | null>(null);
    const [bannerUrl, setBannerUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        let isMounted = true;
        
        const getImage = async () => {
            if (!programme?.title) {
                setPosterUrl(null);
                setBannerUrl(null);
                return;
            }
            
            setLoading(true);

            const forceTvMaze = channel && FORCE_TVMAZE_CHANNELS.has(channel.id);
            const epgIcon = processEpgIconUrl(programme.icon);

            if (epgIcon && !forceTvMaze) {
                // If EPG provides a valid icon, and we are not forcing a fallback, use it.
                if (isMounted) {
                    setPosterUrl(epgIcon);
                    setBannerUrl(null); // No external call, so no banner
                    setLoading(false);
                }
            } else {
                // Fetch from external source if EPG icon is missing, invalid, or its channel is on the force-fallback list.
                const images = await fetchShowImage(programme.title);
                if (isMounted) {
                    setPosterUrl(images?.poster || null);
                    setBannerUrl(images?.banner || null);
                    setLoading(false);
                }
            }
        };

        // Debounce the call slightly to prevent flashes on rapid hover
        const handler = setTimeout(() => {
            getImage();
        }, 100);

        return () => {
            isMounted = false;
            clearTimeout(handler);
        };
    }, [programme, channel]); // Rerun when the programme or channel object changes

    return { posterUrl, bannerUrl, loading };
};