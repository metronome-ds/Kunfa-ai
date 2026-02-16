# Team Management, Services Marketplace & People Directory - Implementation Guide

## Overview
This document covers the implementation of three major features for Kunfa AI (Phases 10 and 13):
1. **Team Management** - Manage team members and permissions
2. **Services Marketplace** - Browse and list professional services
3. **People Directory** - Discover and connect with other platform users

---

## Feature 1: Team Management

### Files Created
- `/src/app/(dashboard)/team/page.tsx` - Team management UI
- `/src/app/api/team/route.ts` - GET/POST team endpoints
- `/src/app/api/team/[id]/route.ts` - PUT/DELETE team member endpoints

### Functionality
- **View Team Members**: Display all team members in a table/card layout with:
  - Avatar, Full Name, Email
  - Role (Admin/Member/Viewer) with color-coded badges
  - Status (Pending/Accepted)
  - Joined date

- **Invite Members**: Modal form to invite new team members with:
  - Email input (required)
  - Role selector (Admin/Member/Viewer)
  - Validation and error handling
  - Success confirmation

- **Manage Roles**: Change member roles via dropdown menu
  - Admin: Full access to all features
  - Member: Can view and manage deals
  - Viewer: Read-only access

- **Remove Members**: Delete team members with confirmation dialog

- **Empty State**: Helpful message when no team members exist

### Database Tables Required
```
team_members:
  - id (UUID, primary key)
  - team_id (UUID, foreign key)
  - user_id (UUID, nullable, foreign key to users)
  - email (text)
  - role (enum: admin, member, viewer)
  - status (enum: pending, accepted)
  - joined_at (timestamp)
  - created_at (timestamp)
  - updated_at (timestamp)
```

### API Endpoints

#### GET /api/team
List team members for the current user's team
```
Response: {
  data: TeamMember[]
}
```

#### POST /api/team
Invite a team member
```
Body: {
  email: string (required),
  role: 'admin' | 'member' | 'viewer' (required)
}
Response: {
  data: TeamMember,
  message: string
}
```

#### PUT /api/team/[id]
Update team member role
```
Body: {
  role: 'admin' | 'member' | 'viewer' (required)
}
Response: {
  data: TeamMember,
  message: string
}
```

#### DELETE /api/team/[id]
Remove a team member
```
Response: {
  message: string
}
```

---

## Feature 2: Services Marketplace

### Files Created
- `/src/app/(dashboard)/services/page.tsx` - Services marketplace UI
- `/src/app/(dashboard)/services/create/page.tsx` - Create service listing form
- `/src/app/api/services/route.ts` - GET/POST services endpoints
- `/src/app/api/services/[id]/route.ts` - GET/PUT/DELETE service endpoints

### Functionality

#### Services Marketplace Page
- **Browse Services**: Grid display of service provider cards
- **Search**: Full-text search across provider names and service titles
- **Filter by Type**: Buttons to filter services by category:
  - Legal
  - Accounting
  - HR
  - Compliance
  - Consulting

- **Service Cards Display**:
  - Provider avatar, name, headline
  - Service type badge
  - Description (truncated)
  - Hourly rate with $ icon
  - Expertise areas as tags (show first 3, indicate count for additional)
  - "Contact" button (navigates to provider profile)

- **Admin Feature**: "List Your Service" button for service providers
- **Pagination**: Navigate through services with prev/next controls
- **Empty State**: Message when no services match filters

#### Create Service Page
- **Form Fields**:
  - Service Title (text, required)
  - Service Description (textarea, required)
  - Service Type (dropdown, required)
  - Hourly Rate (number, required)
  - Areas of Expertise (multi-select, required - min 1)
  - Certifications (multi-select, optional)

- **Interactive Features**:
  - Add/remove expertise areas dynamically
  - Add/remove certifications dynamically
  - Enter key support for quick addition
  - Validation with helpful error messages
  - Success redirect back to marketplace

### Database Tables Required
```
services_listings:
  - id (UUID, primary key)
  - provider_id (UUID, foreign key to users)
  - title (text)
  - description (text)
  - service_type (enum: legal, accounting, hr, compliance, consulting)
  - hourly_rate (numeric)
  - expertise_areas (text array)
  - certifications (text array)
  - created_at (timestamp)
  - updated_at (timestamp)
```

### API Endpoints

#### GET /api/services
List services with filters and pagination
```
Query Params:
  - type?: string (filter by service type)
  - search?: string (search by title or description)
  - page?: number (default: 1)
  - limit?: number (default: 20, max: 100)

Response: {
  data: Service[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

#### POST /api/services
Create a service listing
```
Body: {
  title: string (required),
  description: string (required),
  service_type: string (required),
  hourly_rate: number (required),
  expertise_areas: string[] (required),
  certifications?: string[]
}
Response: {
  data: Service,
  message: string
}
```

#### GET /api/services/[id]
Get service detail
```
Response: {
  data: Service
}
```

#### PUT /api/services/[id]
Update service listing
```
Body: {
  title?: string,
  description?: string,
  service_type?: string,
  hourly_rate?: number,
  expertise_areas?: string[],
  certifications?: string[]
}
Response: {
  data: Service,
  message: string
}
```

#### DELETE /api/services/[id]
Delete service listing
```
Response: {
  message: string
}
```

---

## Feature 3: People Directory

### Files Created
- `/src/app/(dashboard)/people/page.tsx` - People directory UI
- `/src/app/(dashboard)/profile/[id]/page.tsx` - View other user's profile
- `/src/app/api/people/route.ts` - GET people endpoint

### Functionality

#### People Directory Page
- **Search**: Full-text search across name, company, and headline
- **Filter by Role**:
  - All People
  - Founders
  - Investors
  - Service Providers

- **People Cards Display**:
  - Avatar (initials fallback)
  - Full Name (heading)
  - Headline (subheading)
  - Company (with briefcase icon)
  - Location (with map pin icon)
  - Role badge with color coding:
    - Founders: Purple
    - Investors: Green
    - Service Providers: Blue
  - Interests (show first 4 tags)
  - "View Profile" button

- **Pagination**: Navigate through people with smart pagination UI
- **Empty State**: Helpful message when no results match filters
- **Responsive Grid**: 1 column mobile, 2 columns tablet, 3 columns desktop

#### View Other User's Profile
- **Read-only Profile Display**:
  - Header background gradient
  - Large avatar with initials fallback
  - Full name and headline
  - Role badge
  - Company, Location, Member since date
  - LinkedIn link (if verified)

- **Action Buttons**:
  - Connect (send connection request)
  - Message (placeholder for messaging feature)

- **Content Sections**:
  - About (bio text, if exists)
  - Interests (tags)
  - Additional Stats for role-specific info:
    - **Investors**: Deals Viewed, Engagement Score, Connections
    - **Founders**: Listed Companies

- **Error Handling**: Graceful handling of missing profiles
- **Navigation**: Back button to return to directory

### Database Tables Required
Uses existing `users` table, returns only public profile data:
```
Public fields returned:
  - id
  - user_id
  - full_name
  - headline
  - company
  - location
  - avatar_url
  - role
  - interests
  - created_at
```

### API Endpoints

#### GET /api/people
List users with search and role filter
```
Query Params:
  - search?: string (search by name, company, headline)
  - role?: string (filter by role - all, founder, investor, service_provider)
  - page?: number (default: 1)
  - limit?: number (default: 20, max: 100)

Response: {
  data: Person[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}

Person structure (public data only):
{
  id: string,
  user_id: string,
  full_name: string,
  headline: string | null,
  company: string | null,
  location: string | null,
  avatar_url: string | null,
  role: string,
  interests: string[],
  created_at: string
}
```

---

## Styling & Components

### Tailwind CSS Utilities Used
- `grid` layouts (responsive columns)
- `flex` utilities (centering, gaps)
- `bg-*` colors (blue, gray, green, red, purple gradients)
- `text-*` sizes and weights
- `rounded-*` border radius
- `shadow-*` for card elevation
- `hover:*` transition effects
- `border-*` for dividers and outlines
- `animate-*` for loading spinners and transitions

### Reusable Components
- `Button` - Primary, secondary, danger, ghost, outline variants
- `Input` - Text input with Tailwind styling
- `Modal` - Dialog component with overlay
- `Card` - Container with shadow and padding
- Icons from `lucide-react`: Users, Plus, Search, Briefcase, MessageCircle, etc.

### Component Features
- **Loading States**: Spinner animation while fetching data
- **Empty States**: Descriptive messages with icons
- **Error Messages**: Red-colored alerts with context
- **Success Messages**: Green-colored confirmations
- **Disabled States**: Grayed out buttons with cursor changes
- **Responsive Design**: Mobile-first approach with md: and lg: breakpoints

---

## Integration Checklist

### Database Setup
- [ ] Create `team_members` table with all columns and relationships
- [ ] Create `services_listings` table with all columns and relationships
- [ ] Add foreign key constraints for user relationships
- [ ] Create indexes on `team_id`, `service_type`, `provider_id` for performance
- [ ] Add RLS (Row Level Security) policies for team and services tables

### Navigation Integration
Add links to sidebar/navbar to access new features:
- [ ] `/dashboard/team` - Team Management
- [ ] `/dashboard/services` - Services Marketplace
- [ ] `/dashboard/services/create` - Create Service (for providers only)
- [ ] `/dashboard/people` - People Directory

### Feature Flags (Optional)
Consider adding feature flags for:
- [ ] Services marketplace access
- [ ] People directory visibility
- [ ] Team management capabilities

### Testing Scenarios

#### Team Management
- [ ] Invite new member with valid email
- [ ] Invite with invalid email format
- [ ] Change member role from Member to Admin
- [ ] Remove team member with confirmation
- [ ] View team with no members (empty state)
- [ ] Check pagination if >10 members

#### Services Marketplace
- [ ] Browse all services without filters
- [ ] Filter services by type (Legal, Accounting, etc.)
- [ ] Search services by provider name
- [ ] Search services by service title
- [ ] Create new service listing with all fields
- [ ] Create service without expertise areas (validation error)
- [ ] Contact provider (navigate to their profile)
- [ ] Edit own service listing
- [ ] Delete service with confirmation

#### People Directory
- [ ] View all people without filters
- [ ] Filter people by role (Founders, Investors, Service Providers)
- [ ] Search people by name
- [ ] Search people by company
- [ ] Click to view other user's profile
- [ ] Send connection request
- [ ] View investor profile with engagement stats
- [ ] View founder profile with company info
- [ ] Check pagination for >10 people

---

## Future Enhancements

1. **Team Management**
   - Bulk invite via CSV
   - Team roles with fine-grained permissions
   - Activity logs for team actions
   - Team workspace separation

2. **Services Marketplace**
   - Ratings and reviews for service providers
   - Booking system with calendar integration
   - Payment processing for service contracts
   - Service delivery tracking

3. **People Directory**
   - Messaging system between users
   - Connection management (accept/reject)
   - Advanced profile filtering
   - Suggested connections based on interests
   - Public portfolio for founders/investors

4. **General**
   - Real-time notifications for connections
   - Email notifications for invites
   - Analytics dashboard for marketplace
   - Admin moderation tools

---

## Environment Variables Required
Ensure these are set in your environment:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Testing API Routes Locally

### Using cURL or Postman

#### Team Management
```bash
# List team members
curl -X GET http://localhost:3000/api/team

# Invite member
curl -X POST http://localhost:3000/api/team \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","role":"member"}'

# Update role
curl -X PUT http://localhost:3000/api/team/[member-id] \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'

# Remove member
curl -X DELETE http://localhost:3000/api/team/[member-id]
```

#### Services
```bash
# List services
curl -X GET "http://localhost:3000/api/services?type=legal&page=1"

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

# Get service detail
curl -X GET http://localhost:3000/api/services/[service-id]
```

#### People
```bash
# List people
curl -X GET "http://localhost:3000/api/people?role=founder&search=John"
```

---

## Support & Documentation
For questions or issues, refer to:
- Supabase documentation: https://supabase.com/docs
- Next.js App Router: https://nextjs.org/docs/app
- Tailwind CSS: https://tailwindcss.com/docs
- Lucide Icons: https://lucide.dev
