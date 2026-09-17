<div align="center">

<img src="public/favicon.svg" width="88" height="88" alt="Myusic logo" />

# Myusic

**A desktop music player for your local library, styled after Apple Music.**

Built with Electron, React 19, and TypeScript — it scans a folder on your computer, reads the tags out of your audio files, and enriches everything with fetched album art, artist photos, animated covers, and synced lyrics.

[![Electron](https://img.shields.io/badge/Electron-44-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)

</div>

---

## Overview

Myusic turns a local folder of audio files into a polished, Apple Music–style library. Point it at a folder once, and it will:

- Read embedded ID3/metadata tags from every track (title, artist, album, year, track number)
- Organize everything automatically into **Songs**, **Albums**, **Artists**, and **Playlists**
- Fetch high-resolution album art, artist photography, album descriptions, and — where available — **animated (motion) album covers**
- Download **synced or plain-text lyrics** and scroll them in time with playback
- Stream audio directly from disk through a custom protocol — no re-encoding or importing required

Everything is cached locally, so the app works fully offline after the first enrichment pass.

## Features

**Library**
- One-click folder scan that indexes your entire local collection
- Automatic grouping into songs, albums, and artists with counts and metadata
- Custom, user-defined playlists (create, rename, delete, add/remove tracks)
- Right-click context menu for quick actions on any track, plus a track details view

**Playback**
- Full transport controls — play/pause, next/previous, seek, volume
- Queue management: play now, play next, or add to queue
- Shuffle and three-state repeat (off / repeat all / repeat one)
- Volume and playback state persisted between sessions

**Rich metadata enrichment**
- Static album art and artist photos pulled from the iTunes Search API and Deezer
- Artist and album descriptions sourced from Wikipedia
- Animated/motion album covers, downloaded and cached locally (HLS streams are reassembled into looping MP4s)
- Synced and unsynced lyrics via [lrclib.net](https://lrclib.net), rendered with auto-scrolling active-line highlighting in the Now Playing view

**Design & UX**
- Frameless, custom-titlebar window with acrylic/vibrancy background on Windows
- Dynamic UI theming — the app's accent colors are extracted from the currently playing album art
- Compact/expanded sidebar, dedicated full-screen Now Playing view, and a persistent mini player bar

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Electron](https://www.electronjs.org/) |
| UI | [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Build tooling | [Vite](https://vite.dev/) |
| Tag parsing | [`music-metadata`](https://www.npmjs.com/package/music-metadata) |
| Adaptive streaming (animated covers) | [`hls.js`](https://github.com/video-dev/hls.js) |
| Metadata sources | iTunes Search API, Wikipedia API, Deezer API, lrclib.net |

## How it works

Myusic is split into two processes, like any Electron app:

- **`electron/`** — the main process. It owns the filesystem scan, reads tags with `music-metadata`, talks to the metadata/lyrics APIs, persists the library and playlists to disk, and serves local audio/artwork to the renderer through a custom `atom://` streaming protocol.
- **`src/`** — the React renderer. It renders the library, playback UI, and Now Playing screen, and talks to the main process exclusively through the typed `window.electronAPI` bridge defined in `electron/preload.cjs`.

All scanned data and downloaded assets are cached under Electron's app-data directory:

```
<userData>/
├── library.json        # Scanned songs, albums, and artists
├── playlists.json      # User-created playlists
├── artwork_cache/       # Downloaded static album/artist artwork
└── animated_cache/      # Downloaded/assembled animated covers (.mp4)
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and npm

### Installation

```bash
git clone https://github.com/Rranssu/Myusic.git
cd Myusic
npm install
```

### Run in development

Starts the Vite dev server and launches the Electron window against it with hot reload:

```bash
npm run dev
```

### Build

```bash
npm run build           # Type-check and build the renderer (Vite)
npm run build:electron  # Compile the Electron main process
npm run build:all       # Both of the above
```

### Other scripts

| Command | Description |
|---|---|
| `npm run start` | Launch Electron against the last production build |
| `npm run preview` | Preview the built renderer with Vite |
| `npm run lint` | Run ESLint over the project |

## Project Structure

```
Myusic/
├── electron/
│   ├── main.cjs              # Main process: window, IPC, protocol handler, filesystem
│   ├── metadataService.cjs   # Fetches artwork, artist info, lyrics, and animated covers
│   └── preload.cjs           # Secure bridge exposing window.electronAPI to the renderer
├── src/
│   ├── components/
│   │   ├── layout/            # Sidebar, top bar, mini player bar
│   │   ├── player/             # Full-screen Now Playing view
│   │   ├── modals/              # New playlist / track details dialogs
│   │   ├── menus/                # Track right-click context menu
│   │   └── icons/                 # SVG icon set
│   ├── pages/                  # Home, Songs, Albums, Artists, Playlists + detail views
│   ├── hooks/
│   │   └── useAudioPlayer.ts   # Playback engine: queue, shuffle, repeat, transport state
│   ├── utils/
│   │   └── colorExtractor.ts   # Derives the dynamic UI palette from album art
│   ├── types/
│   │   └── music.ts            # Shared types + the electronAPI contract
│   └── App.tsx                 # Root layout, navigation, and state orchestration
└── public/
```

## Roadmap

- [ ] Packaged, installable builds (via `electron-builder`)
- [ ] Search across the full library
- [ ] Equalizer / audio effects
- [ ] Cross-platform tray controls and media-key support

## Contributing

Issues and pull requests are welcome. If you're proposing a larger change, please open an issue first to discuss what you'd like to change.

## License

This project is licensed under the [MIT License](LICENSE).

Note: Myusic fetches album art, artist photos, descriptions, and lyrics from third-party services (iTunes Search API, Deezer, Wikipedia, and lrclib.net) at runtime for personal use. The MIT license covers this project's own source code only — it does not grant any rights to that third-party content.
