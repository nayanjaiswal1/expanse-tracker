# Frontend - Expense Tracker

## Overview
This is a React-based frontend application for an expense tracking system, built with TypeScript, Vite, and modern React patterns.

## Tech Stack
- **Framework**: React 19.2.0
- **Language**: TypeScript 5.5.4
- **Build Tool**: Vite 4.5.14
- **State Management**: @tanstack/react-query 5.84.1
- **Routing**: React Router DOM 6.14.0
- **Styling**: Tailwind CSS 3.4.17
- **UI Components**:
  - @headlessui/react 2.2.9
  - @radix-ui components
  - lucide-react 0.536.0 (icons)
- **Forms**: React Hook Form 7.45.0 with Zod validation
- **Internationalization**: i18next 25.6.0 + react-i18next 16.1.4
- **Charts**: Recharts 3.1.0
- **Notifications**: react-hot-toast 2.4.1 + sonner 2.0.7
- **PDF Processing**: react-pdf 10.2.0
- **Animations**: framer-motion 12.23.12

## Project Structure
```
frontend/
├── src/
│   ├── components/     # React components
│   │   └── ui/        # Reusable UI components
│   ├── ...
├── public/            # Static assets
├── scripts/           # Build and utility scripts
├── eslint.config.js   # ESLint configuration
├── tsconfig.json      # TypeScript configuration
├── tailwind.config.js # Tailwind CSS configuration
└── vite.config.ts     # Vite build configuration
```

## Available Scripts
- `npm run dev` - Start development server with Vite
- `npm run build` - Type check with tsc and build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint (max 0 warnings)
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run i18n:extract` - Extract i18n strings

## Key Features
- **Type Safety**: Full TypeScript coverage
- **Form Handling**: React Hook Form with Zod schema validation
- **Data Fetching**: TanStack Query for server state management
- **Internationalization**: Multi-language support with i18next
- **Responsive Design**: Tailwind CSS with mobile-first approach
- **PDF Viewer**: Built-in PDF viewing and processing capabilities
- **Data Visualization**: Charts and graphs with Recharts
- **Table Management**: Advanced table features with @tanstack/react-table
- **File Upload**: Drag-and-drop file upload with react-dropzone
- **Image Cropping**: Image editing with react-image-crop
- **Error Boundaries**: React error boundaries for graceful error handling

## Code Quality
- ESLint with TypeScript support and React plugins
- Prettier for code formatting
- Custom ESLint rules in `eslint-rules/`
- Zero-warning policy for linting

## Development Guidelines
- All components should be properly typed with TypeScript
- Use React Hook Form for form management
- Use TanStack Query for API calls and caching
- Follow the form refactoring pattern documented in `FORM_REFACTORING_PATTERN.md`
- Use i18next for all user-facing text
- Maintain ESLint zero-warning policy
- Format code with Prettier before committing

## API Integration
- Uses Axios for HTTP requests
- Base URL and API configuration should be managed through environment variables
- Authentication handled via JWT tokens

## Styling Conventions
- Use Tailwind CSS utility classes
- Use `clsx` and `tailwind-merge` for conditional class names
- Custom components in `components/ui/` should follow consistent patterns
- Responsive design using Tailwind breakpoints

## Build Configuration
- **Development**: Hot module replacement with Vite
- **Production**: Optimized bundle with tree-shaking, minification (Terser), and CSS optimization (cssnano)
- **TypeScript**: Strict type checking enabled
