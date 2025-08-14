# Nurtiv - AI-Powered Social Care Assistant

A comprehensive multi-tenant platform designed for social care organizations, featuring AI-powered voice transcription, intelligent care summaries, and family communication tools.

## 🌟 Key Features

### Multi-Tenant Architecture
- **Organization-scoped data**: Complete isolation between tenants with `orgId` on every document
- **Role-based access control**: Owner, Admin, Carer, and Viewer roles
- **Strict security**: Server-side tenant guards prevent cross-organization data access
- **Scalable design**: Single MongoDB cluster with compound indexes for performance

### AI-Powered Care Notes
- **Voice Recording**: WebRTC-based audio capture with real-time duration tracking
- **Speech-to-Text**: OpenAI Whisper integration for accurate transcription
- **Intelligent Summaries**: GPT-4o-mini generates structured observations, risks, and actions
- **Mood Analysis**: Automatic mood classification from care interactions

### Offline-First Design
- **IndexedDB Storage**: Local caching of patients, notes, and actions
- **Background Sync**: Automatic data synchronization when connection restored
- **Offline Indicator**: Visual status and pending sync counter
- **Graceful Degradation**: Core functionality works without internet

### Care Communication
- **Quick Brief**: AI-generated pre-visit summaries for carers
- **Family Updates**: Warm, accessible updates in plain language
- **Multi-language Support**: Translation to Italian, Polish, Spanish
- **Text-to-Speech**: Built-in voice playback for briefs

### Professional Features
- **Audit Logging**: Complete activity tracking for compliance
- **Usage Monitoring**: STT minutes and API token tracking
- **Stripe Integration**: Per-seat and metered billing
- **Data Export**: Organization-scoped data export for GDPR compliance

## 🏗️ Technical Architecture

### Frontend
- **Next.js 13+** with App Router and TypeScript
- **Tailwind CSS** + **shadcn/ui** for consistent, accessible design
- **Progressive Web App** with offline capabilities
- **Mobile-first** responsive design

### Backend
- **MongoDB Atlas** with Mongoose ODM
- **NextAuth.js** for authentication and session management
- **Strict tenant isolation** with server-side guards
- **RESTful APIs** with comprehensive error handling

### AI & Storage
- **OpenAI GPT-4o-mini** for summaries and translations
- **OpenAI Whisper** for speech-to-text
- **Cloudflare R2** (or S3) for audio file storage
- **Smart caching** and background processing

### Security & Compliance
- **Row-level security** equivalent through application-level guards
- **No cross-tenant queries** - every operation validates organization access
- **Audit trails** for all data modifications
- **Data residency** flags for compliance requirements

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas cluster
- OpenAI API key
- Stripe account (for billing)

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository>
cd nurtiv
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env.local
# Fill in your MongoDB URI, OpenAI key, etc.
```

3. **Run development server**
```bash
npm run dev
```

4. **Seed development data**
```bash
npm run seed
```

### Demo Accounts
- **Admin**: `admin@nurtiv.com` / `demo123`
- **Carer**: `carer@nurtiv.com` / `demo123`

## 📊 Data Models

### Core Collections
- **organisations**: Tenant workspaces with settings and billing info
- **users**: User accounts (shared across tenants)
- **memberships**: User-organization relationships with roles
- **patients**: Care recipients (org-scoped)
- **visits**: Care visit sessions (org-scoped)
- **notes**: Voice notes and AI summaries (org-scoped)
- **suggested_actions**: AI-generated care actions (org-scoped)

### Security Collections
- **audit_logs**: Complete activity tracking (org-scoped)
- **invites**: Organization invitations with role assignments
- **usage_meters**: STT minutes and API usage tracking

### Background Processing
- **jobs**: Async AI processing queue (STT, summarization, translation)

## 🔒 Security Model

### Tenant Isolation
- Every database query includes `orgId` filter
- Compound indexes: `{ orgId: 1, ...other_fields }`
- Server-side `requireOrgContext()` validates access before any operation
- No shared collections between tenants

### Access Control
- **OWNER**: Full organization management, billing, user management
- **ADMIN**: User management, settings, all patient data
- **CARER**: Create/read patient data, record notes, view summaries
- **VIEWER**: Read-only access to assigned patients

### Data Protection
- Audio files use signed URLs with organization scoping
- No PII in application logs
- GDPR-compliant data export functionality
- Configurable data residency settings

## 🧪 Testing

### Manual Testing Scenarios
1. **Multi-tenancy**: Users in Org A cannot access Org B data
2. **Offline sync**: Create notes offline, verify sync on reconnection
3. **Voice recording**: Test WebRTC recording and transcription flow
4. **Role permissions**: Verify access controls for different user roles
5. **AI features**: Test summarization, mood detection, and translations

### API Testing
```bash
# Test patient creation (requires valid session)
curl -X POST http://localhost:3000/api/patients \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","dob":"1940-01-01","orgId":"..."}'
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
vercel deploy --prod
```

### Environment Variables Required
- `MONGODB_URI`: MongoDB Atlas connection string
- `NEXTAUTH_SECRET`: Session encryption key
- `OPENAI_API_KEY`: OpenAI API access
- `STRIPE_SECRET_KEY`: Payment processing
- Plus storage and other service keys

## 📈 Monitoring & Analytics

### Usage Tracking
- STT processing minutes per organization
- API token consumption for summaries and translations
- User engagement metrics per tenant

### Performance Monitoring
- Database query performance with proper indexing
- Audio processing latencies
- Offline sync success rates

## 🛣️ Roadmap

### Phase 1 (Current)
- ✅ Core multi-tenant architecture
- ✅ Voice recording and AI transcription
- ✅ Patient management and care notes
- ✅ Offline-first functionality

### Phase 2 (Next)
- 📋 Care plan templates and workflows
- 📊 Analytics dashboard for care managers
- 🔔 Smart notifications and alerts
- 📱 Native mobile apps (React Native)

### Phase 3 (Future)
- 🤖 Advanced AI insights and predictions
- 📋 Regulatory compliance automation
- 🔄 Integration with existing care management systems
- 🌍 Multi-region deployment support

## 📄 License

Copyright 2025 Nurtiv. All rights reserved.

---

Built with ❤️ for social care professionals who make a difference every day.