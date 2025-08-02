#!/usr/bin/env node

console.log('=== Kiwi TV Debug Mode Setup ===');
console.log('');
console.log('To enable debugging in the terminal:');
console.log('1. Open your browser console (F12)');
console.log('2. Run this command: localStorage.setItem("debugMode", "true")');
console.log('3. Refresh the page');
console.log('');
console.log('Debug information will now appear in both:');
console.log('- Browser console (F12)');
console.log('- Terminal console (this window)');
console.log('');
console.log('To disable debugging:');
console.log('localStorage.removeItem("debugMode")');
console.log('');
console.log('Starting development server...');
console.log('');

// Start the development server
const { spawn } = require('child_process');
const child = spawn('npm', ['run', 'dev'], { 
    stdio: 'inherit',
    shell: true 
});

child.on('error', (error) => {
    console.error('Failed to start development server:', error);
    process.exit(1);
});

child.on('close', (code) => {
    console.log(`Development server exited with code ${code}`);
    process.exit(code);
}); 