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
  - `product_materials`: Material/color variants per product (id, productId FK, name, colorHex, textureUrl, sortOrder)
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
- Theme customization (brand name, colors, fonts, logo, 5 preset themes)
- Category management with image uploads and visibility controls
- Product management with multi-image support, AR link validation, color/size variants, and Material Variants
- Material Variants: per-product color/texture variants (name, hex color swatch, optional PNG texture for 3D model texture swapping)
- Rotating promotional banners management
- Hero image selection (6 presets + custom upload)
- FAQ management (accordion display on /faq page)
- Contact settings (Instagram, Facebook, WhatsApp, address, Google Maps embed)
- Homepage section visibility toggles (banner, collections, new arrivals, philosophy, AR section)
- **Supervisor Management**: Add/remove supervisor emails that grant access to the supervisor portal
- Dashboard accessible at `/admin/*` routes

### Supervisor Portal (`/supervisor/*`)
- Accessible to users whose email is in the `supervisors` table (managed by admin)
- Authentication guard: redirects unauthenticated users to OIDC login, shows "Access Denied" for non-supervisors
- **Dashboard** (`/supervisor`): Shows live visitor counter (distinct sessionIds in last 10 min, polling every 15s)
- **Contact Info** (`/supervisor/contact`): Edit WhatsApp, Instagram, Facebook URL, address, and Google Maps embed URL
- **Products** (`/supervisor/products`): Add/edit products (name, description, price, category, images, AR link)
- No access to theme settings, categories, banners, FAQs, or supervisor management

### 3D Studio Viewer
- Clicking "View in Reality" opens a full-screen 3D Studio overlay (`ARStudio` component)
- Studio has a neutral/light background with model-viewer centered (camera-controls, auto-rotate, neutral environment)
- Glass-effect left panel (desktop) / bottom strip (mobile) shows material color swatches fetched from `/api/products/:id/materials`
- Clicking a swatch: if textureUrl exists, applies PNG texture via model-viewer materials API; otherwise applies hex color via setBaseColorFactor
- Glass-effect bottom info bar shows product name, price, and "View in AR" button (triggers model-viewer AR mode)
- Close (×) button top-right dismisses the studio

### Floating Contact Button
- `FloatingContactButton` component (`client/src/components/FloatingContactButton.tsx`)
- Fixed bottom-right chat bubble that connects visitors to WhatsApp/Instagram
- Reads contact info from admin-configured settings (whatsappNumber, instagramUrl)
- If both configured: shows expandable menu with both options
- If only one configured: directly opens that channel
- Hidden when no contact info is set, and hidden on admin pages
- Validates WhatsApp numbers (min 7 digits) and normalizes Instagram URLs

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