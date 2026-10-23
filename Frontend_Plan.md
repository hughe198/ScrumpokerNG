# Frontend Plan: Phase 2 (Player Cards, Reactions, Missile, Timer)

_Started 2026-10-23 to replace a missing "frontend plan" referenced by old
TODOs. Phase 2 is now **complete**; this file records what was built and
what's left for later._

## 1. Status

| Item | State |
|---|---|
| Player cards replace the voter list | Done |
| Reactions: picker + grouped chips on each card | Done |
| Missile: two-step launch, flight animation and sound for everyone | Done |
| Missile limited to once per room (per name) | Done |
| Discussion countdown timer in the top bar | Done |
| Mobile layout for the top bar | Done |
| Bug fixes B1–B4 (API) and F1–F5 (frontend) | Done |
| Vote modal on own-card click | **Dropped** (own card is no longer clickable) |
| B5: hide vote values on the wire before reveal | Not done, optional |

## 2. What was built

### Player cards and reactions
- `PlayerCardRowComponent` lays out one `PlayerCardComponent` per voter in
  join order (no re-sorting on reveal). Your own card is outlined.
- `ReactionSlotComponent` sits under each card:
  - chips grouped by emoji with counts, sender names in the tooltip
    ("Someone" for a sender who left), "+N" after 4 groups;
  - a "☺+" trigger (always visible on touch, on hover/focus on desktop)
    opening a picker of 8 emojis (👍 👎 😂 🤔 🎉 😬 ☕ 🔥) plus 💥;
  - read-only on your own card.
- The server ignores a repeat of the same emoji from the same sender to the
  same target. Clear Votes clears all reactions.

### Missile
- 💥 in the picker opens `MissileLaunchDialogComponent`: "Are you sure you
  want to launch your missile at X?" → Arm → big red LAUNCH button.
- On launch the server broadcasts a `missile` event before the settings
  update. `MissileOverlayComponent` (in the room) plays it for everyone:
  banner, 🚀 arc from sender card to target card, explosion, shockwave,
  flash, card shake, "Direct hit" banner. Reduced-motion users get the
  banner and explosion only.
- `MissileService` synthesises the whoosh and boom with Web Audio (unlocked
  on the first click or keypress) and hides the 💥 chip until impact.
- Once per room, per display name, enforced on the server
  (`Room.missile_fired_names`, not reset by Clear) and mirrored in
  localStorage per room. Deliberately light: a new name gets around it.

### Discussion timer
- `TimerComponent` in the top bar: presets 1/2/3/5/10 min (default 3) or
  custom 1–60, then ⏸/▶, +1m and ■ while running. Amber at 30s, red at 10s.
- The server stores only the end time (or remaining time when paused) and
  sends `timer` + `serverTime` in every settings broadcast; clients count
  down locally, corrected for clock differences.
- At zero every client plays the gong and shows "⏰ Time's up!" for 8s.
  Late joiners don't get an alarm. 🔔/🔕 mute is per browser.
- Clear Votes stops the timer; the server drops a finished timer after 10s.

### Mobile top bar (< 576px)
- Full-width bar with a solid background, wrapping if needed.
- Short gong labels ("Gong", "Gong ON", "Tap for sound"); status text hidden
  unless ringing; theme toggle shows its icon only.
- Timer popover anchors to the bar so it can't run off-screen.

## 3. Bug fixes (all done)

**API:** B1 Clear Votes broadcasts settings · B2 disconnect broadcasts
settings · B3 server owns settings (client can only change reveal/card;
also fixed joining after reveal un-revealing the room) · B4 reaction de-dupe.

**Frontend:** F1 single `send()` with a queue until the socket opens · F2
`DEFAULT_SETTINGS` with "Standard" card · F3 voting card unsubscribes · F4
disconnect resets subjects instead of replacing them · F5 `reveal: boolean`.

## 4. Testing notes
- Frontend: `ng test --watch=false --browsers=FirefoxHeadless`.
- API: `.venv\Scripts\python.exe -m pytest` (`uv run` is broken on this
  machine).
- Local servers: `ng serve --host 127.0.0.1` (plain `localhost` binds IPv6
  only) and `uvicorn ScrumpokerAPI.main:app --host 127.0.0.1 --port 9001`
  **without** `--reload`, which hangs on Windows with open WebSockets.

## 5. Later (not planned yet)
- B5: send "voted" instead of real values before reveal.
- Reaction picker can overflow the screen edge for cards at the far
  left/right on narrow phones.
- "Cheeky" emoji set, reaction feed, bubble mini-game (specs in CLAUDE.md).
- `tasks.txt` backlog: `WebSocketSubject` refactor, Angular 20 upgrade,
  admin panel, webhooks.
