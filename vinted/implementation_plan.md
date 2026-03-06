# Implementation Plan - Refine Header, Mega Menu, and Search

## Completed Tasks

### 1. Refactor Item Cards
- **Created `src/components/common/ItemCard.jsx`**: A reusable component matching the "Popular Adventures" card design.
- **Updated `src/components/home/ListingsSection.jsx`**: Replaced hardcoded cards with `ItemCard`.
- **Updated `src/pages/Products.jsx`**: Replaced the product list with `ItemCard` components.

### 2. Header Redesign
- **Navigation Toggle**: Replaced the horizontal list of categories with a single "Categories" button.
- **Floating Category Bar**: The horizontal categories now appear in a detached, floating card (rounded corners, shadow) below the header.
- **Mega Menu Layout**:
  - Implemented a layout where the Mega Menu (Subcategories + Items) appears below the Horizontal Category Bar.
  - Categories are selected by hovering items in the horizontal bar.
  - Left panel shows Subcategories, Right panel shows Item Types.
- **Search Bar**: Expanded the search bar to take up available space (`flex: 1`).
- **Links**: Updated links to point to `/products` with query parameters.

### 3. Mega Menu Styling
- **Dynamic Height**: Removed fixed height and implemented `max-height` with internal scrolling.
- **Visuals**: Removed text decoration (underlines) from all links.

### 4. Search & Filtering Logic
- **Frontend Filtering**: Updated `src/pages/Products.jsx` to read `category`, `subcategory`, and `itemType` query parameters and filter the displayed items accordingly.

## Verification
- **mega-menu-container**: Should not have fixed height.
- **Header**: Should show "Categories" button. Hovering should open menu.
- **Links**: Clicking deep into the menu should take you to `/products` with correct filters.
- **Products Page**: Should display items using the nice card design and filter based on URL.
