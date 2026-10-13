# MovieBox Web — source-linked catalogue

A responsive, original web frontend inspired by the UI and categories of the uploaded `MovieBox.exe` Windows Electron launcher.

## Confirmed from the EXE

The EXE contains an NSIS-wrapped Electron app. Its `resources/app.asar/src/main.cjs` loads **https://movieboxph.org/?utm_source=windows_exe**. The EXE has **no embedded catalogue, direct video URLs, video player, authentication tokens, or streaming API**. This web app follows the exact upstream site and public movie-page links rather than fabricating playback links.

## Features
- Arabic / English UI; responsive desktop, tablet and mobile layouts
- The same primary source categories: Home, Movies, TV Shows, Animation, K-Drama, ShortTV, Most Watched
- Vercel serverless API retrieves publicly available pages and extracts poster, title, rating, category, canonical movie URL
- Search in current catalogue, favorites stored on device, item information dialog, upstream watch-page links
- Safeguarded origin allowlists (no open proxy), five-minute Vercel API cache
- A verified offline fallback with upstream movie-page URLs (no made-up video URLs)

## Limitations
This is a separate **interface** not the original upstream site. The upstream may change markup, block server-side fetches, limit embeds or require authentication/rights to play content. Playback is handed to the original content page; it is not claimed to be independently playable on this site. Never pretend a direct video URL was recovered from the EXE.

## Deploy
Works on Vercel with `public/` static files and `api/catalog.js` function. No npm dependencies.

## Local
```bash
npm run dev
# http://localhost:3000
npm run check
```

## Security
The application never proxies raw video/CDN streams or bypasses upstream access controls. The source domain is fixed to `movieboxph.org`. Video playback and licensing remain subject to the origin service.
