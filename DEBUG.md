# Kiwi TV Debugging Guide

## Terminal Debugging Setup

The application now includes comprehensive debugging that outputs to both the browser console and the terminal console.

### Quick Start

1. **Start the application with debugging:**
   ```bash
   npm run dev
   ```

2. **Enable debug mode in browser:**
   - Open browser console (F12)
   - Run: `localStorage.setItem("debugMode", "true")`
   - Refresh the page

3. **View debug output:**
   - **Browser Console:** Press F12 and check the Console tab
   - **Terminal Console:** Watch the terminal where you ran `npm run dev`

### Debug Information Available

#### Stream Status (Real-time)
- Playing state
- Buffering state
- Current time and duration
- Error messages
- Stream URL and proxy information

#### HLS.js Events
- Manifest loading and parsing
- Fragment loading and errors
- Level switching
- Key loading
- Network errors

#### Proxy Information
- Which proxy is being used
- Proxy switching when failures occur
- Retry attempts and backoff timing
- CORS error details

#### Channel Information
- Channel metadata
- EPG data parsing
- Headers being applied (e.g., x-forwarded-for)

### Debug Controls

#### Enable/Disable Debug Mode
```javascript
// Enable
localStorage.setItem("debugMode", "true")

// Disable
localStorage.removeItem("debugMode")

// Check status
localStorage.getItem("debugMode")
```

#### Debug Panel
- Press `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac) to toggle the debug panel
- Shows current channel and stream status
- Real-time updates during playback

### Troubleshooting Common Issues

#### CORS Errors
Debug output will show:
- Which proxy is being used
- When proxies fail and switch
- Specific error details for each request

#### Stream Loading Failures
Debug output will show:
- HLS manifest loading attempts
- Fragment loading errors
- Network timeout information
- Retry logic details

#### EPG Data Issues
Debug output will show:
- Date parsing errors
- Channel categorization
- Data structure issues

### Example Debug Output

```
[2025-01-02T12:53:29.530Z] [VideoPlayer:Sky Open] === STREAM INITIALIZATION START ===
[2025-01-02T12:53:29.531Z] [ProxiedHlsLoader:Sky Open] === PROXIED HLS LOADER START ===
[2025-01-02T12:53:29.532Z] [ProxiedHlsLoader:Sky Open] Trying proxy 1/3: https://corsproxy.io/?
[2025-01-02T12:53:29.533Z] [ProxiedHlsLoader:Sky Open] Original URL: https://i.mjh.nz/.r/prime.m3u8
[2025-01-02T12:53:29.534Z] [ProxiedHlsLoader:Sky Open] Proxied URL: https://corsproxy.io/?i.mjh.nz/.r/prime.m3u8
```

### Advanced Debugging

#### Custom Debug Script
Run the debug start script for enhanced output:
```bash
node debug-start.js
```

#### Filtering Debug Output
You can filter terminal output using standard Unix tools:
```bash
# Show only VideoPlayer logs
npm run dev | grep "VideoPlayer"

# Show only error logs
npm run dev | grep "ERROR"

# Show only proxy-related logs
npm run dev | grep "ProxiedHlsLoader"
```

### Performance Impact

- Debug mode adds minimal overhead
- Terminal logging is only active when `debugMode` is enabled
- Browser console logging is always available for development
- Production builds will have debug logging disabled automatically 