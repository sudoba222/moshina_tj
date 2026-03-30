# 🚀 TajCar.tj System Report & Action Plan

## 📊 Executive Summary
The system relies on a solid, modern stack (**FastAPI** + **Next.js**). It is production-ready in terms of architecture but requires critical refinements in **Data Consistency** (synchronizing frontend/backend data) and **User Experience** (specifically the posting flow).

---

## 🛠 Technical Analysis

### 1. Backend (`moshina-tj/backend`)
*   **✅ Strengths:**
    *   **High Performance:** Uses `Composite Indexes` (e.g., `ix_listings_status_price`) for fast catalog filtering.
    *   **Security:** Strong RBAC (Role-Based Access Control) and security headers.
    *   **Architecture:** Clean separation of concerns with `routers`, `schemas`, and `models`.
*   **⚠️ Risks:**
    *   **Loose Data:** `Listing` table uses simple Strings for `brand`/`model`. This allows users to post "Toyota", "toyota", and "TOYOTA" as different brands.
    *   **Auth Storage:** Tokens are likely stored in `localStorage`/`cookies` without `HttpOnly`, posing a moderate XSS risk.

### 2. Frontend (`moshina-tj/frontend`)
*   **✅ Strengths:**
    *   **Mobile-First:** Excellent implementation of Bottom Nav, touch-friendly sliders, and responsive layouts.
    *   **Modern Stack:** Next.js 14 (App Router) + Tailwind CSS.
*   **⚠️ Risks:**
    *   **Hardcoded Data:** `BRANDS` and `CITIES` are hardcoded in `post/page.tsx`. If the backend Admin adds a new Brand, the Frontend won't see it.
    *   **Posting UX:** The "Post Ad" page is a single, massive form. This is poor UX for mobile users.

---

## 📋 Implementation Plan for Claude Code

### Phase 1: Data Consistency (The "Single Source of Truth")
**Goal:** Connect Frontend directly to Backend reference tables.

1.  **Backend:** Ensure `/api/v1/catalog/brands` and `/api/v1/catalog/models` are public endpoints.
2.  **Frontend:**
    *   Create a hook `useCatalogData()` to fetch Brands and Cities.
    *   Replace `const BRANDS = [...]` in `catalog/page.tsx` and `post/page.tsx` with this dynamic data.

### Phase 2: The "Posting Field" Overhaul (UX Focus)
**Goal:** Convert the long form into a mobile-optimized **"Wizard"**.

**Refactoring `app/post/page.tsx`:**
Instead of one long page, implement a **4-Step Wizard**:

*   **Step 1: Identity**
    *   **Type:** Big toggle buttons (Sale / Rent).
    *   **Brand/Model:** **Combobox (Autocomplete)**. User types "To", selects "Toyota". *Crucial for database cleanliness.*
    *   **Year:** Scrollable wheel or number input.
*   **Step 2: Specs**
    *   **Fuel/Gearbox:** Use **Selectable Chips** (Pills) instead of dropdowns for faster mobile selection.
    *   **Description:** Keep the "AI Refine" button (it's a great feature!).
*   **Step 3: Media (The "Gallery")**
    *   **Drag & Drop Zone:** Allow users to drag images to reorder them (First image = Cover).
    *   **Progress Bars:** Show real-time upload progress for each image.
*   **Step 4: Deal**
    *   **Price:** Large input with Currency Toggle (USD <-> TJS).
    *   **City:** Dropdown.
    *   **Rental Rules:** (Only if Rent is selected) Show these fields dynamically.

### Phase 3: Security Hardening
1.  **HttpOnly Cookies:** Move the JWT token from the JSON response body to a `Set-Cookie` header to prevent XSS attacks.

---

## 💡 Frontend Suggestions (Specific to Posting)

**1. Smart Autocomplete**
*   *Current:* User types "Camry".
*   *New:* User selects "Toyota" -> "Model" dropdown automatically filters to show only "Camry", "Corolla", etc.

**2. Image "Drop Zone"**
*   Create a component `ImageDropzone.tsx`.
*   **Features:**
    *   Preview thumbnails immediately.
    *   "X" button to remove.
    *   **Visual cues:** "Cover Photo" badge on the first item.

**3. Drafts**
*   Save the form state to `localStorage` automatically. If the user accidentally closes the browser, they can resume their post.
