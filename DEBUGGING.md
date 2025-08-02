# Streaming Debugging Guide

This guide explains how to use the debugging features to isolate and resolve streaming issues in the FreeTV app.

## Quick Start

1. **Enable Debug Panel**: Click the "Debug" button in the top-right corner of the app header
2. **Enable Debug Logging**: In the debug panel, click "Debug Logging" to enable detailed console logging
3. **Refresh the Page**: Refresh the browser to start capturing debug information
4. **Reproduce the Issue**: Try to reproduce the streaming problem
5. **Check Console**: Open browser developer tools (F12) and check the Console tab for detailed logs

## Debug Features

### Debug Panel
- **Toggle Visibility**: Click the Debug button in the header to show/hide the debug panel
- **Enable Logging**: Toggle debug logging on/off
- **Channel Information**: View current channel details when a stream is active
- **Stream Status**: Monitor real-time stream status (playing, buffering, errors)
- **Log Display**: View recent debug logs in the panel

### Console Logging
When debug logging is enabled, detailed information is logged to the browser console:

#### Video Player Events
- Stream initialization details
- HLS.js events and errors
- Video element state changes
- Network request status
- Error details with context

#### TV Service Events
- Channel data fetching and parsing
- EPG data processing
- Network request attempts and failures
- Proxy usage and fallbacks

#### App Events
- Stream initiation
- Channel selection
- Error handling

## Common Issues and Debugging Steps

### 1. Stream Won't Start
**Check these logs:**
- `[VideoPlayer] === STREAM INITIALIZATION START ===`
- `[VideoPlayer] Channel data:` - Verify channel configuration
- `[VideoPlayer] Stream URL:` - Check if URL is correct
- `[VideoPlayer] HLS configuration:` - Verify HLS settings
- `[VideoPlayer] HLS Event [ERROR]:` - Look for HLS errors

**Common causes:**
- Invalid stream URL
- CORS issues (check if `needsProxy` is set correctly)
- Missing headers for geo-restricted content
- Browser doesn't support HLS

### 2. Stream Starts but Stops/Buffers
**Check these logs:**
- `[VideoPlayer] HLS Event [FRAG_LOAD_ERROR]:` - Segment loading failures
- `[VideoPlayer] HLS Event [STALLED]:` - Playback stalls
- `[VideoPlayer] Video waiting for data` - Buffering issues
- `[VideoPlayer] HLS Event [LEVEL_SWITCHED]:` - Quality level changes

**Common causes:**
- Network connectivity issues
- Server-side stream problems
- Proxy performance issues
- Insufficient bandwidth

### 3. Channel Data Loading Issues
**Check these logs:**
- `[TVService] === FETCHING CHANNELS ===`
- `[TVService] === RESILIENT FETCH START ===`
- `[TVService] Proxy failed:` - Proxy issues
- `[TVService] Failed to parse channel JSON` - Data format issues

**Common causes:**
- API endpoint down
- CORS proxy failures
- Invalid JSON response
- Network timeouts

### 4. EPG Data Issues
**Check these logs:**
- `[TVService] === FETCHING EPG ===`
- `[TVService] EPG processing complete:` - Processing statistics
- `[TVService] Failed to parse date:` - Date parsing errors

**Common causes:**
- Large EPG file causing timeouts
- Invalid XML format
- Date parsing errors
- Memory issues with large datasets

## Debug Commands

You can also enable debugging programmatically:

```javascript
// Enable debug logging
localStorage.setItem('DEBUG_STREAMS', 'true');

// Disable debug logging
localStorage.removeItem('DEBUG_STREAMS');

// Check if debug is enabled
console.log('Debug enabled:', localStorage.getItem('DEBUG_STREAMS') === 'true');
```

## Browser Developer Tools

### Console Filtering
Use console filtering to focus on specific components:
- Filter by `[VideoPlayer]` for video-related logs
- Filter by `[TVService]` for data fetching logs
- Filter by `[App]` for application-level logs
- Filter by `ERROR` for error messages

### Network Tab
Monitor network requests:
- Look for failed requests (red entries)
- Check response headers for CORS issues
- Monitor request timing and size
- Verify proxy usage

### Performance Tab
Monitor performance:
- Check for memory leaks
- Monitor CPU usage during streaming
- Analyze frame rates
- Identify bottlenecks

## Troubleshooting Steps

1. **Clear Browser Cache**: Clear all browser data and try again
2. **Try Different Browser**: Test in Chrome, Firefox, Safari to isolate browser-specific issues
3. **Check Network**: Ensure stable internet connection
4. **Disable Extensions**: Temporarily disable browser extensions that might interfere
5. **Check Console Errors**: Look for JavaScript errors that might prevent streaming
6. **Monitor Network Tab**: Check if requests are being made and their responses

## Reporting Issues

When reporting streaming issues, include:

1. **Debug logs**: Copy console logs when the issue occurs
2. **Channel information**: Which channel was affected
3. **Browser details**: Browser version and OS
4. **Network information**: Connection type and speed
5. **Steps to reproduce**: Exact steps that led to the issue
6. **Error messages**: Any error messages displayed in the UI

## Advanced Debugging

### Custom Debug Functions
You can add custom debug logging in your code:

```javascript
import { debugLog, debugError, debugWarn } from './utils/debug';

// Log information
debugLog('MyComponent', 'Operation completed', { data: 'value' });

// Log errors
debugError('MyComponent', 'Operation failed', error);

// Log warnings
debugWarn('MyComponent', 'Potential issue detected', warningData);
```

### Performance Monitoring
Monitor specific operations:

```javascript
import { debugPerformance } from './utils/debug';

const startTime = performance.now();
// ... perform operation ...
debugPerformance('MyOperation', startTime);
```

This debugging system will help you quickly identify and resolve streaming issues by providing detailed visibility into the streaming pipeline. 