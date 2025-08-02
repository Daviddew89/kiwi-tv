import React, { useState, useEffect } from 'react';
import { enableDebug, disableDebug, isDebugMode, debugLog } from '../utils/debug';

interface DebugPanelProps {
    isVisible: boolean;
    onToggle: () => void;
    currentChannel?: any;
    streamStatus?: {
        isPlaying: boolean;
        isBuffering: boolean;
        error: string | null;
        currentTime: number;
        duration: number;
    };
}

const DebugPanel: React.FC<DebugPanelProps> = ({ 
    isVisible, 
    onToggle, 
    currentChannel, 
    streamStatus 
}) => {
    const [isDebugEnabled, setIsDebugEnabled] = useState(isDebugMode());
    const [logs, setLogs] = useState<string[]>([]);
    const [showLogs, setShowLogs] = useState(false);

    useEffect(() => {
        setIsDebugEnabled(isDebugMode());
    }, []);

    const handleToggleDebug = () => {
        if (isDebugEnabled) {
            disableDebug();
            setIsDebugEnabled(false);
        } else {
            enableDebug();
            setIsDebugEnabled(true);
        }
    };

    const clearLogs = () => {
        setLogs([]);
    };

    const copyLogs = () => {
        const logText = logs.join('\n');
        navigator.clipboard.writeText(logText).then(() => {
            debugLog('DebugPanel', 'Logs copied to clipboard');
        });
    };

    if (!isVisible) return null;

    return (
        <div className="fixed top-20 right-4 z-50 bg-black/90 backdrop-blur-md border border-gray-600 rounded-lg p-4 max-w-md text-white text-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Debug Panel</h3>
                <button
                    onClick={onToggle}
                    className="text-gray-400 hover:text-white"
                >
                    ×
                </button>
            </div>

            {/* Debug Controls */}
            <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                    <span>Debug Logging:</span>
                    <button
                        onClick={handleToggleDebug}
                        className={`px-3 py-1 rounded text-xs font-semibold ${
                            isDebugEnabled 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : 'bg-red-600 hover:bg-red-700'
                        }`}
                    >
                        {isDebugEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <span>Show Logs:</span>
                    <button
                        onClick={() => setShowLogs(!showLogs)}
                        className="px-3 py-1 rounded text-xs font-semibold bg-blue-600 hover:bg-blue-700"
                    >
                        {showLogs ? 'Hide' : 'Show'}
                    </button>
                </div>
            </div>

            {/* Current Channel Info */}
            {currentChannel && (
                <div className="mb-4 p-3 bg-gray-800 rounded">
                    <h4 className="font-semibold mb-2">Current Channel</h4>
                    <div className="space-y-1 text-xs">
                        <div><span className="text-gray-400">Name:</span> {currentChannel.name}</div>
                        <div><span className="text-gray-400">ID:</span> {currentChannel.id}</div>
                        <div><span className="text-gray-400">URL:</span> {currentChannel.url}</div>
                        <div><span className="text-gray-400">Needs Proxy:</span> {currentChannel.needsProxy ? 'Yes' : 'No'}</div>
                        <div><span className="text-gray-400">Headers:</span> {currentChannel.headers ? 'Yes' : 'No'}</div>
                    </div>
                </div>
            )}

            {/* Stream Status */}
            {streamStatus && (
                <div className="mb-4 p-3 bg-gray-800 rounded">
                    <h4 className="font-semibold mb-2">Stream Status</h4>
                    <div className="space-y-1 text-xs">
                        <div><span className="text-gray-400">Playing:</span> {streamStatus.isPlaying ? 'Yes' : 'No'}</div>
                        <div><span className="text-gray-400">Buffering:</span> {streamStatus.isBuffering ? 'Yes' : 'No'}</div>
                        <div><span className="text-gray-400">Current Time:</span> {streamStatus.currentTime.toFixed(1)}s</div>
                        <div><span className="text-gray-400">Duration:</span> {streamStatus.duration.toFixed(1)}s</div>
                        {streamStatus.error && (
                            <div className="text-red-400">
                                <span className="text-gray-400">Error:</span> {streamStatus.error}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Logs Display */}
            {showLogs && (
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Recent Logs</h4>
                        <div className="space-x-2">
                            <button
                                onClick={clearLogs}
                                className="px-2 py-1 rounded text-xs bg-red-600 hover:bg-red-700"
                            >
                                Clear
                            </button>
                            <button
                                onClick={copyLogs}
                                className="px-2 py-1 rounded text-xs bg-blue-600 hover:bg-blue-700"
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                    <div className="bg-gray-900 rounded p-2 h-32 overflow-y-auto text-xs font-mono">
                        {logs.length === 0 ? (
                            <span className="text-gray-500">No logs yet...</span>
                        ) : (
                            logs.map((log, index) => (
                                <div key={index} className="text-gray-300 mb-1">
                                    {log}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="text-xs text-gray-400">
                <p>Enable debug logging and refresh the page to see detailed stream information in the browser console.</p>
            </div>
        </div>
    );
};

export default DebugPanel; 