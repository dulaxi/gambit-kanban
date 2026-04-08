# Landing Page: Slack Thread Demo Section

**Date**: 2026-04-08
**Branch**: landing
**Status**: Approved, ready for implementation plan
**Replaces**: Tools Strip section (`src/pages/LandingPage.jsx:1205-1238`)

## Summary

Add a second dual-panel showcase section to the landing page that demonstrates Kolumn's ability to extract structured tasks from a team Slack thread. The new section mirrors the architecture of the existing `EveryDetailDemo` component but tells a different input→output story: **team chat → assigned kanban cards**.

The new section replaces the Tools Strip, which is currently redundant with the Features Grid directly above it — both enumerate Kolumn's features in a tile-grid format, competing for the same conversion job.

## Background

The landing page currently contains one dual-panel showcase: `EveryDetailDemo` at `src/pages/LandingPage.jsx:689`, rendered inside the "AI Card Generation Showcase" section at ~line 1146. It animates a left panel of freeform notes becoming a right panel of kanban cards — the "Notes in, kanban out" metaphor.

**Current page structure:**

```
Nav → Hero → Stats Bar → Notes→Kanban Showcase → Features Grid → Tools Strip → CTA → Footer
```

**Problem**: Tools Strip (1205-1238) and Features Grid (1183-1203) both enumerate Kolumn's features as icon-tile grids. They compete for the same reader attention and split it. Tools Strip occupies the prime position immediately before the CTA — a slot where a "wow moment" belongs but the current content doesn't deliver one.

**Solution**: Replace Tools Strip with a second dual-panel showcase that demonstrates a different Kolumn superpower using the same visual language as `EveryDetailDemo`.

**New page structure:**

```
Nav → Hero → Stats Bar → Notes→Kanban Showcase → Features Grid → Slack→Cards Showcase → CTA → Footer
```

The two showcases are separated by Features Grid, preventing visual clash. The new showcase lands immediately before the CTA, so the last thing visitors see before the signup button is a wow moment.

## Goals

1. Create a new `SlackThreadDemo` component that follows the architectural pattern of `EveryDetailDemo` — shared `elapsed` clock, two `CreamWindow` panels, synchronized animation
2. Replace the Tools Strip section with the new showcase
3. Reinforce the fictional team narrative (Aisha, Marcus) already used in `DEMO_CARDS_INIT` to create invisible continuity between the two showcases
4. Visually distinguish the new showcase from the existing one via a different container color and a non-parallel headline

## Non-goals (YAGNI)

- **No real Slack OAuth integration** — this is pure visual animation, all content is hardcoded
- **No hover/interactive state** on messages — purely presentational, same as existing demo
- **No dark mode styling** — stays in the cream/warm palette of the rest of the page
- **No reuse of the production `Card` component** from `src/components/board/` — lightweight inline mock cards, same approach as the existing `RightContent`
- **No new component files** — `SlackThreadDemo` lives inline in `LandingPage.jsx` alongside `EveryDetailDemo`
- **No unit tests** — project has no test suite (per CLAUDE.md); verification is manual

## Design Decisions

### 1. Story & scenario

A short Slack thread in `#launch-prep` where a PM named **Priya** drops three messages asking the team for various things. The scenario deliberately overlaps with the existing `EveryDetailDemo` product-launch fiction — same fictional team, different input source.

**Cast**: Priya (sender), Aisha and Marcus (mentioned, will become card assignees). Aisha and Marcus are already used as card assignees in `DEMO_CARDS_INIT` at `src/pages/LandingPage.jsx:741` and `:746`, so reusing them creates cross-section narrative continuity.

### 2. Left panel: Slack thread contents

**Channel header**: `# launch-prep`

**Message 1** (Priya)
> hey team — quick stuff for launch 🚀 @aisha pricing page needs to go live by fri, 3 tiers not 2 per founder

**Message 2** (Priya)
> @marcus stripe needs to handle refunds too, high prio — legal flagged it

**Message 3** (Priya)
> also someone pls redo the hero copy, current one feels plain

**Visual treatment per message**:
- Rounded avatar circle with initial letter ("P") on dark background (`bg-[#1B1B18] text-white`)
- Sender name: `text-[13px] font-semibold text-[#1B1B18]`
- Timestamp: `text-[11px] text-[#8E8E89]` (e.g., "2:14 PM")
- Body text: `text-[12px] text-[#5C5C57] leading-relaxed`
- `@mentions` styled in accent green (`text-[#8BA32E] font-medium`)

### 3. Right panel: Extracted cards

Three mock cards materialize in sequence, each pulling multiple structured fields out of the corresponding message.

| # | Title | Assignee | Label | Deadline | Priority | Signal source in Slack |
|---|---|---|---|---|---|---|
| 1 | Build pricing page (3 tiers) | Aisha | Frontend | Fri | Medium | `@aisha` + "by fri" + "3 tiers" |
| 2 | Stripe refunds support | Marcus | Backend | — | **High** | `@marcus` + "high prio" + "legal" |
| 3 | Redo hero copy | — (none) | Copy | — | Low | no mention, no deadline, casual tone |

**Card 3 is intentionally under-specified** — no assignee, no deadline. This sells the AI's honesty: it extracts what's grounded in the input and does not invent fields. This is a deliberate trust signal and must not be "fixed" during implementation by adding a random assignee.

**Card visual treatment**: Matches the existing mock cards in the current `RightContent` implementation (white background, rounded-xl, label pill at top, task number + priority dot + title + description + footer with deadline/checklist/assignee avatar). Uses Lucide icons for task-number icon, checklist icon, calendar icon.

### 4. Animation timeline

Reuses the shared `elapsed` state pattern from `EveryDetailDemo` — one `setInterval` incrementing `elapsed` by 50ms, wrapping at `TIMELINE_TOTAL`. Both sub-components read from the same clock and derive their per-frame state from fractions of `elapsed / TIMELINE_TOTAL`.

```
0%  — 15%   Message 1 slides up + fades in on left
15% — 25%   Card 1 materializes on right via ai-shimmer-reveal
25% — 40%   Message 2 slides in
40% — 50%   Card 2 materializes
50% — 65%   Message 3 slides in
65% — 75%   Card 3 materializes
75% — 95%   Hold state — all messages and cards visible
95% —100%   Fade out, loop back to 0%
```

Cards trail their source messages by ~10% of the timeline — short enough to feel reactive (AI "responds" to each message), long enough to feel considered (AI "reads" before emitting).

**All animations use opacity and transform only** — no layout-affecting properties. This keeps the demo GPU-composited and reflow-free.

### 5. Visual container styling

**Container background**: `#DAE0F0` (soft blue) — already in Kolumn's label palette at `src/utils/formatting.js`, so it stays on-brand. Distinguishes the new showcase from the existing lilac (`#E8DDE2`) container.

**Container shape**: identical to existing demo — `rounded-2xl` with inset `1px #E0DBD5` shadow.

**CreamWindow aspect ratios** (matching existing demo):
- Left (`SlackThread`): `aspect-[4/3] md:aspect-[4/4.5]`
- Right (`ExtractedCards`): `aspect-[4/5]`

**Layout**: `flex flex-col md:flex-row md:items-center gap-4 md:gap-6 p-4 md:p-8` — stacks on mobile, side-by-side on `md:` and up. Same as existing demo.

### 6. Section heading and copy

**Headline**: `We read the <span class="font-heading text-[#8BA32E]">room</span>`
- Plays on two meanings of "read": parsing text + understanding social context
- Deliberately *not* "Slack in, cards out" — parallel construction with the adjacent "Notes in, kanban out" would read as template-filling rather than crafted copy

**Subtitle**: "Your team already talks in Slack. Kolumn listens, picks out the asks, and drops them on the board."

**Four feature bullets** (same `grid-cols-2 lg:grid-cols-4` row as existing showcase):

| Icon (Lucide) | Text |
|---|---|
| `AtSign` | Assignees from @mentions |
| `Clock` | Deadlines from casual phrases |
| `AlertCircle` | Priority from urgency cues |
| `Hash` | Labels from channel names |

**Icon imports**: `Clock` is already imported from `lucide-react` on line 6. Add `AtSign`, `AlertCircle`, and `Hash` to the existing `lucide-react` import block (lines 4-10).

### 7. Component architecture

```jsx
function SlackThreadDemo() {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed((prev) => (prev + 50 >= TIMELINE_TOTAL ? 0 : prev + 50))
    }, 50)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="w-full max-w-5xl">
      <div
        className="relative overflow-hidden w-full rounded-2xl bg-[#DAE0F0]"
        style={{ boxShadow: 'inset 0 0 0 1px #E0DBD5' }}
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 p-4 md:p-8">
          <CreamWindow className="aspect-[4/3] md:aspect-[4/4.5]">
            <SlackThread elapsed={elapsed} />
          </CreamWindow>
          <CreamWindow className="aspect-[4/5]">
            <ExtractedCards elapsed={elapsed} />
          </CreamWindow>
        </div>
      </div>
    </div>
  )
}
```

**New sub-components (both inline in `LandingPage.jsx`)**:
- `SlackThread({ elapsed })` — renders channel header + 3 messages with per-message opacity/transform derived from `elapsed`
- `ExtractedCards({ elapsed })` — renders 3 kanban-card mocks with per-card ai-shimmer-reveal driven by `elapsed`

**Reused from existing demo**:
- `CreamWindow` component — unchanged
- `TIMELINE_TOTAL` constant — unchanged
- `ai-shimmer-reveal` CSS class and `--reveal` variable technique — unchanged

### 8. Section JSX placement

Replace the current Tools Strip section (`src/pages/LandingPage.jsx:1205-1238`) with a new `<section>` that mirrors the structure of the existing "AI Card Generation Showcase" (lines 1147-1181):

```jsx
{/* ─── Slack Thread Showcase ─── */}
<section className="px-6 sm:px-10 py-14 max-w-6xl mx-auto">
  {/* Heading + intro centered */}
  <div className="text-center mb-8 max-w-2xl mx-auto">
    <h2 className="text-3xl sm:text-4xl font-normal text-[#1B1B18] tracking-tight mb-3">
      We read the <span className="text-[#8BA32E] font-heading">room</span>
    </h2>
    <p className="text-sm text-[#5C5C57] leading-relaxed">
      Your team already talks in Slack. Kolumn listens, picks out the asks,
      and drops them on the board.
    </p>
  </div>

  {/* Feature bullets — horizontal row */}
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10 max-w-4xl mx-auto">
    {/* 4 bullets: AtSign, Clock, AlertCircle, Hash */}
  </div>

  {/* Full-width animated demo */}
  <div className="flex justify-center">
    <SlackThreadDemo />
  </div>
</section>
```

## Files affected

| File | Change |
|---|---|
| `src/pages/LandingPage.jsx` | Add `AtSign, AlertCircle, Hash` to lucide-react imports. Add `SlackThreadDemo`, `SlackThread`, `ExtractedCards` inline component definitions (after existing demo components, ~line 995). Replace Tools Strip section (1205-1238) with new Slack Thread Showcase section. Remove references to the `tools` array if it is no longer used anywhere else (verify via grep before deletion). |

**No new files created.**

## Success criteria

1. New section renders on the landing page between Features Grid and CTA
2. Animation loops smoothly with left and right panels synchronized via shared `elapsed` clock
3. Three Slack messages appear in sequence on the left with opacity/transform transitions
4. Three cards materialize in sequence on the right via ai-shimmer-reveal, trailing each message by ~10% of the timeline
5. Card 3 visibly lacks an assignee avatar and deadline pill (honesty signal preserved)
6. Container background is `#DAE0F0` (soft blue), visually distinct from the existing lilac showcase
7. Headline renders as "We read the room" with "room" in accent green Sentient/heading font
8. Responsive: stacks vertically on mobile, side-by-side on `md:` breakpoint and up
9. No console errors or warnings during the animation loop
10. `npm run build` succeeds without errors
11. Tools Strip section is fully removed from the rendered output; the `tools` array is either removed or left in place only if referenced elsewhere

## Testing approach

Manual verification on the dev server (`npm run dev`, http://localhost:5173/):

- Scroll to the new section; observe at least one full animation loop
- Confirm the three messages land in sequence on the left
- Confirm cards trail messages on the right by the intended timing
- Confirm Card 3 is visibly sparser than Cards 1 and 2 (no avatar, no deadline)
- Resize browser to mobile width; confirm panels stack vertically
- Resize to desktop width; confirm panels sit side-by-side
- Open devtools console; confirm no errors or warnings during the loop
- Run `npm run build` locally and confirm clean exit

Project has no unit test suite (per CLAUDE.md), so this is the full verification path.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| `CreamWindow` or `TIMELINE_TOTAL` turn out to be named differently in the actual code than assumed | Implementation plan's first step should be reading `EveryDetailDemo` in full to confirm exact names before writing new code |
| The ai-shimmer-reveal technique only works on text, not card backgrounds, and behaves unexpectedly for card mocks | Implementation plan should verify by testing the first card's reveal in isolation before building all three |
| Removing the `tools` array breaks some other section that imports it | Before deletion, grep for `tools` usage across `LandingPage.jsx` and confirm it is only referenced in the Tools Strip block |
| Visitors find the two back-to-back showcases monotonous despite the separator section | The blue vs lilac container colors, different headline construction, and different input metaphor are the mitigation; post-launch, monitor scroll-depth analytics if available |
