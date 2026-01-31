# Luxe Interiors - Luxury Furniture AR Website

## Overview

This is a luxury furniture e-commerce website with a unique twist: instead of traditional "Buy Now" or "Add to Cart" functionality, products feature a "View in Reality" button that allows customers to see furniture in their space using augmented reality (AR). The platform includes a powerful admin panel for managing products, categories, and site theming.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled using Vite
- **Routing**: Wouter for client-side navigation
- **State Management**: TanStack React Query for server state, React hooks for local state
- **Styling**: Tailwind CSS with CSS variables for theming, shadcn/ui component library (New York style)
- **Animations**: Framer Motion for page transitions and scroll animations
- **Carousel**: Embla Carousel for product image galleries
- **Fonts**: Playfair Display (serif, luxury headings) and Inter (sans-serif, body text)

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful endpoints under `/api/*` prefix
- **Build System**: Custom build script using esbuild for server, Vite for client

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit with `drizzle-kit push` command
- **Tables**:
  - `categories`: Product categories with visibility toggle
  - `products`: Furniture items with AR links, colors, sizes, and multiple images
  - `theme_settings`: Brand customization (colors, fonts, logo)
  - `users` and `sessions`: Authentication storage

### Authentication
- **Provider**: Replit Auth (OpenID Connect)
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Protected Routes**: Admin routes require authentication, handled via `isAuthenticated` middleware
- **User Flow**: Login redirects to `/api/login`, user data fetched from `/api/auth/user`

### File Upload System
- **Storage**: Google Cloud Storage via Replit Object Storage integration
- **Upload Flow**: Presigned URL pattern - client requests URL, uploads directly to storage
- **Component**: `ObjectUploader` component wraps Uppy with AWS S3 plugin

### Key Design Patterns
- **Shared Types**: Schema types exported from `@shared/schema` used by both client and server
- **API Route Definitions**: Centralized in `shared/routes.ts` with Zod validation schemas
- **Path Aliases**: `@/` maps to client source, `@shared/` maps to shared code

### Admin Panel Features
- Theme customization (brand name, colors, fonts, logo)
- Category management with image uploads and visibility controls
- Product management with multi-image support, AR link validation, color/size variants
- Dashboard accessible at `/admin/*` routes

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### Cloud Services
- **Replit Object Storage**: File uploads via Google Cloud Storage integration
- **Replit Auth**: OpenID Connect authentication provider

### Key NPM Packages
- `@tanstack/react-query`: Server state management
- `@radix-ui/*`: Accessible UI primitives for shadcn/ui
- `framer-motion`: Animation library
- `embla-carousel-react`: Touch-friendly carousels
- `@uppy/core`, `@uppy/aws-s3`: File upload handling
- `drizzle-orm`, `drizzle-kit`: Database ORM and migrations
- `passport`, `openid-client`: Authentication handling

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Express session encryption key
- `ISSUER_URL`: OpenID Connect provider URL (defaults to Replit)
- `REPL_ID`: Replit environment identifier