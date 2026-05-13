# Voice2World

**From Imagination to Reality** — Speak your imagination into an immersive 3D world.

A project by the [Centre for Learning, Teaching and Technology (LTTC)](https://lttc.eduhk.hk), The Education University of Hong Kong (EdUHK).

![Voice2World](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![Three.js](https://img.shields.io/badge/Three.js-0.170-049ef4?logo=three.js) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss)

## About

Voice2World enables children and learners to create explorable 3D worlds using the most natural interface — **voice**. Describe a scene, and the AI generates a full 360° panoramic environment that can be explored interactively in the browser or downloaded as a `.glb` 3D model file.

This tool is part of the CRAC-CAVE (Cave Automatic Virtual Environment) initiative, empowering educators to design active and adaptive learning experiences that unleash creative skills and metacognition.

### How It Works

1. **Voice Command** — Tap the microphone and describe your world in natural language
2. **AI Generation** — The description is sent to a skybox AI to generate a full 360° panoramic environment
3. **3D Exploration** — Drag to explore the immersive world directly in the browser
4. **Export** — Download the world as a `.glb` file for use in CAVE, VR headsets, or 3D applications

## Features

- **Voice Input** — Web Speech API with robust error handling and permission guidance
- **Text Input** — Fallback keyboard mode for broader browser support
- **Example Prompts** — Pre-built creative prompts to inspire children
- **Interactive 3D Viewer** — Three.js-powered 360° panorama with drag-to-explore and auto-rotation
- **GLB Export** — Client-side 3D model generation for offline use
- **Child-Friendly Design** — Large touch targets, playful animations, clear visual feedback
- **Responsive** — Works on desktop, tablet, and mobile

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) |
| Frontend | React 19, Tailwind CSS 4 |
| 3D Rendering | Three.js |
| Skybox AI | Blockade Labs API |
| Voice | Web Speech API |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Blockade Labs](https://skybox.blockadelabs.com/) API key

### Installation

```bash
git clone https://github.com/djywill/Voice2World.git
cd Voice2World
npm install
```

### Environment Variables

Copy the example file and add your API key:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
BLOCKADE_LABS_API_KEY=your_api_key_here
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

## Deployment

The app is deployed on [Vercel](https://vercel.com). Set the `BLOCKADE_LABS_API_KEY` environment variable in the Vercel project settings.

**Live Demo:** [https://voice2world.vercel.app](https://voice2world.vercel.app)

## Project Structure

```
Voice2World/
├── app/
│   ├── api/
│   │   ├── generate/route.ts   # Proxy to Blockade Labs skybox API
│   │   └── status/[id]/route.ts # Poll generation status
│   ├── globals.css              # Theme, animations, component styles
│   ├── layout.tsx               # Root layout with fonts
│   └── page.tsx                 # Main application component
├── public/
│   ├── eduhk-logo.png
│   └── lttc-logo.png
├── .env.example                 # Environment variable template
└── package.json
```

## Educational Context

> "We unlock imagination through the most natural interface — voice. Children can narrate their stories, instantly generating explorable 3D worlds they can share and experience together with peers."

This project supports learning through:

- **Planning** — Defining ideas and goals for a generated world
- **Monitoring** — Observing the AI-generated environment and self-evaluating
- **Reflecting** — Iterating on the world collaboratively with AI

---

*Powered by LTTC · AI may generate inaccurate content.*
