# AWR VISION — Independent Cinema Interface

Responsive Arabic/English streaming catalogue and native video player, built for Vercel.

## What works
- Original AWR VISION branding, independent interface, seven catalogue sections.
- Cached artwork with image retry and server-side image fallback.
- Search, favorites, title synopsis, release year and rating.
- Native HTML5 player UI with quality selection, speed, fullscreen, PiP and watch-position saving.
- Public CC0 player test video. No external movie-site iframe or redirect.

## What requires an authorized media source
The external catalogue does not itself provide browser-playable movie streams. `GET /api/playback?id=<title-id>` returns `available:false` until you configure licensed URLs for the title. Do not mistake a poster or metadata entry for a playable film.

Set Vercel environment variable `AWR_MEDIA_LIBRARY` to a JSON object, with each key matching a catalogue item ID:

```json
{
  "your-owned-title-id": {
    "title": "Your licensed video",
    "sources": [
      {"label": "1080p", "type": "mp4", "url": "https://YOUR-MEDIA-CDN.example/video.mp4"},
      {"label": "720p", "type": "hls", "url": "https://YOUR-MEDIA-CDN.example/master.m3u8"}
    ],
    "subtitles": [
      {"label": "Arabic", "lang": "ar", "url": "https://YOUR-MEDIA-CDN.example/subtitles.vtt"}
    ]
  }
}
```

Use only media streams that you own or have permission to distribute. Playback requires proper cross-origin headers for HLS/DASH, and may be limited by browser codec compatibility or the provider's access controls. No geo-block, token, signature, or DRM bypass is implemented.

## Deploy
This project is in the `moviebox-web/` subdirectory of the repository. Configure the **Vercel project root** as `moviebox-web` and keep the Vercel framework preset as Other. This does not require running a build command: `public/` hosts the frontend and `api/` contains serverless functions. Do not change the production root directory of an existing unrelated application.

## Status
GitHub source has been updated. A dedicated Vercel deployment of the final AWR VISION version has **not** been verified; do not treat previously issued MovieBox preview URLs as the current version.
