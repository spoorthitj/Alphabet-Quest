# Contributing to Alphabet Quest — Login Page

This document covers everything you need to know about the **Login & Registration** system added to Alphabet Quest. It explains the file structure, how the auth flow works, the design decisions made, and how to extend or modify the login page.

---

## 📁 Files Involved

| File | Role |
|------|------|
| `login.html` | The login/register page — entry point of the app |
| `css/login.css` | All styles specific to the login page |
| `index.html` | Modified to include an auth guard + user greeting |
| `css/styles.css` | Modified to add `.user-greeting` pill style |

---

## 🔐 How the Auth System Works

The login system uses **`localStorage`** only — no backend or database is involved.

### Data stored in localStorage

| Key | Value | Description |
|-----|-------|-------------|
| `aq_users` | `{ [phone]: { name, phone, joined } }` | All registered users keyed by phone number |
| `aq_session` | `{ name, phone, ts }` | The currently logged-in user's session |

### Flow Diagram

```
Open login.html
      │
      ▼
Session exists in localStorage?
      │
   YES │                    NO
      ▼                     ▼
Show welcome flash     Show Login / Register tabs
Navigate → index.html        │
                       ┌─────┴─────┐
                       ▼           ▼
                    LOGIN       REGISTER
                       │           │
               Match name    Save new user
               + phone in    to aq_users,
               aq_users      create session
                       │           │
                       └─────┬─────┘
                             ▼
                     Show welcome flash
                     Navigate → index.html
```

### Auth Guard on `index.html`

A synchronous script in the `<head>` of `index.html` checks for a valid session before the page renders. If none is found, the user is immediately redirected back to `login.html`:

```html
<script>
  (function() {
    var s = localStorage.getItem('aq_session');
    if (!s) { window.location.replace('login.html'); }
  })();
</script>
```

### Logout

A **🚪 Logout** button in the toolbar clears the session and redirects to `login.html`:

```js
localStorage.removeItem('aq_session');
window.location.href = 'login.html';
```

---

## 🎨 Design & UI

### Cartoon Characters

Two SVG mascots are drawn inline on the login page:

- **Hoot the Owl** (`#8B6DF0` purple) — bounces with `mascotBounce` animation
- **Squibb the Cat** (`#FF6B5B` coral) — bounces with a 0.5s animation delay

Both characters:
- Wiggle when any input field is focused
- React via the speech bubble when the user switches tabs or triggers login/register events

### Speech Bubble

The speech bubble (`#speechBubble`) rotates through friendly messages every **3.5 seconds** and updates contextually on tab switch or auth event.

### Floating Emoji Bubbles

Ten emoji bubbles (🌟⭐🎈 etc.) float upward continuously using the `floatUp` CSS keyframe animation, each with randomised duration and delay for a lively feel.

### Color Palette (matches the main game)

| Token | Value | Usage |
|-------|-------|-------|
| `--cream` | `#FFF0D8` | Page background base |
| `--purple` | `#8B6DF0` | Primary brand / buttons |
| `--coral` | `#FF6B5B` | Accent / button gradient end |
| `--yellow` | `#FFC93D` | Highlight |
| `--teal` | `#2FBFA9` | Secondary accent |
| `--ink` | `#2B2140` | Text & borders |

### Animations

| Animation | Element | Description |
|-----------|---------|-------------|
| `mascotBounce` | Hoot & Squibb SVGs | Gentle float up/down + rotate |
| `mascotWiggle` | Hoot SVG on input focus | Shake left/right |
| `logoFloat` | `.logo-text` | Slow vertical float |
| `floatUp` | `.bubble` spans | Emoji drift from bottom to top |
| `cardSlideIn` | `.auth-card` | Card enters from below on page load |
| `panelIn` | `.tab-panel` | Slide in from right on tab switch |
| `welcomePop` | `.welcome-box` | Scale-up pop for the overlay |
| `barFill` | `.welcome-bar-fill` | Progress bar fills over 1.6s |
| `letterDance` | `.alpha-deco span` | Letters bob up/down in sequence |

---

## ✅ Validation Rules

| Field | Rule |
|-------|------|
| Name | Required, minimum 2 characters |
| Phone | Required, digits only (7–15 digits after stripping non-numeric chars) |

Errors are displayed in `.error-msg` elements (made visible via `.visible` class) with `aria-live="polite"` for screen reader support.

---

## 🔁 User Recognition Logic

On **Login**, the system:
1. Strips non-digit characters from the phone input
2. Looks up the cleaned phone in `aq_users`
3. Compares the stored `name` (case-insensitive) against the entered name
4. If both match → creates session and navigates to the game

On **Register**, the system:
1. Strips non-digit characters from the phone input
2. Checks that the phone key does NOT already exist in `aq_users`
3. If new → saves the user object and creates a session

---

## 🚀 How to Extend

### Add a password field
1. Add a `password` input to both the Login and Register panels in `login.html`
2. In `handleRegister()`, store a hashed version (e.g. using a simple hash or just store plain text for prototyping)
3. In `handleLogin()`, compare the stored value against the entered password

### Connect to a real database
Replace the `getUsers()` / `saveUsers()` / `setSession()` helpers in `login.html` with `fetch()` calls to your backend API. The rest of the flow (validation, UI, mascot reactions) stays the same.

### Change mascot speech messages
Edit the `bubbleMessages` array in the `<script>` block of `login.html`:

```js
const bubbleMessages = [
  "Hey there! Ready to go on an alphabet adventure? 🌟",
  // Add your own messages here...
];
```

### Add more cartoon characters
Each character follows this structure in `login.html`:

```html
<div class="mascot-char">
  <svg class="mascot-svg bounce-anim" viewBox="0 0 100 120">
    <!-- Your SVG paths here -->
  </svg>
  <div class="char-name">Name 🎉</div>
</div>
```

Use `bounce-anim` or `bounce-anim-delay` class on the SVG for the bouncing effect.

---


## 👤 Author

Login page designed and implemented as part of the Alphabet Quest project.  
Characters: **Hoot the Owl** 🦉 & **Squibb the Cat** 🐱
