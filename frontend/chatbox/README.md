# React SPA Template

A modern, minimal React Single Page Application template built with TypeScript, Vite, and Tailwind CSS.

## Features

- ⚡ **Vite** - Fast development and optimized production builds
- ⚛️ **React 19** - Latest React with modern features
- 🔷 **TypeScript** - Full type safety
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 🧭 **React Router** - Client-side routing
- 📦 **Standalone Build** - Ready for deployment anywhere

## Project Structure

```
src/
├── components/     # Reusable UI components
│   ├── Layout.tsx
│   ├── Header.tsx
│   └── Footer.tsx
├── pages/         # Page components
│   ├── Home.tsx
│   ├── About.tsx
│   └── Contact.tsx
├── hooks/         # Custom React hooks
├── utils/         # Utility functions
├── types/         # TypeScript type definitions
└── styles/        # Additional styles (if needed)
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## Deployment

The built files in the `dist/` directory can be deployed to any static hosting service:

- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Any web server

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Technologies Used

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **ESLint** - Code linting

## License

MIT
