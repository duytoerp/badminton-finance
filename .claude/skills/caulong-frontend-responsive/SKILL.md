---
name: caulong-frontend-responsive
description: How the Badminton Finance React frontend renders the same data as mobile cards (<768px) and desktop tables (≥1024px) from one codebase — Shell, useBreakpoint, ResponsiveSheet, DataTable patterns. Load before adding or modifying any React page, before adding new shared components, or when a page "only works on desktop / only works on mobile".
---

# Dual mobile / desktop layout

The project has one rule: **no page is mobile-only, no page is desktop-only**. Every page renders correctly at both breakpoints with the same data and the same business logic. Only the *presentation* differs.

## Breakpoints (from [useBreakpoint.ts](../../../frontend/src/hooks/useBreakpoint.ts))

| Width | Name | Layout |
|---|---|---|
| < 768 | `mobile` | AppBar top + BottomNav + card list + FAB + BottomSheet |
| 768 – 1023 | `tablet` | Same as mobile but cards a bit wider |
| ≥ 1024 | `desktop` | Sidebar left + PageHeader + DataTable + Drawer/Modal |

Two helper hooks:

```ts
const desktop = useIsDesktop();   // boolean
const bp = useBreakpoint();       // 'mobile' | 'tablet' | 'desktop'
```

Resize listener auto-updates — components re-render when the user resizes the browser.

## How the shell switches

[Shell.tsx](../../../frontend/src/components/layout/Shell.tsx) wraps every route except `/login`:

- `desktop === true` → renders `<Sidebar />` + `<main>{children}</main>` inside a CSS Grid `240px 1fr`. AppBar and BottomNav are hidden via CSS (`.shell-desktop .appbar { display: none }`).
- otherwise → renders `{children}` + `<BottomNav />`. Pages render their own `<AppBar title="…" />`.

So **the page itself decides** what to render based on `useIsDesktop()`. Shell only picks the chrome.

## The two layouts per page

Template — copy this when creating a new page:

```tsx
export default function MyPage() {
  const desktop = useIsDesktop();
  const [items, setItems] = useState<Foo[]>([]);
  useEffect(() => { listFoos().then(r => setItems(r.data)); }, []);

  if (desktop) {
    return (
      <div className="page">
        <PageHeader title="Foo" actions={<button className="btn">+ Thêm</button>} />
        <DataTable columns={...} rows={items} rowKey={r => r.id} />
      </div>
    );
  }

  return (
    <>
      <AppBar title="Foo" />
      <div className="page">
        {items.map(f => <FooCard key={f.id} foo={f} />)}
      </div>
      <button className="fab">+</button>
    </>
  );
}
```

**Crucially**: data fetching, mutations, business logic — they're shared and live above the `if (desktop)` split. Only JSX differs.

Reference implementations to copy from:
- Simple read-only: [Courts.tsx](../../../frontend/src/pages/Courts.tsx)
- With filters + actions + pagination: [Sessions.tsx](../../../frontend/src/pages/Sessions.tsx)
- With tabs (desktop only) + complex CRUD: [SessionDetail.tsx](../../../frontend/src/pages/SessionDetail.tsx)
- With chart + export: [Reports.tsx](../../../frontend/src/pages/Reports.tsx)

## Shared components and when to use which

| Component | Use for | File |
|---|---|---|
| `DataTable` | Desktop tables. Sortable headers, sticky thead, scroll-x, pager built in. | [DataTable.tsx](../../../frontend/src/components/common/DataTable.tsx) |
| `PlayerCard` | Mobile list item for players. Pattern to follow for other entities. | [PlayerCard.tsx](../../../frontend/src/components/common/PlayerCard.tsx) |
| `ResponsiveSheet` | Forms. Renders as `Drawer` on desktop, `BottomSheet` on mobile — **prefer this over picking yourself**. | [ResponsiveSheet.tsx](../../../frontend/src/components/common/ResponsiveSheet.tsx) |
| `Drawer` | Desktop-only side panel (480px right). Use directly only if you really don't want it on mobile. | [Drawer.tsx](../../../frontend/src/components/common/Drawer.tsx) |
| `BottomSheet` | Mobile-only modal from bottom. | [BottomSheet.tsx](../../../frontend/src/components/common/BottomSheet.tsx) |
| `Modal` | Centered modal — info dialogs, view-only details (audit log JSON viewer uses it). | [Modal.tsx](../../../frontend/src/components/common/Modal.tsx) |
| `BarChart` | SVG bar chart, no external dep. Use on dashboard / reports. | [BarChart.tsx](../../../frontend/src/components/common/BarChart.tsx) |
| `PageHeader` (from `Shell`) | Desktop page top. **Don't render `<AppBar>` AND `<PageHeader>` together** — `AppBar` is hidden on desktop, but it muddies things. Pattern: PageHeader inside `if (desktop)`, AppBar in the other branch. | [Shell.tsx](../../../frontend/src/components/layout/Shell.tsx) |

## CSS architecture

Two stylesheets layered:

1. [global.css](../../../frontend/src/styles/global.css) — mobile-first design tokens, all the card / form / bottom-sheet / bottom-nav / FAB styles.
2. [desktop.css](../../../frontend/src/styles/desktop.css) — sidebar, tables, drawers, kpi grid, tabs, chart, filter-bar. Imported once in [App.tsx](../../../frontend/src/App.tsx).

Both unconditionally loaded — switching is by class (`.shell-desktop`) and media queries.

Utility classes:
- `.desktop-only`, `.mobile-only` — hide via media query (cheap escape hatch for a tiny element).
- `.btn-sm`, `.btn-ghost` — compact button variants for desktop tables.
- `.num` on a `<th>` or `<td>` — right-align + tabular numerals for money columns.
- `.kpi.success`, `.kpi.danger`, `.kpi.primary` — color the value of a KPI card.

## Conventions to keep

- **iOS zoom fix**: inputs must be `font-size: 16px` minimum, already set in global.css. Don't override smaller.
- **Tap targets**: buttons ≥ 48px height by default (`.btn`). Use `.btn-sm` (32px) only for inline desktop actions in tables.
- **`viewport-fit=cover` + safe-area**: already in index.html. BottomNav respects `var(--safe-bottom)`.
- **Money format**: `(n || 0).toLocaleString('vi-VN') + 'đ'`. Avoid mixing locales.
- **Date format**: `new Date(s).toLocaleDateString('vi-VN')` for dates, `…toLocaleString('vi-VN')` for date+time.

## Where the mobile tab bar links to

[BottomNav.tsx](../../../frontend/src/components/layout/BottomNav.tsx) has exactly **5 tabs** (constraint of the grid layout). Currently: Home, Sessions, Players, Fund, Reports. If you must add a new section to mobile, replace one — don't extend to 6, the layout breaks.

Desktop sidebar has unlimited room — add new admin pages there freely.

## Common mistakes

- Building a page that only handles `desktop` — works in dev but breaks for the at-court user. Always test by shrinking the browser.
- Using `Drawer` for a form that also fires on mobile — use `ResponsiveSheet`.
- Putting business logic inside the `if (desktop)` branch — duplicate code, drifts over time. Keep it above.
- Adding `<input>` without `font-size: 16px` — iOS will zoom in and your form goes off-screen.
- Hardcoded width breakpoints in component CSS — use the `useBreakpoint` hook or the `.desktop-only` / `.mobile-only` utility, don't add new media queries scattered around.
