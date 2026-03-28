# Sanctuary - Mindful Haven

A hand-drawn, lofi-style mental wellness platform that provides a safe, interactive space for emotional healing through creative therapeutic activities.

## Overview

Sanctuary is a web-based healing cabin experience. Users enter a cozy illustrated room and interact with objects in the scene, each representing a different therapeutic module:

- **Resonance** (Cat on Sofa) - Guided breathing meditation with hand-tracking. A lotus flower blooms and closes in sync with your breath via webcam gesture recognition.
- **Echoes** (Notebook on Table) - A journaling and AI chat space. Choose your current mood, then either write in a private diary or talk to a compassionate AI listener powered by Gemini.
- **Flight** (Birds outside Window) - A calming bird-flight experience. Guide a hand-drawn bird across the sky using your mouse or hand gestures.
- **Embers** (Fire Pit) - Write your regrets on a piece of paper, then pinch and drag it into the campfire to burn it away.
- **Whispers** (Stone Basket) - Write your worries on stones, charge them by pinching, and throw them into a lake to let go.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS 4 + Hand-drawn sketch aesthetic
- **Animation**: Framer Motion + SVG native animations + Canvas API
- **Hand Tracking**: MediaPipe Hands (webcam gesture recognition)
- **AI Chat**: Google Gemini API (empathetic conversational support)
- **Audio**: Web Audio API (ambient brown noise generator)

## Features

- Interactive illustrated cabin scene as the main navigation hub
- Hand gesture recognition for immersive interaction (breathing, throwing, dragging)
- AI-powered empathetic chat companion (Rogerian therapy techniques)
- Ambient soundscape generated via Web Audio API (no external audio dependencies)
- Fully responsive, works on desktop and mobile
- Sketch/comic art style with Caveat handwriting font

## Getting Started

**Prerequisites:** Node.js 18+

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file and set your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```
5. Open http://localhost:3000 in your browser

## Build & Deploy

```bash
npm run build
```

The `dist/` folder can be deployed to any static hosting platform (Vercel, Netlify, GitHub Pages, etc.).

## Project Structure

```
src/
  App.tsx              # Main app with routing, audio, intro screen
  index.css            # Global styles & Tailwind config
  components/
    Scene.tsx           # Interactive cabin illustration (SVG)
    Breathe.tsx         # Resonance - breathing meditation with hand tracking
    Flight.tsx          # Flight - bird guiding experience
    Campfire.tsx        # Embers - burn your regrets
    Pond.tsx            # Whispers - throw worry stones
    Journal.tsx         # Echoes - journaling & AI chat
```

## Current Progress

- [x] Core app structure with intro screen and module navigation
- [x] Interactive cabin scene (SVG illustration with hover/click)
- [x] Resonance (breathing meditation with lotus flower + hand tracking)
- [x] Flight (bird guiding with mouse/hand control)
- [x] Embers (write & burn regrets in campfire)
- [x] Whispers (write worries on stones, charge & throw)
- [x] Echoes (mood selection, private journal, AI chat with Gemini)
- [x] Ambient audio via Web Audio API
- [x] SVG animations (birds, fire, steam, breathing)
- [x] Hand gesture recognition (MediaPipe)
- [ ] Mobile gesture fallback (touch-based interactions)
- [ ] User session persistence (save journal entries)
- [ ] Multi-language support
