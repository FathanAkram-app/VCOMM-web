# Overview

NXZZ-VComm is a military communications platform designed for intranet environments. It provides secure text messaging capabilities between personnel with features like real-time chat, user management, and message classification for operational security.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript
- **UI Library**: Radix UI components with shadcn/ui styling
- **State Management**: TanStack React Query for server state, React Context for client state
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with custom military-themed color schemes
- **Build Tool**: Vite for development and production builds

## Backend Architecture
- **Runtime**: Node.js with TypeScript (tsx for development)
- **Framework**: Express.js for REST API
- **WebSocket**: ws library for real-time communications
- **Authentication**: Passport.js with local strategy and session management
- **Database ORM**: Drizzle ORM for type-safe database operations

## Data Storage
- **Primary Database**: PostgreSQL (configurable for local or cloud deployment)
- **Session Store**: PostgreSQL-backed sessions using connect-pg-simple
- **Schema Management**: Drizzle Kit for migrations and schema management
- **File Storage**: Local filesystem for uploaded content

# Key Components

## Authentication System
- Local username/password authentication
- Session-based authentication with PostgreSQL session store
- Role-based access control (admin/user roles)
- Device information tracking for security auditing

## Chat System
- Direct messaging between users
- Group chat rooms with admin controls
- Real-time message delivery via WebSocket connections
- Message classification (routine, sensitive, classified)
- Message expiration based on classification level

## User Management
- Military personnel profiles with NRP (service numbers)
- Rank and unit information
- Online status tracking
- Contact management

## Real-time Communications
- WebSocket connections for instant messaging
- Heartbeat mechanism for connection monitoring
- Fallback polling for unreliable connections
- Support for voice and video call signaling (WebRTC ready)

# Data Flow

## Message Flow
1. User composes message in React frontend
2. Message sent via WebSocket or HTTP API
3. Server validates user authentication and permissions
4. Message stored in PostgreSQL database with expiration date
5. Server broadcasts message to relevant recipients via WebSocket
6. Frontend updates chat UI in real-time

## Authentication Flow
1. User submits credentials via login form
2. Passport.js validates against database
3. Session created and stored in PostgreSQL
4. User context updated in React app
5. Protected routes become accessible

## Connection Management
1. WebSocket connection established on login
2. Heartbeat messages maintain connection health
3. Connection failures trigger automatic reconnection
4. Polling fallback ensures message delivery

# External Dependencies

## Core Dependencies
- **@neondatabase/serverless**: Database connectivity (can be replaced with standard PostgreSQL)
- **bcryptjs**: Password hashing for security
- **express-session**: Session management
- **passport**: Authentication framework
- **ws**: WebSocket server implementation

## Frontend Dependencies
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: UI component primitives
- **wouter**: Lightweight routing
- **class-variance-authority**: Component styling utilities

## Development Dependencies
- **tsx**: TypeScript execution for development
- **vite**: Build tool and development server
- **drizzle-kit**: Database schema management
- **esbuild**: Production bundling

# Deployment Strategy

## Development Environment
- Uses tsx for hot-reloading TypeScript execution
- Vite dev server for frontend with HMR
- Local PostgreSQL database
- Environment variables from .env file

## Production Build
1. Frontend built with Vite to static assets
2. Backend bundled with esbuild for Node.js
3. Database migrations applied via Drizzle Kit
4. Static files served by Express

## Platform Support
- **Replit**: Configured for cloud deployment with PostgreSQL module
- **Windows**: Batch scripts for local development setup
- **HTTPS Support**: SSL certificate management for mobile device access

## Environment Configuration
- Database URL configurable for different environments
- Session secrets and security settings via environment variables
- Port configuration for different deployment targets

# Changelog
- June 25, 2025: Initial setup with local server deployment optimization
- June 25, 2025: Added comprehensive local deployment guides:
  - LOCAL-DEPLOYMENT-GUIDE.md: Hardware specs and deployment strategy
  - MANUAL-DEPLOYMENT-LOCAL.md: Step-by-step manual deployment
  - deploy-local.sh: Automated deployment script with Docker
  - mobile-setup-guide.md: Mobile user setup instructions
  - Docker-based deployment for 1000+ concurrent mobile users
- June 25, 2025: Added complete Lapsit (Situation Report) system:
  - Database tables: lapsit_categories, lapsit_subcategories, lapsit_reports
  - 3 main categories with 19 sub-categories for detailed reporting
  - Full form with photo upload/camera capture functionality
  - API endpoints for creating and retrieving lapsit reports
  - File upload support with multer for image attachments
  - Complete UI flow: category selection → sub-category → detailed form
- January 2, 2025: Fixed WebSocket conflicts and improved UI:
  - Resolved dual WebSocket connection issues by using single CallContext WebSocket
  - Implemented event-driven messaging between CallContext and Chat components
  - Added audio notification system for new messages (only from other users)
  - Fixed personnel page scrolling issues - improved spacing and visibility of action buttons
  - Removed test audio & video functionality from settings page per user request
- January 8, 2025: Enhanced audio notification system:
  - Improved notification sound with double beep pattern (high-low frequency)
  - Added multiple fallback systems: WebAudio API → HTML5 Audio → Browser Notification → Vibration
  - Increased volume for better audibility on mobile devices
  - Added browser notification permission handling for backup alerts
  - Network access issue identified: Mobile devices can access app but desktop computers cannot

# User Preferences

Preferred communication style: Simple, everyday language.