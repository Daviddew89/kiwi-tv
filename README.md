# Kiwi TV

Welcome to Kiwi TV! This is a sleek and modern web application designed for watching New Zealand TV channels live. It provides a user-friendly interface to browse channels and see what's currently on air.

## Features

*   **Live TV Streaming:** Watch your favorite New Zealand channels directly in your browser.
*   **Interactive TV Guide:** See the current schedule for each channel.
*   **Modern Interface:** A clean and responsive design that looks great on any device.

## Data Source

This application is powered by the incredible work of [Matt Huisman](https://www.matthuisman.nz/). The channel and Electronic Program Guide (EPG) data is sourced from his public IPTV resources at [i.mjh.nz](https://i.mjh.nz/). A huge thank you to Matt for making this data available!

## Run Locally

**Prerequisites:** Node.js

1.  Install dependencies:
    `npm install`
2.  Run the app in development mode:
    `npm run dev`
3.  Build the app for production:
    `npm run build`
4.  Preview the production build:
    `npm run preview`

## Known Channel Issues

The following channels currently experience CORS header issues, prevent them from loading correctly:

*   Sky Open
*   Whakaara Maori
*   Te Reo
*   Shine TV
*   Trackside Premier