# Admin Panel - Quick Reference Guide

## 🎨 Visual Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [☰] ADMIN PANEL                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌───────────────────────────────────────────┐  │
│  │          │  │  🔍 Search...    ☀️ 🔔 👤 Admin ▼  🚪     │  │
│  │    A     │  └───────────────────────────────────────────┘  │
│  │  Admin   │                                                   │
│  │  Panel   │  ┌───────────────────────────────────────────┐  │
│  │          │  │  Dashboard                                 │  │
│  ├──────────┤  │  Welcome back, Admin                       │  │
│  │          │  └───────────────────────────────────────────┘  │
│  │ 📊 Dash  │                                                   │
│  │ 👥 Users │  ┌────┐ ┌────┐ ┌────┐ ┌────┐                   │
│  │ 🛍️ List  │  │150 │ │ 45 │ │$12k│ │+24%│  Stat Cards       │
│  │ 🏷️ Cat   │  │User│ │List│ │Rev │ │Grow│                   │
│  │ 📈 Rep   │  └────┘ └────┘ └────┘ └────┘                   │
│  │ ⚙️ Set   │                                                   │
│  │          │  ┌─────────────────┐  ┌──────────┐             │
│  │          │  │ Recent Activity │  │  Quick   │             │
│  │          │  │ • New user      │  │  Actions │             │
│  │          │  │ • New listing   │  │          │             │
│  │          │  │ • Payment       │  │  Buttons │             │
│  │          │  └─────────────────┘  └──────────┘             │
│  │          │                                                   │
│  └──────────┘                                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 📱 Responsive Behavior

### Desktop (> 991px)
```
[Sidebar 260px] [Header with Search] [Content Area]
     ↓               ↓                      ↓
  Expanded      Full Features         4 Columns
```

### Tablet (768-991px)
```
[Hidden] [Header] [Content]
   ↓        ↓         ↓
Overlay  Compact  2 Columns
```

### Mobile (< 576px)
```
[☰] [Header Icons Only]
 ↓        ↓
Closed  Minimal
```

## 🎨 Color Reference

| Element | Light Theme | Dark Theme | Hover |
|---------|------------|------------|-------|
| Background | `#f5f7fa` | `#0f1419` | - |
| Cards | `white` | `#1a2332` | - |
| Sidebar | `white` | `#1a2332` | - |
| Primary | `#00E07C` | `#00E07C` | `#00c76d` |
| Text | `#1a2332` | `white` | - |
| Border | `#e9ecef` | `rgba(255,255,255,0.1)` | `#00E07C` |

## 🔘 Interactive Elements

### Header Buttons
- **Search**: Green focus ring
- **Theme**: Dropdown (Sun/Moon)
- **Bell**: Red badge, green hover
- **Profile**: Dropdown menu
- **Logout**: Red border, red hover

### Sidebar Links
- **Default**: Gray text
- **Hover**: Green background (8% opacity)
- **Active**: Green background (12% opacity) + accent bar
- **Collapsed**: Icons only with tooltips

### Stat Cards
- **Hover**: Lift up 4px
- **Icons**: Gradient backgrounds
- **Numbers**: Large, bold

## 🎯 Theme Switcher

```javascript
// Click sun/moon icon → Dropdown appears
┌─────────────┐
│ ☀️ Light   │ ← Active (green)
│ 🌙 Dark     │
└─────────────┘

// Stored in localStorage
adminTheme: 'light' or 'dark'
adminThemeExpiry: '2026-02-19T...'

// After 2 days → Auto reset to 'light'
```

## 📏 Sidebar States

### Expanded (260px)
```
┌──────────────┐
│   A          │
│ Admin Panel  │
├──────────────┤
│ 📊 Dashboard │ ← Icon + Label
│ 👥 Users     │
│ 🛍️ Listings  │
│ 🏷️ Categories│
│ 📈 Reports   │
│ ⚙️ Settings  │
└──────────────┘
```

### Collapsed (80px)
```
┌────┐
│ A  │
├────┤
│ 📊 │ ← Icon only
│ 👥 │   (tooltip on hover)
│ 🛍️ │
│ 🏷️ │
│ 📈 │
│ ⚙️ │
└────┘
```

## 🔄 Mobile Sidebar Flow

```
1. Default: Closed (hidden off-screen)
   [☰ Button visible in top-left]

2. Click ☰: Sidebar slides in from left
   [Dark overlay appears]
   [X button in sidebar header]

3. Click X or overlay: Sidebar slides out
   [Back to closed state]
```

## ⌨️ Quick Shortcuts

| Action | Desktop | Mobile |
|--------|---------|--------|
| Toggle Sidebar | Click chevron | Click ☰ |
| Close Sidebar | Click chevron | Click X or overlay |
| Change Theme | Click sun/moon | Click sun/moon |
| Logout | Click logout btn | Click profile → logout |
| Search | Type in search bar | (Hidden) |

## 🎨 Hover States (All Green)

```css
/* Buttons */
background: transparent → #00E07C
color: #495057 → white
transform: translateY(0) → translateY(-2px)

/* Sidebar Links */
background: transparent → rgba(0, 224, 124, 0.08)
color: #495057 → #00E07C

/* Cards */
transform: translateY(0) → translateY(-4px)
box-shadow: small → large
```

## 📦 Component Hierarchy

```
AdminDashboard
├── AdminSidebar
│   ├── Logo
│   ├── Toggle Button
│   ├── Nav Links (6)
│   └── Footer
├── AdminHeader
│   ├── Search Bar
│   ├── Theme Switcher
│   ├── Notifications
│   ├── Profile Dropdown
│   └── Logout Button
└── Dashboard Content
    ├── Header Card
    ├── Stat Cards (4)
    ├── Activity Card
    └── Quick Actions Card
```

## 🚀 Testing Checklist

- [ ] White theme loads by default
- [ ] Green color on all hover states
- [ ] Search bar has green focus
- [ ] Theme switcher works (Light/Dark)
- [ ] Theme persists after refresh
- [ ] Sidebar collapses/expands on desktop
- [ ] Sidebar closed by default on mobile
- [ ] Sidebar opens with hamburger on mobile
- [ ] Overlay closes sidebar on mobile
- [ ] All icons visible when collapsed
- [ ] Tooltips show on collapsed icons
- [ ] Active link highlighted in green
- [ ] Profile dropdown works
- [ ] Logout redirects to login
- [ ] Responsive on all screen sizes

---

**Admin panel is fully functional with white theme, green primary color, and complete responsiveness!** ✅
