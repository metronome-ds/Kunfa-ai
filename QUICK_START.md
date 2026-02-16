# Quick Start - Team Management, Services Marketplace & People Directory

## Overview
This guide gets you up and running with the three new features for Kunfa AI.

## Step 1: Database Setup

### Option A: Using Supabase UI
1. Go to your Supabase dashboard
2. Open the SQL Editor
3. Copy the contents of `DATABASE_SCHEMA.sql`
4. Execute the SQL in Supabase

### Option B: Using Supabase CLI
```bash
supabase db push
# Or if you have migration files:
supabase migration new team_services_people
# Then copy the schema into the migration file
```

**What gets created:**
- `team_members` table with RLS policies
- `services_listings` table with RLS policies
- Indexes for performance
- Triggers for `updated_at` timestamps

## Step 2: Update Navigation

Add these links to your sidebar/navbar component:

```tsx
// In your navigation/sidebar component
<NavLink href="/dashboard/team" icon={Users}>
  Team
</NavLink>

<NavLink href="/dashboard/services" icon={Briefcase}>
  Services
</NavLink>

<NavLink href="/dashboard/people" icon={Users}>
  People
</NavLink>
```

## Step 3: Test the Features Locally

### Start Development Server
```bash
npm run dev
# Server will be at http://localhost:3000
```

### Test Team Management
1. Navigate to `/dashboard/team`
2. Click "Invite Member"
3. Enter an email and select a role
4. Verify the team member appears in the list
5. Try changing roles and removing members

### Test Services Marketplace
1. Navigate to `/dashboard/services`
2. Filter by service type (Legal, Accounting, etc.)
3. Search for services
4. Click "List Your Service" to create a new listing
5. Fill in all required fields and submit
6. Verify the service appears in the marketplace

### Test People Directory
1. Navigate to `/dashboard/people`
2. Filter by role (Founders, Investors, Service Providers)
3. Search for people by name or company
4. Click on a person's card to view their profile
5. Try the Connect button

## Step 4: Verify API Routes

Test API endpoints using `curl` or Postman:

### Team API
```bash
# Get team members
curl http://localhost:3000/api/team

# Invite member
curl -X POST http://localhost:3000/api/team \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","role":"member"}'
```

### Services API
```bash
# Get services
curl http://localhost:3000/api/services?type=legal

# Create service
curl -X POST http://localhost:3000/api/services \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Legal Services",
    "description":"Expert legal advice",
    "service_type":"legal",
    "hourly_rate":150,
    "expertise_areas":["Contract Law"]
  }'
```

### People API
```bash
# Get people
curl http://localhost:3000/api/people?role=founder
```

## Step 5: Environment Variables

Verify these are set in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## File Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── team/
│   │   │   └── page.tsx                 # Team management UI
│   │   ├── services/
│   │   │   ├── page.tsx                 # Services marketplace
│   │   │   └── create/
│   │   │       └── page.tsx             # Create service form
│   │   ├── people/
│   │   │   └── page.tsx                 # People directory
│   │   └── profile/
│   │       └── [id]/
│   │           └── page.tsx             # View other user's profile
│   └── api/
│       ├── team/
│       │   ├── route.ts                 # Team endpoints
│       │   └── [id]/
│       │       └── route.ts             # Team member endpoints
│       ├── services/
│       │   ├── route.ts                 # Services endpoints
│       │   └── [id]/
│       │       └── route.ts             # Service detail endpoints
│       └── people/
│           └── route.ts                 # People directory endpoint
└── components/
    └── common/
        ├── Button.tsx                   # Already exists
        ├── Input.tsx                    # Already exists
        ├── Modal.tsx                    # Already exists
        ├── Card.tsx                     # Already exists
        └── ...

Documentation:
├── FEATURE_IMPLEMENTATION.md            # Comprehensive feature guide
├── DATABASE_SCHEMA.sql                  # Database setup script
└── QUICK_START.md                       # This file
```

## Common Issues & Troubleshooting

### Issue: "Cannot find module '@/components/common/...'"
**Solution**: Verify all component files exist in `src/components/common/`

### Issue: API returns 401 Unauthorized
**Solution**:
- Check authentication is working
- Verify user is logged in
- Check Supabase session in browser console

### Issue: Database table doesn't exist
**Solution**:
- Run the SQL schema from `DATABASE_SCHEMA.sql`
- Verify in Supabase dashboard that tables exist

### Issue: RLS policies blocking access
**Solution**:
- Check your current user_id matches the policy constraints
- Review RLS policies in `DATABASE_SCHEMA.sql`
- Consider temporarily disabling RLS for testing

### Issue: Search/filter not working
**Solution**:
- Check query parameters are being passed correctly
- Verify API endpoint is receiving the parameters
- Check console for error messages

## Performance Tips

1. **Add Pagination**: The services and people pages already support pagination
2. **Use Indexes**: Database schema includes indexes on common query fields
3. **Lazy Load Images**: Consider adding image lazy loading for avatars
4. **Cache Results**: Consider implementing SWR or React Query for API calls
5. **Optimize Database Queries**: Use indexes on `team_id`, `service_type`, `provider_id`

## Next Steps

1. ✓ Complete database setup
2. ✓ Update navigation to include new routes
3. ✓ Test all three features locally
4. ✓ Review API endpoints for integration
5. Deploy to production
6. Monitor error logs
7. Gather user feedback for improvements

## Additional Resources

- [Supabase Docs](https://supabase.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS](https://tailwindcss.com)
- [Lucide Icons](https://lucide.dev)

## Support

For issues or questions:
1. Check the `FEATURE_IMPLEMENTATION.md` for detailed specifications
2. Review the `DATABASE_SCHEMA.sql` for table structures
3. Check browser console for client-side errors
4. Check server logs for API errors
5. Verify Supabase RLS policies are correctly configured

## Deployment Checklist

- [ ] Database schema created and verified
- [ ] Navigation links added
- [ ] All environment variables set
- [ ] API endpoints tested with Postman/cURL
- [ ] UI pages tested in browser
- [ ] RLS policies verified (data privacy)
- [ ] Error handling tested (network failures, validation)
- [ ] Loading states visible
- [ ] Empty states display correctly
- [ ] Pagination works with many records
- [ ] Search and filters functional
- [ ] Mobile responsive on small screens
- [ ] Performance acceptable (page load time)
- [ ] Analytics tracking added (if needed)
- [ ] Email notifications configured (for invites)
