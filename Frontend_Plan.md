# Frontend Plan: Phase 2 (Player Cards & Reactions) + Bug Fixes

_Written 2026-10-23. Replaces the missing "frontend plan" referenced by TODOs in
`room.component.html`, `room.component.ts` and `player-card.component.*`._

## 1. Where things stand

| Area | State |
|---|---|
| Backend reactions (`reaction` message, `normal` + one-per-round `missile`) | Done and tested (API commit `d8af1eb`) |
| `ISendReaction` / `IReaction` / `ISettings.reactions` interfaces | Done |
| `ApiService.sendReaction()` | Done, not called anywhere yet |
| `PlayerCardComponent` / `PlayerCardRowComponent` | Built, **uncommitted** |
| `room.component` switched to the card row (old list + `sortVotes` removed) | Done, **uncommitted** |
| Own-card click → vote modal (build step 5) | Stub (`console.log`) |
| `app-reaction-slot` (picker + display) | Not started |

**Step 0: commit the current uncommitted work** as "Phase 2a: player cards" before
starting anything below, so there's a clean point to go back to.

## 2. Decisions on the open questions

The reaction slot was blocked on two questions. Suggested answers (change any of
them before building; nothing below depends heavily on these):

| Question | Recommendation | Why |
|---|---|---|
| **How the picker opens** | A small round "☺+" button on the card's bottom edge, on **non-self cards only**. It's always visible on touch devices and shows on hover/focus on desktop. Click opens a popover above the card. | Uses no extra layout space, works with a keyboard, and doesn't rely on hover alone, so it works on mobile. |
| **Emoji set** | 8 standard emojis: 👍 👎 😂 🤔 🎉 😬 ☕ 🔥. The missile (💥) appears as a separate, visually distinct button in the same popover. Leave out the "cheeky" set and its agreement modal from CLAUDE.md for now. | Covers agree, disagree and fun reactions without a consent flow. The cheeky set can be added later as a second row. |
| **When reactions are allowed** | At any time. Before reveal they act as nudges ("🤔 hurry up"); after reveal they react to the vote. | The backend already allows reactions at any time, so this needs no extra logic. |
| **How reactions are shown** | Emoji chips below the card, grouped by emoji with a count (e.g. `😂 3`). The tooltip or `title` lists who sent them. Show at most 4 chips, then `+N`. | Keeps the cards compact, and grouping stops spam from overflowing the layout. |
| **Missile effect** | A one-off shake and 💥 burst animation on the target card when a new missile reaction shows up, plus a 💥 chip. The button is disabled once `missile_used_by` includes `myVoterID`. | It feels like an event, and the server already enforces the once-per-round limit. |
| **Reacting to the same emoji twice** | A second click of the same emoji on the same target does nothing (server-side de-dupe, see bug B4). | Stops spam with no client-side rate-limit code. |

## 3. Phase 2 build order

### Step 1: Thread reaction data into the card row
- `PlayerCardRowComponent`: add inputs
  - `@Input() reactions: { [voterId: string]: IReaction[] } = {}`
  - `@Input() missileUsed: boolean = false`
- `room.component.html`: pass `[reactions]="settings.reactions"` and
  `[missileUsed]="!!myVoterID && settings.missile_used_by.includes(myVoterID)"`.
- `PlayerCardComponent`: add `@Input() reactions: IReaction[] = []`, `@Input() missileUsed`,
  and `@Input() votes` (for looking up sender names), passed down by the row as
  `reactions[voterId] ?? []`.

### Step 2: `ReactionSlotComponent` (`src/room/reaction-slot/`)
Files: `reaction-slot.component.{ts,html,css,spec.ts}` plus `reaction-emojis.ts` (the emoji set).

```ts
@Component({ selector: 'app-reaction-slot', standalone: true, ... })
export class ReactionSlotComponent {
  @Input() targetVoterId!: string;
  @Input() reactions: IReaction[] = [];
  @Input() missileUsed = false;
  @Input() votes: VotesMap = {};          // for sender display names
  pickerOpen = false;

  constructor(private api: ApiService) {}  // same idiom as VotingCardComponent

  get grouped(): { emoji: string; count: number; names: string[] }[] { ... }

  react(emoji: string) {
    this.api.sendReaction({ type: 'reaction', id: crypto.randomUUID(),
                            emoji, to_voter: this.targetVoterId });
    this.pickerOpen = false;
  }
  fireMissile() {
    this.api.sendReaction({ type: 'reaction', id: crypto.randomUUID(),
                            emoji: '💥', to_voter: this.targetVoterId, kind: 'missile' });
    this.pickerOpen = false;
  }
}
```
- Close the popover on outside click and on `Escape` (`@HostListener('document:click')`).
- Accessibility: the trigger has `aria-haspopup="true"` and `aria-expanded`, and each emoji
  button has an `aria-label` (e.g. "React with thumbs up").
- The `id` is required by the backend model but overwritten by the server, so `crypto.randomUUID()` is enough.

### Step 3: Mount it in `PlayerCardComponent`
Replace the TODO in `player-card.component.html` with:
```html
@if (!isSelf) {
  <app-reaction-slot [targetVoterId]="voterId" [reactions]="reactions"
                     [missileUsed]="missileUsed" [votes]="votes"></app-reaction-slot>
} @else if (reactions.length) {
  <!-- show reactions you received, but no picker -->
  <app-reaction-slot [targetVoterId]="voterId" [reactions]="reactions" [readonly]="true" ...>
}
```
(Add a `@Input() readonly = false` to the slot so it can show reactions without the picker.)

Important: the slot's trigger button must `stopPropagation()` so it doesn't
fire the card's own click handler.

### Step 4: Missile animation
- In `PlayerCardComponent`, implement `ngOnChanges` and compare the previous and current
  `reactions` IDs. If a new `kind === 'missile'` arrives, set `hit = true` for about 800 ms.
- CSS: `.player-card.hit { animation: shake .4s, flash .8s; }` plus an absolutely
  positioned 💥 that scales up and fades.
- Respect `@media (prefers-reduced-motion: reduce)` by using a static highlight there instead.

### Step 5: Vote modal (own-card click)
- New `VoteModalComponent` (`src/room/vote-modal/`): a lightweight overlay that lists the
  current card set's values as buttons, built from
  `getVoteByName(settings.votingCard).selectedOptions()`. It uses no images, so it opens instantly.
- Inputs: `votingCard`, `currentVote`. Outputs: `vote(value)`, `closed()`.
- `room.component`: `showVoteModal = false`; `onOwnCardClicked()` sets it to true; the modal's
  `(vote)` calls the existing `voted()` and then closes.
- Keep `<app-voting-card>` inline as the main voting surface. The modal is a shortcut,
  so `isLoading`/`allImagesLoaded` don't change.
- Reuse the existing `modal-overlay` markup and styles from the name modal.

### Step 6: Tests
- `player-card-row.component.spec.ts`: reactions are passed to the right card;
  `missileUsed` is calculated correctly.
- `reaction-slot.component.spec.ts`: grouping/counting; `react()` and `fireMissile()` call
  `ApiService.sendReaction` with the right payload; the missile button is disabled when used;
  the picker is hidden when `readonly`.
- `player-card.component.spec.ts`: no slot on self with no reactions; `hit` is set when a
  new missile arrives.
- `vote-modal.component.spec.ts`: renders the options for the card type and emits a vote.

### Step 7: Clean up
- Remove the TODO comment blocks in `room.component.html` and `player-card.component.html`.
- Update `CLAUDE.md`: replace the outdated "Emoji Reaction System (Future Implementation)"
  section with a short description of what was actually built (the message shape is
  `reaction` / `settings.reactions`, not `emoji_reaction` / `emoji_broadcast`).

## 4. Bug fixes

Fix these **before or alongside Step 1**. B1–B4 are backend fixes the reaction UI
depends on.

### Backend (`ScrumPoker Alpha/ScrumpokerAPI`)

**B1. `Clear_votes` leaves stale reactions on clients** (`message_handlers.py:20`)
`room.clear_votes()` wipes `reactions` and `missile_used_by`, but only `broadcast_votes()`
is sent, so clients keep showing old reactions and think missiles are still used.
```python
if command == "Clear_votes":
    room.clear_votes()
    await room.broadcast_votes()
    await room.broadcast_settings(room.get_settings())
    return False
```
Test: after clear, the last settings message has `reactions == {}` and `missile_used_by == []`.

**B2. Disconnect doesn't broadcast settings** (`room.py:106`)
Reactions *to* the leaving voter are removed but never re-broadcast. Add
`await self.broadcast_settings(self.get_settings())` after `broadcast_votes()`. Reactions
*from* the leaving voter can stay; the UI should show an unknown sender as "someone".

**B3. `handle_settings` broadcasts client-supplied settings and drops reactions** (`message_handlers.py:74`)
`Settings(**data)` from the client has empty `reactions`, and `broadcast_settings` sends
whatever it's given, so any settings message wipes everyone's reactions in the UI while
the server still holds them. `broadcast_settings` also takes its `reveal` and `votingCard`
values from the passed object.
Fix: make the server state the only source of truth.
```python
async def handle_settings(room, websocket, data):
    try:
        incoming = ISendSettings(**data)      # reveal + votingCard only
    except ValueError as e: ...
    room.reveal = incoming.reveal
    room.votingCard = incoming.votingCard
    await room.broadcast_settings(room.get_settings())
```
Then simplify `broadcast_settings()` to take no arguments and always serialise `self.get_settings()`.

**B4. No de-dupe on reactions** (`room.py:147`)
Repeated clicks append unlimited copies. In `add_reaction`, return `None` if the
same `(from_voter, to_voter, emoji)` already exists. Optionally also cap the total
per target (e.g. 50).

**B5 (optional, design). Vote values are visible before reveal**
`broadcast_votes()` sends real vote values to everyone, so anyone can see them in
devtools before reveal. If that matters, send `vote: "voted"`/`""` while
`reveal` is false, and the real values on reveal. The frontend only needs
`vote !== ''` before reveal, so the card UI already works with this.

### Frontend (`ScrumpokerNG/src`)

**F1. `sendVote` overwrites `socket.onopen`** (`api.service.ts:110`)
If the socket is still `CONNECTING`, the original handler that sends the name is
replaced, so the server never gets the name. Use
`this.socket.addEventListener('open', () => ..., { once: true })` instead. Better
still, add a single private `send(msg)` helper that queues messages until the
socket opens, and use it for `sendVote`, `sendCommand`, `sendReaction`,
`changeCards` and `sendSettingsChange` (they're currently five near-identical copies).

**F2. Default `votingCard: "fibonacci"` matches no card name** (`api.service.ts:22`, `barchart.component.ts`)
The card names are `"Standard"`, `"Fibonacci"`, etc. The lowercase default makes `find()`
return `undefined` until the first server settings message. Use `"Standard"` (the
backend default) and move the default settings object into one exported constant
(`DEFAULT_SETTINGS`) that is reused in ApiService (3 copies) and BarchartComponent.

**F3. `VotingCardComponent` never unsubscribes** (`voting-card.component.ts:38`)
Settings and `clearVotes` subscriptions are created in the constructor and `ngOnInit`
with no teardown, so they leak when the room is left and re-joined. Add a `destroy$`
with `takeUntil`, matching `room.component`.

**F4. Subjects completed and replaced on disconnect** (`api.service.ts:166`)
`disconnect()` completes `settings` and `results` and replaces them with new subjects.
Any long-lived subscriber stays attached to the dead subject. Once F3 is done this
is safe in practice, but resetting with `.next(DEFAULT_SETTINGS)` and keeping the
same subjects is simpler and avoids the problem completely.

**F5. `reveal: Boolean` (object type)** (`room.component.ts:47`)
Use `boolean`. This also removes the `!!reveal` workaround in `room.component.html`.

**F6. `tasks.txt` T-shirt sorting bug**
The barchart now sorts by `rate`, and the value-sorted list it affected has been removed,
so this looks fixed. Check it with a T-shirt round, then remove it from `tasks.txt`.

## 5. Suggested sequence

1. Commit the current player-card work (Step 0).
2. Backend fixes B1–B4, with pytest coverage, then commit the API.
3. Frontend fixes F1–F5, then commit.
4. Phase 2 Steps 1–3 (reactions visible and sendable), then commit.
5. Step 4 (missile animation), then commit.
6. Step 5 (vote modal), then commit.
7. Steps 6–7 (tests, clean-up, CLAUDE.md), then commit.
8. Decide on B5 separately.

## 6. Later (not in Phase 2)
- "Cheeky" emoji set and agreement modal (CLAUDE.md spec).
- Reaction feed/chat log (`EmojiChatComponent` in CLAUDE.md).
- Bubble mini-game (CLAUDE.md spec).
- `tasks.txt` backlog: `WebSocketSubject` refactor (pairs well with F1), Angular 20 upgrade, admin panel, webhooks.
