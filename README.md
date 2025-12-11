# MajuMail 📧

A simple, clean shared email client for Marcel and Julien built on Resend, NeonDB, and Next.js.

## Features

- ✉️ **Receive & Send Emails** via Resend
- 🧵 **Threaded Conversations** - emails grouped by subject/references
- 👥 **Multiple Sender Identities** - marcel@ and julien@mail.rechnungs-api.de
- 🏷️ **Labels/Folders** - organize with drag-and-drop
- 🤖 **AI Auto-Labeling** - Claude classifies incoming emails
- ✨ **AI Compose Assistant** - help drafting replies
- 🔐 **Magic Link Auth** - passwordless login via email
- 🔍 **Full-Text Search** - search through emails and threads
- ⌨️ **Keyboard Shortcuts** - Gmail-style navigation (press ? to view)
- 🔔 **Unread Counts** - see unread counts in sidebar
- 🌙 **Dark Mode** - automatic system detection + manual toggle
- 📱 **Mobile Responsive** - works great on phones and tablets

## Tech Stack

- **Frontend**: Next.js 16 (App Router), Tailwind CSS v4, TypeScript
- **Database**: NeonDB (Serverless Postgres) + Drizzle ORM
- **Auth**: Auth.js (NextAuth v5) with Resend provider
- **Email**: Resend API (send) + Webhooks (receive)
- **AI**: Anthropic Claude API

## Getting Started

### 1. Clone & Install

```bash
cd majumail
npm install
```

### 2. Set Up Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.local.example .env.local
```

Required environment variables:

```env
# Database (NeonDB)
DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"

# Auth.js
AUTH_SECRET="your-random-secret-string"
NEXTAUTH_URL="http://localhost:3000"

# Resend
RESEND_API_KEY="re_..."
RESEND_WEBHOOK_SECRET="whsec_..."
RESEND_DOMAIN="mail.rechnungs-api.de"

# Anthropic
ANTHROPIC_API_KEY="sk-ant-..."
```

### 3. Set Up NeonDB

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string to `DATABASE_URL`
3. Push the schema:

```bash
npm run db:push
```

4. Seed initial data:

```bash
npm run db:seed
```

### 4. Set Up Resend

1. Create an account at [resend.com](https://resend.com)
2. Add and verify your domain (`mail.rechnungs-api.de`)
3. Create an API key and add to `RESEND_API_KEY`
4. Set up inbound email:
   - Go to Resend Dashboard → Domains → Your Domain
   - Enable "Receive emails"
   - Add webhook endpoint: `https://yourdomain.com/api/webhooks/resend`
   - Copy webhook secret to `RESEND_WEBHOOK_SECRET`

### 5. Set Up Anthropic

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Add to `ANTHROPIC_API_KEY`

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Database Commands

```bash
npm run db:push      # Push schema changes to database
npm run db:generate  # Generate migrations
npm run db:migrate   # Run migrations
npm run db:studio    # Open Drizzle Studio GUI
npm run db:seed      # Seed database with initial data
```

## Project Structure

```
majumail/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # Auth.js handlers
│   │   ├── webhooks/resend/     # Inbound email webhook
│   │   ├── emails/send/         # Send email
│   │   ├── threads/             # Thread CRUD
│   │   ├── labels/              # Label CRUD
│   │   ├── ai/                  # AI endpoints
│   │   ├── contacts/            # Contact autocomplete
│   │   └── mailboxes/           # Mailbox list
│   ├── inbox/                   # Main inbox pages
│   │   ├── [threadId]/          # Thread detail
│   │   └── label/[labelId]/     # Filtered by label
│   ├── compose/                 # New email page
│   └── login/                   # Auth pages
├── components/
│   ├── ui/                      # Base UI components
│   ├── email/                   # Email-specific components
│   ├── labels/                  # Label components
│   ├── layout/                  # Layout components
│   └── providers/               # Context providers
├── lib/
│   ├── db/                      # Database schema & client
│   ├── auth/                    # Auth configuration
│   ├── resend/                  # Email client
│   ├── ai/                      # AI functions
│   └── utils/                   # Utility functions
└── scripts/
    └── seed.ts                  # Database seeding
```

## Deployment

### Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

Remember to:
- Update `NEXTAUTH_URL` to your production URL
- Configure Resend webhook to point to production URL

## License

Private - Marcel & Julien only 😊
