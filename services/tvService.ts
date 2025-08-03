import { Channel, EpgData, Programme } from '../types';
import { debugLogToTerminal, errorLogToTerminal } from '../utils/debug';

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
 * Debug logging function for TV service
 */
const logDebug = (message: string, data?: any) => {
    const logMessage = `[TVService] ${message}`;
    if (data !== undefined) {
        console.log(logMessage, data);
        debugLogToTerminal(logMessage, data);
    } else {
        console.log(logMessage);
        debugLogToTerminal(logMessage);
    }
};

/**
 * A wrapper for fetch that adds a timeout.
 * @param resource The URL to fetch.
 * @param options Fetch options, including an optional `timeout` in milliseconds.
 * @returns A Promise that resolves to a Response.
 */
const fetchWithTimeout = async (resource: RequestInfo, options: RequestInit & { timeout?: number } = {}): Promise<Response> => {
    const { timeout = 15000 } = options; // Default timeout: 15 seconds
  
    logDebug(`Fetching with timeout (${timeout}ms): ${resource}`);
    
    const controller = new AbortController();
    const id = setTimeout(() => {
        logDebug(`Request timed out after ${timeout}ms: ${resource}`);
        controller.abort();
    }, timeout);
  
    try {
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal  
        });
        
        clearTimeout(id);
        logDebug(`Fetch successful: ${resource} (Status: ${response.status})`);
        return response;
    } catch (error) {
        clearTimeout(id);
        logDebug(`Fetch failed: ${resource}`, error);
        throw error;
    }
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
    logDebug(`=== RESILIENT FETCH START ===`);
    logDebug(`Target URL: ${url}`);
    logDebug(`Options:`, options);
    
    let lastError: Error | null = null;

    for (const proxy of PROXY_URLS) {
        const proxyUrl = `${proxy}${url}`;
        try {
            logDebug(`Trying proxy: ${proxy}`);
            const response = await fetchWithTimeout(proxyUrl, options);
            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status} for ${proxyUrl}`);
            }
            logDebug(`Proxy success: ${proxy}`);
            return response;
        } catch (error) {
            logDebug(`Proxy failed: ${proxy}`, error);
            lastError = error instanceof Error ? error : new Error(String(error));
        }
    }
    
    // As a final fallback, try fetching without a proxy. This might work if the target API has CORS enabled.
    try {
        logDebug(`All proxies failed. Trying direct connection to ${url}`);
        const response = await fetchWithTimeout(url, options);
        if (!response.ok) {
            throw new Error(`Direct request failed with status ${response.status}`);
        }
        logDebug(`Direct connection success!`);
        return response;
    } catch (error) {
        logDebug(`Direct connection failed.`, error);
        if (lastError) {
            const directErrorMessage = error instanceof Error ? error.message : String(error);
            lastError = new Error(`All proxies failed. Last error: ${lastError.message}. Direct connection also failed with message: "${directErrorMessage}"`);
        } else {
             lastError = error instanceof Error ? error : new Error(String(error));
        }
    }

    logDebug(`=== RESILIENT FETCH FAILED ===`);
    throw lastError || new Error(`Failed to fetch ${url} after trying all proxies and a direct connection.`);
};
// --- End of Resilient Fetch Logic ---

const CHANNELS_URL = 'https://i.mjh.nz/nz/tv.json';
const EPG_URL = 'https://i.mjh.nz/nz/epg.xml';

const PRIORITY_CHANNELS = [
    'TVNZ 1',
    'TVNZ 2',
    'Three',
    'Bravo',
    'Whakaata Māori',
    'Sky Open',
    'TVNZ Duke',
    'Eden',
    'Te Reo',
    'Rush',
    'Al Jazeera',
    'HGTV',
];

const parseEpgDate = (dateStr: string): Date | null => {
  // dateStr format is "20240728000000 +1200"
  if (dateStr.length < 20) {
    errorLogToTerminal("Invalid EPG date format", { dateStr, length: dateStr.length });
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
    const parsedDate = new Date(isoDateStr);
    return parsedDate;
  } catch (e) {
    errorLogToTerminal("EPG date parsing failed", { dateStr, error: String(e) });
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
    try {
        const response = await resilientFetch(CHANNELS_URL);
        const text = await response.text();
        
        try {
            const data = JSON.parse(text);

            // Case 1: Data is a direct array of channels
            if (Array.isArray(data)) {
                const filteredChannels = data.filter(c => c.name && c.logo && c.url && c.epg_id);
                return filteredChannels;
            }

            // Case 2: Data is an object with a 'channels' property which is an array
            if (data && Array.isArray(data.channels)) {
                const filteredChannels = data.channels.filter(c => c.name && c.logo && c.url && c.epg_id);
                return filteredChannels;
            }
            
            // Case 3: Handle the case where data is an object of channel objects
            if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
                const channels: Channel[] = Object.entries(data)
                    .map(([id, channelData]: [string, any]): Channel | null => {
                        // Ensure all required properties exist before creating the channel object
                        if (channelData.name && channelData.logo && channelData.mjh_master && channelData.epg_id) {
                            const channel: Channel = {
                                id: id,
                                name: channelData.name,
                                logo: channelData.logo,
                                url: channelData.mjh_master,
                                epg_id: channelData.epg_id,
                                network: channelData.network,
                                category: categorizeChannel(channelData),
                                headers: channelData.headers,
                            };

                            // --- Start of Channel-Specific Fixes ---

                            // Fix for channels needing a CORS proxy.
                            // This includes channels that don't have CORS headers and channels that have them but also require
                            // CORS for sub-requests (like fetching encryption keys), such as Sky Open.
                            const channelsNeedingProxy = ['mjh-maori-tv', 'mjh-te-reo', 'mjh-prime'];
                            if (channelsNeedingProxy.includes(id)) {
                                channel.needsProxy = true;
                                logDebug(`Channel ${channelData.name} (${id}) marked as needing proxy`);
                            }
                            
                            // Remove referer header if it's just a space, as it can cause issues
                            if (channel.headers && channel.headers.referer === ' ') {
                                delete channel.headers.referer;
                                logDebug(`Removed empty referer header for channel ${channelData.name} (${id})`);
                            }

                            // Remove specific user-agent header if it's the Apple TV one, as it can cause issues
                            if (channel.headers && channel.headers['user-agent'] === 'otg/1.5.1 (AppleTv Apple TV 4; tvOS16.0; appletv.client) libcurl/7.58.0 OpenSSL/1.0.2o zlib/1.2.11 clib/1.8.56') {
                                delete channel.headers['user-agent'];
                                logDebug(`Removed Apple TV user-agent header for channel ${channelData.name} (${id})`);
                            }

                            // Remove specific user-agent header if it's the Apple TV one, as it can cause issues
                            if (channel.headers && channel.headers['user-agent'] === 'otg/1.5.1 (AppleTv Apple TV 4; tvOS16.0; appletv.client) libcurl/7.58.0 OpenSSL/1.0.2o zlib/1.2.11 clib/1.8.56') {
                                delete channel.headers['user-agent'];
                                logDebug(`Removed Apple TV user-agent header for channel ${channelData.name} (${id})`);
                            }
                            
                            // Additional check for channels that use the prime stream URL
                            // Note: prime-plus1.m3u8 streams have proper CORS headers and don't need proxying
                            // prime.m3u8 streams need proxy due to CORS issues
                            if (channelData.mjh_master && channelData.mjh_master.includes('prime.m3u8')) {
                                channel.needsProxy = true;
                                logDebug(`Channel ${channelData.name} (${id}) marked as needing proxy (uses prime stream)`);
                            }

                            // --- End of Channel-Specific Fixes ---

                            logDebug(`Processed channel: ${channelData.name} (${id})`, {
                                url: channel.url,
                                needsProxy: channel.needsProxy,
                                category: channel.category
                            });

                            return channel;
                        } else {
                            return null;
                        }
                    })
                    .filter((channel): channel is Channel => channel !== null);

                // Sort channels based on a priority list, then alphabetically.
                channels.sort((a, b) => {
                    const getPriorityIndex = (name: string): number => {
                        const lowerCaseName = name.toLowerCase();
                        for (let i = 0; i < PRIORITY_CHANNELS.length; i++) {
                            const priorityName = PRIORITY_CHANNELS[i].toLowerCase();
                            if (lowerCaseName.startsWith(priorityName)) {
                                return i;
                            }
                        }
                        // Handle special case where channel name is just "DUKE"
                        if (lowerCaseName.startsWith('duke')) {
                            const dukeIndex = PRIORITY_CHANNELS.findIndex(p => p.toLowerCase() === 'tvnz duke');
                            if (dukeIndex > -1) return dukeIndex;
                        }
                        return PRIORITY_CHANNELS.length; // Not a priority channel, put at the end
                    };

                    const priorityA = getPriorityIndex(a.name);
                    const priorityB = getPriorityIndex(b.name);

                    if (priorityA !== priorityB) {
                        return priorityA - priorityB;
                    }

                    // If priorities are the same (e.g., "TVNZ 1 Auckland", "TVNZ 1 Wellington"), sort alphabetically.
                    return a.name.localeCompare(b.name);
                });
                
                return channels;
            }

            return [];
        } catch (e) {
            errorLogToTerminal("Could not read channel data. The service might be returning an invalid format.", e);
            throw new Error("Could not read channel data. The service might be returning an invalid format.");
        }
    } catch (error) {
        errorLogToTerminal("Failed to fetch channels:", error);
        throw error;
    }
};

export const fetchEpg = async (): Promise<EpgData> => {
    try {
        const response = await resilientFetch(EPG_URL, { timeout: 20000 }); // EPG is large, give more time
        const xmlString = await response.text();
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        
        if (xmlDoc.getElementsByTagName("parsererror").length) {
            errorLogToTerminal("Failed to parse EPG XML. Raw response:", xmlString.substring(0, 500) + "...");
            throw new Error("Could not read EPG data. The service might be returning an invalid format.");
        }
        
        const programmeNodes = xmlDoc.getElementsByTagName("programme");
        
        const epgData: EpgData = new Map();
        let processedCount = 0;
        let skippedCount = 0;

        for (const node of Array.from(programmeNodes)) {
            const channelId = node.getAttribute("channel");
            const startStr = node.getAttribute("start");
            const stopStr = node.getAttribute("stop");
            
            if (!channelId || !startStr || !stopStr) {
                skippedCount++;
                continue;
            }

            const start = parseEpgDate(startStr);
            const stop = parseEpgDate(stopStr);
            const title = node.getElementsByTagName("title")[0]?.textContent || 'No Title';
            const description = node.getElementsByTagName("desc")[0]?.textContent || 'No Description';
            
            if (!start || !stop) {
                skippedCount++;
                continue;
            }

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
            processedCount++;
        }
        
        return epgData;
    } catch (error) {
        errorLogToTerminal("Failed to fetch EPG:", error);
        throw error;
    }
};