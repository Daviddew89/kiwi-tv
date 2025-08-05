import { Channel, EpgData, Programme } from '../types';

// --- Start of Resilient Fetch Logic ---

/**
 * A list of public CORS proxies. They will be tried in order.
 * The target URL will be appended to the proxy URL.
 */
const PROXY_URLS = [
    'https://corsproxy.io/?',
    'https://cors.eu.org/',
    'https://thingproxy.freeboard.io/fetch/',
];

/**
 * A wrapper for fetch that adds a timeout.
 * @param resource The URL to fetch.
 * @param options Fetch options, including an optional `timeout` in milliseconds.
 * @returns A Promise that resolves to a Response.
 */
const fetchWithTimeout = async (resource: RequestInfo, options: RequestInit & { timeout?: number } = {}): Promise<Response> => {
    const { timeout = 15000 } = options; // Default timeout: 15 seconds
  
    const controller = new AbortController();
    const id = setTimeout(() => {
        console.warn(`Request timed out after ${timeout}ms: ${resource}`);
        controller.abort();
    }, timeout);
  
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal  
    });
  
    clearTimeout(id);
  
    return response;
};

/**
 * Tries to fetch a resource using a series of CORS proxies until one succeeds.
 * Also tries a direct connection as a fallback.
 * @param url The target resource URL.
 * @param options Fetch options.
 * @returns A Promise that resolves to a Response.
 * @throws An error if all attempts fail.
 */
export const resilientFetch = async (url: string, options: RequestInit & { timeout?: number } = {}) => {
    let lastError: Error | null = null;

    for (const proxy of PROXY_URLS) {
        const proxyUrl = `${proxy}${url}`;
        try {
            const response = await fetchWithTimeout(proxyUrl, options);
            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status} for ${proxyUrl}`);
            }
            return response;
        } catch (error) {
            console.warn(`[resilientFetch] Proxy failed: ${proxy}`, error);
            lastError = error instanceof Error ? error : new Error(String(error));
        }
    }
    
    // As a final fallback, try fetching without a proxy. This might work if the target API has CORS enabled.
    try {
        const response = await fetchWithTimeout(url, options);
        if (!response.ok) {
            throw new Error(`Direct request failed with status ${response.status}`);
        }
        return response;
    } catch (error) {
        console.warn(`[resilientFetch] Direct connection failed.`, error);
        if (lastError) {
            const directErrorMessage = error instanceof Error ? error.message : String(error);
            lastError = new Error(`All proxies failed. Last error: ${lastError.message}. Direct connection also failed with message: "${directErrorMessage}"`);
        } else {
             lastError = error instanceof Error ? error : new Error(String(error));
        }
    }

    throw lastError || new Error(`Failed to fetch ${url} after trying all proxies and a direct connection.`);
};

// --- End of Resilient Fetch Logic ---

const CHANNELS_URL = 'https://i.mjh.nz/nz/kodi-tv.m3u8';
const EPG_URL = 'https://i.mjh.nz/nz/epg.xml';

const PRIORITY_CHANNELS = [
    'TVNZ 1',
    'TVNZ 2',
    'Three',
    'Bravo',
    'Sky Open+1',
    'DUKE',
    'eden',
    'RUSH',
    'Sky Open',
    'HGTV',
    'Al Jazeera',
    'Trackside 1',
    'Trackside 2',
    'Shine TV',
    'Firstlight',
    'Hope Channel',
    'Parliament TV',
    'JuiceTV',
    'Wairarapa TV',
    'ThreePlus1',
    'Bravo PLUS 1',
    'eden+1',
    'Whakaata Māori',
    'Te Reo',
];

const parseEpgDate = (dateStr: string): Date | null => {
  // dateStr format is "20240728000000 +1200"
  if (dateStr.length < 20) {
    console.error("Invalid EPG date format:", dateStr);
    return null;
  }
  try {
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    const hour = dateStr.slice(8, 10);
    const minute = dateStr.slice(10, 12);
    const second = dateStr.slice(12, 14);
    const timezone = dateStr.slice(15); // e.g. "+1200"
    
    // Ensure timezone has a colon for ISO 8601 compatibility
    const formattedTimezone = `${timezone.slice(0, 3)}:${timezone.slice(3, 5)}`; // e.g. "+12:00"

    const isoDateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}${formattedTimezone}`;
    return new Date(isoDateStr);
  } catch (e) {
    console.error("Failed to parse date:", dateStr, e);
    return null;
  }
};

const categorizeChannel = (channelData: any): 'New Zealand' | 'International' | 'Religious' | 'Sports' | 'News' => {
    const name = channelData.name || '';
    const network = channelData.network || '';

    const sportsKeywords = ['Sport', 'Trackside', 'Redbull', 'SailGP', 'MotoGP', 'Sky Open'];
    if (sportsKeywords.some(keyword => name.includes(keyword))) {
        return 'Sports';
    }

    const newsKeywords = ['News', 'Al Jazeera', 'CNN', 'DW English', 'Parliament TV'];
    if (newsKeywords.some(keyword => name.includes(keyword))) {
        return 'News';
    }

    const religiousKeywords = ['Shine', 'Hope Channel', 'Firstlight'];
    if (religiousKeywords.some(keyword => name.includes(keyword))) {
        return 'Religious';
    }

    const nzNetworks = ['TVNZ', 'Discovery', 'Māori'];
    if (nzNetworks.includes(network)) {
        return 'New Zealand';
    }
    
    const nzChannelNames = ['Whakaata Māori', 'Te Reo', 'Three', 'eden', 'DUKE', 'RUSH', 'Bravo', 'Wairarapa TV'];
    if (nzChannelNames.some(nzName => name.startsWith(nzName))) {
        return 'New Zealand';
    }

    return 'International';
};

export const fetchChannels = async (): Promise<Channel[]> => {
    const response = await resilientFetch(CHANNELS_URL);
    const m3uData = await response.text();

    const lines = m3uData.split('\n').filter(line => line.trim() !== '' && !line.startsWith('#EXTM3U'));
    const channels: Channel[] = [];

    for (let i = 0; i < lines.length; i += 2) {
        const infoLine = lines[i];
        const urlLine = lines[i + 1];

        if (!infoLine || !urlLine || !infoLine.startsWith('#EXTINF')) {
            continue;
        }

        const idMatch = infoLine.match(/channel-id="([^"]*)"/);
        const epgIdMatch = infoLine.match(/tvg-id="([^"]*)"/);
        const logoMatch = infoLine.match(/tvg-logo="([^"]*)"/);
        const nameMatch = infoLine.match(/,(.*)$/);

        const id = idMatch ? idMatch[1] : '';
        const epg_id = epgIdMatch ? epgIdMatch[1] : '';
        const logo = logoMatch ? logoMatch[1] : '';
        const name = nameMatch ? nameMatch[1].trim() : '';

        if (!id || !name || !epg_id) {
            continue;
        }

        const urlParts = urlLine.split('|');
        let url = decodeURIComponent(urlParts[0]);

        // Ensure URL is absolute
        if (!url.startsWith('http')) {
            const baseUrl = new URL(CHANNELS_URL);
            url = new URL(url, baseUrl).toString();
        }

        const headers: { [key: string]: string } = {};
        if (urlParts.length > 1) {
            const userAgentPart = urlParts[1];
            if (userAgentPart.startsWith('user-agent=')) {
                headers['User-Agent'] = decodeURIComponent(userAgentPart.substring('user-agent='.length));
            }
        }
        
        const channelData = {
            id,
            name,
            logo,
            url,
            epg_id,
            headers: Object.keys(headers).length > 0 ? headers : undefined,
        };

        const category = categorizeChannel({ name });

        const channel: Channel = {
            ...channelData,
            category,
            needsProxy: true,
            url: `/stream-proxy?url=${encodeURIComponent(url)}${headers['User-Agent'] ? `&User-Agent=${encodeURIComponent(headers['User-Agent'])}` : ''}`
        };

        channels.push(channel);
    }

    // Sort channels, with priority channels first
    channels.sort((a, b) => {
        const aPriority = PRIORITY_CHANNELS.indexOf(a.name);
        const bPriority = PRIORITY_CHANNELS.indexOf(b.name);

        if (aPriority !== -1 && bPriority !== -1) {
            return aPriority - bPriority;
        }
        if (aPriority !== -1) {
            return -1;
        }
        if (bPriority !== -1) {
            return 1;
        }
        return a.name.localeCompare(b.name);
    });

    return channels;
};

export const fetchEpg = async (): Promise<EpgData> => {
    const response = await resilientFetch(EPG_URL, { timeout: 20000 }); // EPG is large, give more time
    const xmlString = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    
    if (xmlDoc.getElementsByTagName("parsererror").length) {
        console.error("Failed to parse EPG XML. Raw response:", xmlString);
        throw new Error("Could not read EPG data. The service might be returning an invalid format.");
    }
    
    const programmeNodes = xmlDoc.getElementsByTagName("programme");
    
    const epgData: EpgData = new Map();

    for (const node of Array.from(programmeNodes)) {
        const channelId = node.getAttribute("channel");
        const startStr = node.getAttribute("start");
        const stopStr = node.getAttribute("stop");
        
        if (!channelId || !startStr || !stopStr) continue;

        const start = parseEpgDate(startStr);
        const stop = parseEpgDate(stopStr);
        const title = node.getElementsByTagName("title")[0]?.textContent || 'No Title';
        const description = node.getElementsByTagName("desc")[0]?.textContent || 'No Description';
        
        if (!start || !stop) continue;

        // --- Start of New Data Extraction ---
        const ratingNode = node.getElementsByTagName("rating")[0];
        const rating = ratingNode?.getElementsByTagName("value")[0]?.textContent || undefined;
        
        const icon = node.getElementsByTagName("icon")[0]?.getAttribute("src") || undefined;
        const categories = Array.from(node.getElementsByTagName("category")).map(cat => cat.textContent || '').filter(Boolean);
        const date = node.getElementsByTagName("date")[0]?.textContent || undefined;
        const episodeNum = node.getElementsByTagName("sub-title")[0]?.textContent || undefined;
        const isNew = node.getElementsByTagName("new").length > 0;
        const actors = Array.from(node.getElementsByTagName("actor")).map(actor => actor.textContent || '').filter(Boolean);
        
        // --- Extended EPG Data ---
        const country = node.getElementsByTagName("country")[0]?.textContent || undefined;
        const videoQuality = node.getElementsByTagName("video")[0]?.getElementsByTagName("quality")[0]?.textContent || undefined;
        const audio = node.getElementsByTagName("audio")[0]?.getElementsByTagName("stereo")[0]?.textContent || undefined;
        const subtitlesNode = node.getElementsByTagName("subtitles")[0];
        const subtitles = subtitlesNode?.getElementsByTagName("language")[0]?.textContent || undefined;
        const starRatingNode = node.getElementsByTagName("star-rating")[0];
        const starRating = starRatingNode?.getElementsByTagName("value")[0]?.textContent || undefined;
        // --- End of New Data Extraction ---

        const programme: Programme = { 
            channelId, 
            start, 
            stop, 
            title, 
            description, 
            rating,
            icon,
            categories,
            date,
            episodeNum,
            isNew,
            actors,
            country,
            videoQuality,
            audio,
            subtitles,
            starRating,
        };

        if (!epgData.has(channelId)) {
            epgData.set(channelId, []);
        }
        epgData.get(channelId)?.push(programme);
    }
    
    // Sort programmes by start time
    for (const programmes of epgData.values()) {
        programmes.sort((a, b) => a.start.getTime() - b.start.getTime());
    }

    return epgData;
};