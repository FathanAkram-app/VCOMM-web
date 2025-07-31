# NXZZ-VComm - Military Communication Platform

## Overview

NXZZ-VComm is a military communications platform designed for secure intranet environments. It provides real-time messaging, audio/video calling, and personnel management capabilities for military organizations. The system is built as a full-stack TypeScript application with offline-first capabilities and cross-platform deployment support.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern component patterns
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS configured with military-themed color schemes (olive green variants)
- **State Management**: TanStack React Query for server state, React Context for client-side state
- **Routing**: Wouter library for lightweight client-side routing
- **Real-time**: Native WebSocket connections for live messaging and call signaling

### Backend Architecture
- **Runtime**: Node.js with TypeScript and tsx for development
- **Framework**: Express.js REST API with session-based authentication
- **Database ORM**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Authentication**: Passport.js with local strategy and bcrypt password hashing
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **File Handling**: Multer for file uploads with Sharp for image compression

## Key Components

### Authentication System
- Local username/password authentication with military callsign support
- Session-based authentication stored in PostgreSQL
- Role-based access control (user, admin, super_admin)
- Device information tracking for security auditing
- Offline-compatible (removed external OAuth dependencies)

### Real-time Communication
- WebSocket server for instant messaging and presence updates
- Direct messaging between personnel
- Group chat rooms with administrative controls
- Message classification system (routine, sensitive, classified)
- Typing indicators and read receipts

### Media Handling
- Voice message recording and playback
- File attachment support (documents, images, audio)
- Image compression using Sharp library
- Progressive Web App (PWA) capabilities with service worker

### User Management
- Military personnel profiles with NRP (service numbers)
- Rank and unit information tracking
- Online status and presence system
- Contact management and personnel directory

## Data Flow

### Message Flow
1. User composes message in React frontend
2. Message sent via WebSocket to Express server
3. Server validates, stores in PostgreSQL via Drizzle ORM
4. Server broadcasts to relevant recipients via WebSocket
5. Recipients receive real-time updates in React components

### Authentication Flow
1. User submits credentials to `/api/auth/login` endpoint
2. Server validates against PostgreSQL user table with bcrypt
3. Session created and stored in PostgreSQL sessions table
4. Session cookie sent to client for subsequent requests
5. Protected routes verify session via middleware

### File Upload Flow
1. Client uploads file via AttachmentUploader component
2. Multer middleware processes multipart form data
3. Sharp compresses images, files stored in local uploads directory
4. Database stores file metadata with message reference
5. Files served via Express static middleware

## External Dependencies

### Runtime Dependencies
- **Database**: PostgreSQL (configurable connection string)
- **File System**: Local uploads directory for file storage
- **Network**: WebSocket connections for real-time features

### Offline Compatibility
- All external font dependencies removed (uses system fonts)
- Google Fonts replaced with system font stack
- Replit-specific banners and authentication removed
- Service Worker implemented for offline PWA functionality

## Deployment Strategy

### Multi-Platform Support
- **Linux**: Universal installer script supporting Ubuntu, CentOS, Debian, Fedora, Arch
- **Proxmox VE**: Specialized installation script for virtualized environments
- **Windows Server**: Batch script installer for Windows environments
- **Development**: Hot-reload with Vite in development mode

### Production Build Process
1. Frontend built with `vite build` to `dist/public`
2. Backend compiled with `esbuild` to `dist/index.js`
3. Database migrations applied with `drizzle-kit push`
4. Static files served by Express in production
5. Environment configuration via `.env` file

### Security Considerations
- Session secrets configured via environment variables
- Database credentials secured in connection strings
- File uploads validated and sanitized
- HTTPS configuration available for production deployment
- Military-grade classification system for message security

### Scalability Features
- PostgreSQL connection pooling for concurrent users
- Configurable session TTL and cleanup
- Efficient WebSocket connection management
- Optimized database queries with Drizzle ORM
- PWA caching strategy for offline reliability