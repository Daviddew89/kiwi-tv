/**
 * Debug utility for streaming functionality
 * Set DEBUG_STREAMS=true in localStorage to enable detailed logging
 */

const isDebugEnabled = () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('DEBUG_STREAMS') === 'true';
};

export const debugLog = (component: string, message: string, data?: any) => {
    if (!isDebugEnabled()) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${component}] ${message}`;
    
    if (data) {
        console.log(logMessage, data);
    } else {
        console.log(logMessage);
    }
};

export const debugError = (component: string, message: string, error?: any) => {
    if (!isDebugEnabled()) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${component}] ERROR: ${message}`;
    
    if (error) {
        console.error(logMessage, error);
    } else {
        console.error(logMessage);
    }
};

export const debugWarn = (component: string, message: string, data?: any) => {
    if (!isDebugEnabled()) return;
    
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${component}] WARNING: ${message}`;
    
    if (data) {
        console.warn(logMessage, data);
    } else {
        console.warn(logMessage);
    }
};

export const enableDebug = () => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('DEBUG_STREAMS', 'true');
        console.log('Stream debugging enabled. Refresh the page to see debug logs.');
    }
};

export const disableDebug = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('DEBUG_STREAMS');
        console.log('Stream debugging disabled.');
    }
};

export const isDebugMode = isDebugEnabled;

// Debug helpers for specific streaming scenarios
export const debugStreamInfo = (channel: any, streamUrl: string, context: string) => {
    debugLog('StreamInfo', 'Stream details:', {
        channelName: channel?.name,
        channelId: channel?.id,
        streamUrl,
        context,
        needsProxy: channel?.needsProxy,
        hasHeaders: !!channel?.headers,
        timestamp: new Date().toISOString()
    });
};

export const debugHlsEvent = (eventName: string, eventData: any) => {
    debugLog('HLS', `Event: ${eventName}`, eventData);
};

export const debugNetworkRequest = (url: string, method: string, status?: number, error?: any) => {
    if (error) {
        debugError('Network', `${method} ${url} failed`, error);
    } else {
        debugLog('Network', `${method} ${url} ${status ? `(${status})` : ''}`);
    }
};

// Performance debugging
export const debugPerformance = (operation: string, startTime: number) => {
    const duration = performance.now() - startTime;
    debugLog('Performance', `${operation} took ${duration.toFixed(2)}ms`);
};

// Browser capability debugging
export const debugBrowserCapabilities = () => {
    debugLog('Browser', 'Capabilities check:', {
        hlsSupported: typeof Hls !== 'undefined' && Hls.isSupported(),
        nativeHls: document.createElement('video').canPlayType('application/vnd.apple.mpegurl'),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
    });
}; 

// Terminal console output for debugging
export const terminalLog = (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    // Output to terminal console (Node.js environment)
    if (typeof process !== 'undefined' && process.stdout) {
        console.log(logMessage);
        if (data !== undefined) {
            console.log(JSON.stringify(data, null, 2));
        }
    }
    
    // Also output to browser console for development
    if (typeof window !== 'undefined') {
        if (data !== undefined) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }
    }
};

export const terminalError = (message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ERROR: ${message}`;
    
    // Output to terminal console (Node.js environment)
    if (typeof process !== 'undefined' && process.stderr) {
        console.error(errorMessage);
        if (error !== undefined) {
            console.error(error);
        }
    }
    
    // Also output to browser console for development
    if (typeof window !== 'undefined') {
        if (error !== undefined) {
            console.error(errorMessage, error);
        } else {
            console.error(errorMessage);
        }
    }
};

// Enhanced debug logging that outputs to both browser and terminal
export const debugLogToTerminal = (message: string, data?: any) => {
    if (isDebugMode()) {
        // Only log to browser console with debug formatting
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        
        if (data !== undefined) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }
        
        // Also log to terminal
        terminalLog(message, data);
    }
};

export const errorLogToTerminal = (message: string, error?: any) => {
    // Always log errors to browser console
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ERROR: ${message}`;
    
    if (error !== undefined) {
        console.error(errorMessage, error);
    } else {
        console.error(errorMessage);
    }
    
    // Also log to terminal
    terminalError(message, error);
}; 