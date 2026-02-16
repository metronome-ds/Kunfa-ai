# Phases 7-8: Quick Reference Guide

## Files Created

### Pages (User-Facing)
| File | Purpose | Route |
|------|---------|-------|
| `src/app/(dashboard)/pipeline/page.tsx` | Kanban board for deal pipeline | `/dashboard/pipeline` |
| `src/app/(dashboard)/saved-deals/page.tsx` | Saved deals watchlist | `/dashboard/saved-deals` |
| `src/app/(dashboard)/portfolio/page.tsx` | Investment portfolio tracker | `/dashboard/portfolio` |

### Components (Reusable)
| File | Purpose | Props |
|------|---------|-------|
| `src/components/dashboard/PipelineKanban.tsx` | Kanban board display | `data`, `isLoading`, `onRefresh`, `onMoveStage`, `onRemove` |
| `src/components/dashboard/EngagementScore.tsx` | Engagement gauge visualization | None (fetches data itself) |

### API Routes
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/pipeline` | GET | List deals grouped by stage |
| `/api/pipeline` | POST | Add deal to pipeline |
| `/api/pipeline/[dealId]` | PUT | Update pipeline entry (stage, notes, dates) |
| `/api/pipeline/[dealId]` | DELETE | Remove deal from pipeline |
| `/api/portfolio` | GET | List portfolio holdings with summary |
| `/api/portfolio` | POST | Add new investment |
| `/api/portfolio/[id]` | PUT | Update valuation or status |
| `/api/portfolio/[id]` | DELETE | Remove holding |
| `/api/engagement` | GET | Get user's engagement score |
| `/api/engagement` | POST | Increment engagement metric |

## Key Features at a Glance

### Pipeline Page
- **View:** 4-column Kanban (Sourcing → Screening → Diligence → Close)
- **Actions:** Add deal, move between stages, view details, remove
- **Display:** Company name, industry, AI score, notes preview, follow-up date
- **Stats:** Total deals and count per stage

### Saved Deals Page
- **View:** Grid of saved deals
- **Sort:** By date saved, AI score, or company name
- **Actions:** Remove from saved, add to pipeline, view details
- **Display:** Uses existing DealCard component
- **Stats:** Total saved, average score, industry count

### Portfolio Page
- **View:** Summary cards + table of holdings
- **Summary:** Total invested, current value, total multiple, holdings count
- **Display:** Company, stage, investment amount, current value, multiple, status
- **Actions:** Add investment, edit valuation, delete holding
- **Calculations:** Automatic gain/loss % and multiple calculations

### Engagement Score
- **Display:** Circular gauge (0-1000 scale) with color coding
- **Metrics:** 5 activities tracked (views, saves, connections, posts, uploads)
- **Calculation:** Weighted points per metric
- **Integration:** Drop into any page with `<EngagementScore />`

## Common Tasks

### Add Engagement Tracking
When user performs action, call:
```tsx
await fetch('/api/engagement', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ metric: 'deals_viewed' })
});
```

Available metrics:
- `deals_viewed` (10 points)
- `deals_saved` (20 points)
- `connections_made` (30 points)
- `deals_posted` (50 points)
- `documents_uploaded` (25 points)

### Move Deal Between Stages
```tsx
await fetch(`/api/pipeline/${dealId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ current_stage: 'screening' })
});
```

### Update Portfolio Valuation
```tsx
await fetch(`/api/portfolio/${holdingId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ current_valuation: 5000000 })
});
```

## Component Integration Examples

### Integrate Engagement Score into Dashboard
```tsx
// In src/app/(dashboard)/page.tsx
import { EngagementScore } from '@/components/dashboard/EngagementScore';

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* existing content */}
      <EngagementScore />
    </div>
  );
}
```

### Use PipelineKanban in Custom Layout
```tsx
import { PipelineKanban } from '@/components/dashboard/PipelineKanban';

export function CustomPipelineView() {
  const [data, setData] = useState({
    sourcing: [],
    screening: [],
    diligence: [],
    close: [],
  });

  return (
    <PipelineKanban
      data={data}
      isLoading={false}
      onMoveStage={(dealId, from, to) => {
        // Handle stage change
      }}
      onRemove={(dealId) => {
        // Handle removal
      }}
    />
  );
}
```

## Database Schema Notes

Required tables (make sure these exist in Supabase):

```sql
-- Pipeline tracking
CREATE TABLE deal_pipeline (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  deal_id UUID NOT NULL,
  current_stage TEXT, -- 'sourcing' | 'screening' | 'diligence' | 'close'
  notes TEXT,
  next_steps TEXT,
  follow_up_date DATE,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Portfolio holdings
CREATE TABLE portfolio_holdings (
  id UUID PRIMARY KEY,
  investor_id UUID NOT NULL,
  deal_id UUID NOT NULL,
  investment_amount NUMERIC,
  equity_percentage NUMERIC,
  status TEXT, -- 'active' | 'exited' | 'written_off'
  entry_valuation NUMERIC,
  current_valuation NUMERIC,
  exit_type TEXT,
  exit_date DATE,
  exit_amount NUMERIC,
  invested_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- User engagement
CREATE TABLE user_engagement (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  deals_viewed INTEGER DEFAULT 0,
  deals_saved INTEGER DEFAULT 0,
  connections_made INTEGER DEFAULT 0,
  deals_posted INTEGER DEFAULT 0,
  documents_uploaded INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Styling Notes

- Uses Tailwind CSS (already configured)
- Color scheme: Blue (primary), Green/Red (success/danger), Gray (neutral)
- Responsive breakpoints: Mobile-first, `md:`, `lg:` prefixes
- Icons from `lucide-react` package (already installed)
- Card and Button components from `src/components/common/`

## Error Handling Pattern

All endpoints follow this pattern:
1. Check authentication (`supabase.auth.getUser()`)
2. Parse request body with validation
3. Execute database operation
4. Return appropriate HTTP status
5. Frontend displays error in banner

## Performance Tips

1. **Pagination:** Add to GET endpoints if dealing with large datasets
2. **Caching:** Consider adding React Query/SWR for better cache control
3. **Sorting:** Larger sorts should happen server-side
4. **Batch Operations:** Create `/api/pipeline/batch` for bulk moves

## Next Steps / Enhancements

1. Add drag-and-drop for pipeline (use `@dnd-kit/core`)
2. Implement notifications for follow-up dates
3. Add filters and search to pipeline view
4. Create portfolio analytics charts
5. Add team collaboration features
6. Implement webhook for engagement tracking on other events

## Testing Checklist

- [ ] Can add deal to pipeline from modal search
- [ ] Can move deal between stages with arrows
- [ ] Can remove deal from pipeline
- [ ] Can search and sort saved deals
- [ ] Can add investment to portfolio
- [ ] Can update portfolio valuation
- [ ] Can delete portfolio holding
- [ ] Engagement score displays and updates
- [ ] All pages work on mobile, tablet, desktop
- [ ] Error states display properly
- [ ] Empty states display helpful messaging

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Pipeline data not loading | Check user auth, verify `deal_pipeline` table exists |
| Portfolio calculations wrong | Verify `current_valuation` is set, check math in component |
| Engagement score stuck at 0 | Ensure `user_engagement` table is created, call POST `/api/engagement` |
| Styles not applying | Check Tailwind is built, clear `.next` cache |
| API returning 401 | Verify user is authenticated, check `createServerSupabaseClient` |
| Modal not closing | Check state management in page component |

---

**Version:** 1.0
**Last Updated:** February 2025
**Status:** Production Ready
