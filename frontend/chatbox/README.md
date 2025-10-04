# Chatbox Frontend

A React-based chat interface with real-time messaging and meeting indexing capabilities, built with TypeScript and Fluent UI.

## Features

- ⚡ **Vite** - Fast development and optimized production builds
- ⚛️ **React 19** - Latest React with modern features
- 🔷 **TypeScript** - Full type safety
- 🎨 **Fluent UI** - Microsoft's design system for React
- 🔄 **Real-time Updates** - Server-Sent Events (SSE) for live messaging
- 🍪 **Cookie Management** - Persistent user sessions with js-cookie
- 📱 **Responsive Design** - Mobile-first with collapsible sidebar
- 🗣️ **Meeting Indexing** - Upload and index meeting transcripts
- 💬 **Mention Support** - Parse @meeting:uuid mentions

## Project Structure

```
src/
├── components/           # UI components
│   ├── ChatContainer.tsx      # Main container with responsive layout
│   ├── ConversationsSidebar.tsx # Conversation list and user management
│   ├── ChatMain.tsx           # Chat interface and real-time messaging
│   └── MeetingModal.tsx       # Meeting indexing interface
├── contexts/             # React contexts
│   └── UserContext.tsx        # Global user state management
├── services/             # API and external services
│   └── api.ts                 # API service layer for backend communication
├── utils/                # Utility functions
│   └── cookie.ts              # Cookie management for user sessions
└── App.tsx               # Root application component
```

## Cookie Management

The application uses `js-cookie` to manage user sessions persistently:

- **Cookie Key**: `chat_user_id`
- **Expiration**: 30 days
- **Security**: `sameSite: 'strict'`

### User ID Management

- User ID is automatically loaded from cookies on app start
- New user IDs are saved to cookies when generated or changed
- Fallback to default UUID if no cookie exists
- All API calls use the current user ID from cookies

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

## Usage

```tsx
import { ChatContainer } from './components';
import { UserProvider } from './contexts/UserContext';

function App() {
  return (
    <UserProvider>
      <ChatContainer isEmbedded={false} />
    </UserProvider>
  );
}

// For embedding in iframe/popup
<ChatContainer isEmbedded={true} />
```

## API Endpoints

- `GET /api/v1/conversations` - Get user conversations
- `POST /api/v1/conversations` - Create new conversation
- `GET /api/v1/conversations/{id}/messages` - Get conversation messages
- `POST /api/v1/conversations/{id}/messages` - Send message
- `GET /api/v1/conversations/{id}/events` - SSE for real-time updates
- `POST /api/v1/meetings/index` - Index meeting content

## Technologies Used

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Fluent UI** - Microsoft's React component library
- **js-cookie** - Cookie management
- **ESLint** - Code linting

## Development

```bash
npm install
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## License

MIT
