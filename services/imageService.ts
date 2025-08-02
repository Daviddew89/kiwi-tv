import { Programme } from '../types';
import { resilientFetch } from './tvService';

interface TvMazeShowSearch {
  show: {
    id: number;
    name: string; // Add name to show for logging
    image?: {
      original: string;
      medium: string;
    };
  };
}

interface TvMazeImage {
    id: number;
    type: 'banner' | 'poster' | 'background' | 'typography';
    main: boolean;
    resolutions: {
        original: { url: string };
        medium?: { url: string };
    };
}

interface ShowImages {
    poster: string | null;
    banner: string | null;
}

// --- Start of Persistent Cache Logic ---
interface CachedImageItem {
    timestamp: number;
    data: ShowImages | null;
}

const CACHE_KEY = 'tvmazeImageCache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Retrieves the image cache from localStorage, filtering out expired entries.
 * @returns A Map containing non-expired cache entries.
 */
const getCache = (): Map<string, CachedImageItem> => {
    try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
            const parsedMap = new Map<string, CachedImageItem>(JSON.parse(cachedData));
            const now = Date.now();
            
            // Clean up expired entries upon reading
            for (const [key, value] of parsedMap.entries()) {
                if (now - value.timestamp > CACHE_DURATION) {
                    parsedMap.delete(key);
                }
            }
            return parsedMap;
        }
    } catch (e) {
        console.error("Failed to read or parse cache from localStorage", e);
    }
    return new Map();
};

/**
 * Writes the image cache to localStorage.
 * @param cache The Map object to store.
 */
const setCache = (cache: Map<string, CachedImageItem>): void => {
    try {
        // Convert Map to an array of [key, value] pairs for JSON serialization
        localStorage.setItem(CACHE_KEY, JSON.stringify(Array.from(cache.entries())));
    } catch (e) {
        console.error("Failed to write to localStorage", e);
    }
};
// --- End of Persistent Cache Logic ---

/**
 * Cleans a TV show title to improve API search results.
 * Removes common EPG additions like (YYYY), (Premiere), etc.
 * @param title The original programme title.
 * @returns A cleaned title.
 */
const cleanTitleForSearch = (title: string): string => {
    // Removes (YYYY), (Premiere), (New), (Final), (Repeat), etc. and trims whitespace.
    return title
        .replace(/\s*\(\d{4}\)\s*$/, '') // (2023)
        .replace(/\s*\((Premiere|New|Final|Repeat)\)\s*$/i, '') // (Premiere)
        .trim();
};


/**
 * Fetches poster and banner images from the TVmaze API.
 * @param query The title of the TV show.
 * @returns A promise that resolves to an object with poster and banner URLs.
 */
const fetchFromTvMaze = async (query: string): Promise<ShowImages | null> => {
     try {
        const searchUrl = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`;
        const searchResponse = await resilientFetch(searchUrl);
        
        const searchData: TvMazeShowSearch[] = await searchResponse.json();
        const show = searchData?.[0]?.show;
        if (!show) {
            // console.log(`[ImageService] No show found on TVmaze for "${query}".`);
            return null;
        }

        const showId = show.id;
        const defaultPoster = show.image?.original || show.image?.medium || null;
        const imagesResult: ShowImages = { poster: defaultPoster, banner: null };

        // Now fetch specific images for the show ID to find a banner
        try {
            const imagesUrl = `https://api.tvmaze.com/shows/${showId}/images`;
            const imagesResponse = await resilientFetch(imagesUrl);
            const imagesData: TvMazeImage[] = await imagesResponse.json();
            
            const bannerImage = imagesData.find(img => img.type === 'banner');
            const posterImage = imagesData.find(img => img.type === 'poster' && img.main);

            if (bannerImage) {
                imagesResult.banner = bannerImage.resolutions.original.url;
            }
            if (posterImage) {
                 imagesResult.poster = posterImage.resolutions.original.url;
            }
        } catch (imgError) {
            console.warn(`[ImageService] Could not fetch extra images for "${query}" (ID: ${showId}), using default poster.`, imgError);
        }
        
        return imagesResult;
    } catch (error) {
        console.error(`[ImageService] Failed to fetch image for "${query}" from TVmaze:`, error);
        return null;
    }
};

/**
 * Fetches a show's image from the TVmaze API.
 * Returns a cached URL if available.
 * @param originalQuery The original title of the TV show from the EPG.
 * @returns A promise that resolves to an object containing poster and banner URLs, or null if not found.
 */
export const fetchShowImage = async (originalQuery: string): Promise<ShowImages | null> => {
    if (!originalQuery) {
        return null;
    }

    const cache = getCache();
    const cachedItem = cache.get(originalQuery);

    if (cachedItem) {
        // console.log(`[ImageService] Cache HIT for "${originalQuery}"`);
        return cachedItem.data;
    }

    // Clean the title for a better search experience
    const cleanedQuery = cleanTitleForSearch(originalQuery);
    
    // Fetch images from TVmaze using the cleaned title.
    const images = await fetchFromTvMaze(cleanedQuery);

    // Cache the result (even if null) against the original query to prevent repeated lookups for the same programme.
    cache.set(originalQuery, { timestamp: Date.now(), data: images });
    setCache(cache);

    return images;
};