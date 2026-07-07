# 0 Points Quiz Manager

A frontend-only dashboard for running the **0 Points Quiz** during live events. The application manages teams, turn rotation, quiz board progress, scoring, leaderboard sorting, dark mode, and persistent local state without any backend or framework.

## Features

- Four quiz categories: Tech, Sports, Rajagiri, and Entertainment
- Question values: 20, 40, 60, and 80
- Modal-based answer recording for Correct, Wrong, and Pass
- Automatic turn rotation with Previous Team and Next Team controls
- Dynamic leaderboard sorted by lowest score first
- Team add, remove, and rename controls
- Manual score adjustment buttons for +20, -20, +40, -40, +60, -60, +80, and -80
- Reset scores and reset quiz workflows with confirmation dialogs
- Persistent local storage for teams, scores, completed questions, round, current turn, and dark mode
- Professional responsive dashboard layout for laptop, desktop, projector, and tablet screens
- Dark mode, toast notifications, smooth transitions, and leaderboard movement animation
- Keyboard shortcuts:
  - Arrow Right: Next Team
  - Arrow Left: Previous Team
  - Ctrl + R: Reset Quiz confirmation
  - Escape: Close modal

## Folder Structure

```text
/
|-- index.html
|-- css/
|   `-- style.css
|-- js/
|   `-- script.js
|-- assets/
|   |-- images/
|   `-- icons/
`-- README.md
```

## How to Run

Open `index.html` directly in any modern browser. No installation, build step, database, or server is required.

## Screenshots

Add screenshots here after running the application during setup.

```text
assets/images/dashboard-light.png
assets/images/dashboard-dark.png
```

## Future Improvements

- Add import/export for event backups
- Add custom categories and point values
- Add projector-only display mode
- Add per-question notes or answer prompts
- Add an event history log for auditing score changes
