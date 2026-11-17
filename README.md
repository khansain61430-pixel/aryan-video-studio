# Aryan Video Studio

A local creator workspace with Image to Video and Prompt to Video modes, plus a persistent local video gallery.

## Requirements
- Node.js 18 or newer
- npm

## Run on Windows
1. Extract the ZIP.
2. Open the `aryan-video-studio` folder.
3. Click the folder address bar, type `cmd`, and press Enter.
4. Run `npm install` once.
5. Run `npm start`.
6. Open http://localhost:3000 in Chrome.

If port 3000 is already in use, stop the other running server with Ctrl+C in its Command Prompt, or close that terminal, then run `npm start` again.

## Current features
- Image to Video: choose or drag in one JPG, PNG, or WebP image (up to 15 MB).
- Prompt to Video: prepare a prompt without an image.
- Video settings: 720p, 5/10/15/20 seconds, and aspect ratio options.
- Video Gallery: add existing MP4, WebM, or MOV videos (up to 500 MB), preview them in the browser, download them, or delete them.
- Gallery items are saved locally in the `videos` folder and indexed in `data/videos.json`, so they remain after restarting the app.

## Important: Kling API is not connected yet
The Prepare video action currently validates and prepares the request; it does not generate a video. The gallery can store and manage video files you already have. In the final integration phase, connect secure public media hosting and the Kling API, then generated video results can be saved into this same gallery automatically. Keep API keys on the server in `.env`; never put them in browser JavaScript.

## Local storage
- Uploaded source images: `uploads/`
- Saved gallery videos: `videos/`
- Gallery index: `data/videos.json`
