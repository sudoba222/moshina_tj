# TAJCAR.TJ Frontend - Project Maintenance & Fixes

This document summarizes the major fixes, upgrades, and architectural changes made to the frontend to ensure stability, security, and compatibility with modern environments (like Vercel).

## 1. Major Upgrades & Security
*   **Next.js Upgrade**: Upgraded from `14.2.5` to **`16.2.1`** (Latest) to resolve multiple high/critical security vulnerabilities.
*   **React Upgrade**: Upgraded to **`19.2.4`** (Latest) and **`react-dom`** to match.
*   **ESLint**: Upgraded to **`10.1.0`** and `eslint-config-next` to **`16.2.1`**.
*   **Security Status**: `npm audit` reports **0 vulnerabilities**.

## 2. Next.js 15+ Compatibility Fixes
Next.js 15+ introduced breaking changes regarding asynchronous `params` and `searchParams`.
*   **Modified Files**:
    *   `app/car/[id]/page.tsx`
    *   `app/car/[id]/layout.tsx`
    *   `app/dealers/[id]/layout.tsx`
*   **Change**: Updated component props and `generateMetadata` to treat `params` as a `Promise`.
    *   *Incorrect (v14)*: `const { id } = params`
    *   *Correct (v15/16)*: `const { id } = await params`

## 3. Translation System (i18n) Fixes
The project uses a custom translation helper in `lib/i18n.ts`.
*   **Fixed**: Resolved a widespread bug where translation keys were called incorrectly (e.g., `(key, lang)` instead of `t(key, lang)`), leading to "Cannot find name 't'" or silent failures.
*   **Type Safety**: All `t()` calls now use the explicit `Lang` type (`'ru' | 'tj'`).
*   **Shadowing**: Ensured no local variables named `t` shadow the global translation function in auth pages.

## 4. Type System & Models
*   **User Profiles**: Added `whatsapp_number?: string` to `UserPublicProfile` interface in `types/index.ts` to resolve build errors in `CarDetailClient`.
*   **Sitemap Resilience**: Added defensive array checks and null-safety to `app/sitemap.ts` to prevent "map is not a function" errors when API calls fail during prerendering.

## 4. Coding Standards for Claude
*   **Always use `t(key, lang)`** for translations.
*   **Always treat `params` as a Promise** in server components/layouts within the `app/` directory.
*   **Import types** strictly: `import type { Lang } from '@/types'`.
*   **Maintain 0 vulnerabilities**: Check `npm audit` after adding new dependencies.

## 5. Development Commands
*   `npm run dev`: Start development server.
*   `npm run build`: Build for production.
*   `npm run type-check`: Run TypeScript validation (Mandatory before pushing).
*   `npm run lint`: Run ESLint.
