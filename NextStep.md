Great — let's map out the complete path from zero to production. Here's your sequential guide:

---

# 🚀 ZOMBIE HUNT — Production Deployment Guide

---

## PHASE 1: LOCAL ENVIRONMENT SETUP

**Step 1: Initialize the project**
```bash
npm create vite@latest zombie-hunt -- --template react-ts
cd zombie-hunt
npm install
```

**Step 2: Install all dependencies**
```bash
npm install @supabase/supabase-js zustand react-router-dom \
framer-motion lucide-react @dnd-kit/core @dnd-kit/sortable \
@dnd-kit/utilities qrcode @types/qrcode
```

**Step 3: Set up folder structure**
Create all directories before running any prompts:
```
src/
├── components/
│   ├── game/
│   ├── skeletons/
│   └── effects/
├── context/
├── hooks/
├── lib/
├── pages/
├── store/
└── styles/
supabase/
├── functions/
│   ├── start-game/
│   ├── deal-cards/
│   ├── resolve-round/
│   ├── check-win/
│   ├── matchmaking/
│   └── ghost-data/
└── migrations/
public/
└── assets/
    └── cards/
```

**Step 4: Create .env.local**
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## PHASE 2: GITHUB REPOSITORY SETUP

**Step 1: Initialize git**
```bash
git init
git branch -M main
```

**Step 2: Create .gitignore**
```
node_modules/
dist/
.env.local
.env
.DS_Store
```

**Step 3: Create repository on GitHub**
- Go to github.com → New repository
- Name: `zombie-hunt`
- Private (recommended until launch)
- No README (you already have one locally)

**Step 4: Push initial commit**
```bash
git remote add origin https://github.com/
  {your-username}/zombie-hunt.git
git add .
git commit -m "chore: initial project setup"
git push -u origin main
```

**Step 5: Set up branch strategy**
```bash
# Create development branch
git checkout -b develop

# Feature branch pattern for each prompt:
git checkout -b feature/prompt-1-supabase
git checkout -b feature/prompt-2-auth
# etc.
```

**Step 6: Add GitHub secrets**
Go to repo → Settings → Secrets → Actions:
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_PROJECT_REF
SUPABASE_ACCESS_TOKEN
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

---

## PHASE 3: SUPABASE SETUP

**Step 1: Create Supabase project**
- Go to supabase.com → New project
- Name: `zombie-hunt`
- Choose region closest to your users
- Save your database password securely

**Step 2: Install Supabase CLI**
```bash
npm install -g supabase
supabase login
supabase init
supabase link --project-ref {your-project-ref}
```

**Step 3: Run Prompt 1 in your IDE**
Feed Prompt 1 to your IDE agent. After code is generated:
```bash
# Push schema to Supabase
supabase db push

# Verify tables created in Supabase dashboard
# Check: rooms, players, game_state, 
#        round_log, matchmaking_queue, room_chat
```

**Step 4: Enable Realtime**
In Supabase dashboard:
- Database → Replication
- Enable replication for:
  `rooms, players, game_state, 
   round_log, room_chat, duel_chat`

**Step 5: Enable Anonymous Auth**
- Authentication → Providers
- Enable "Anonymous Sign-ins"

**Step 6: Deploy Edge Functions**
```bash
# Deploy all stubs first
supabase functions deploy start-game
supabase functions deploy deal-cards
supabase functions deploy resolve-round
supabase functions deploy check-win
supabase functions deploy matchmaking
supabase functions deploy ghost-data

# Set Edge Function secrets
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=
  {your-service-role-key}
```

**Step 7: Verify RLS policies**
In Supabase dashboard → Authentication → Policies
Confirm all tables have RLS enabled and policies active.

---

## PHASE 4: RUN PROMPTS SEQUENTIALLY

Run each prompt in your IDE agent one at a time.
After EACH prompt, do this workflow:

```bash
# 1. Test locally
npm run dev

# 2. Check for TypeScript errors
npm run type-check

# 3. Commit the feature
git add .
git commit -m "feat: prompt {N} - {description}"
git push origin feature/prompt-{N}

# 4. If new migrations exist:
supabase db push

# 5. If new Edge Functions exist:
supabase functions deploy {function-name}

# 6. Merge to develop when prompt works
git checkout develop
git merge feature/prompt-{N}
git push origin develop
```

**Prompt execution order + what to verify after each:**

| Prompt | Verify |
|---|---|
| 1 — Supabase schema | Tables visible in dashboard, RLS active |
| 2 — Auth + Home | Anonymous login works, username modal shows |
| 3 — Rooms | Create room generates code, join works |
| 4 — Waiting room | Realtime player updates, chat works |
| 5 — Card dealing | Edge function deals correct card counts |
| 6 — Round engine | Cards commit, reveal animates correctly |
| 7 — Elimination + Results | Win conditions trigger, results load |
| 8 — Polish | Audio plays, mobile layout correct |

---

## PHASE 5: ADD STATIC ASSETS

Before testing the full game flow, add these files:

**Step 1: Special card images**
Place in `/public/assets/cards/`:
```
zombie.png   — your zombie card artwork
shotgun.png  — your shotgun card artwork
vaccine.png  — your vaccine card artwork
```
Recommended size: 400×560px, PNG with transparency.

**Step 2: Create SUBJECT ZERO avatar**
Place at `/public/assets/subject-zero-avatar.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" 
     viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="#111111"/>
  <text x="50" y="65" text-anchor="middle" 
        font-size="48" fill="#00ff41">☣</text>
</svg>
```

**Step 3: Verify audio URLs**
Test each mixkit.co URL from Prompt 8 in browser.
Replace any broken URLs before going to production.

---

## PHASE 6: LOCAL FULL GAME TEST

Before deploying, run a full game test locally:

**Step 1: Open 3+ browser tabs/windows**
Each tab = one player (use different usernames)

**Step 2: Test this checklist:**
```
□ All 3 players join same room via code
□ Host settings panel works
□ Countdown triggers when all ready
□ Cards dealt correctly (check distribution)
□ Drag and drop works in hand review
□ Negotiation chat visible to pair only
□ Card commit locks correctly
□ Reveal animation plays in order
□ Zombie card infects correctly (secret)
□ Shotgun eliminates infected player
□ Vaccine clears infection
□ Ghost mode shows all hands
□ Win condition triggers correctly
□ Results screen shows correct stats
□ Game story timeline is accurate
```

**Step 3: Test edge cases:**
```
□ Player leaves mid-game (tab close)
□ Odd number of players (SUBJECT ZERO appears)
□ Timer expires without committing (auto-commit)
□ All players ready → countdown → host cancels
□ Quick play matchmaking (3+ in queue)
```

---

## PHASE 7: VERCEL DEPLOYMENT

**Step 1: Install Vercel CLI**
```bash
npm install -g vercel
vercel login
```

**Step 2: Create vercel.json in project root**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Step 3: Add environment variables to Vercel**
Go to Vercel dashboard → Project → Settings → 
Environment Variables:
```
VITE_SUPABASE_URL        = your supabase URL
VITE_SUPABASE_ANON_KEY   = your anon key
```

**Step 4: Deploy to Vercel**
```bash
# From project root
vercel

# Follow prompts:
# - Link to existing project or create new
# - Set root directory: ./
# - Build command: npm run build
# - Output directory: dist
```

**Step 5: Set up automatic deployments**
In Vercel dashboard → Git:
- Connect your GitHub repository
- Production branch: `main`
- Preview branch: `develop`

Now every push to `main` auto-deploys to production,
every push to `develop` creates a preview URL.

**Step 6: Add custom domain (optional)**
Vercel dashboard → Domains → Add your domain.

---

## PHASE 8: GOOGLE CLOUD (OPTIONAL SERVICES)

Google Cloud can supplement your stack for:

**Option A: Cloud CDN for assets**
If card images/audio are large:
```bash
# Create a GCS bucket for static assets
gsutil mb gs://zombie-hunt-assets
gsutil -m cp public/assets/** 
  gs://zombie-hunt-assets/assets/

# Make public
gsutil iam ch allUsers:objectViewer 
  gs://zombie-hunt-assets

# Update asset URLs in code to:
# https://storage.googleapis.com/
#   zombie-hunt-assets/assets/...
```

**Option B: Cloud Run for custom game server**
Only needed if you outgrow Supabase Edge Functions:
```bash
# Build Docker image
gcloud builds submit --tag \
  gcr.io/{project-id}/zombie-hunt-server

# Deploy to Cloud Run
gcloud run deploy zombie-hunt-server \
  --image gcr.io/{project-id}/zombie-hunt-server \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

**Option C: Cloud Monitoring**
Set up uptime checks and alerts:
- Go to GCP Console → Monitoring
- Create uptime check for your Vercel URL
- Alert if downtime > 1 minute

For your current scale, Vercel + Supabase alone 
is sufficient. Add GCP only when needed.

---

## PHASE 9: CI/CD PIPELINE

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: npm
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run type-check
      
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

  deploy-supabase:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest
      
      - name: Deploy Edge Functions
        run: |
          supabase functions deploy start-game
          supabase functions deploy deal-cards
          supabase functions deploy resolve-round
          supabase functions deploy check-win
          supabase functions deploy matchmaking
          supabase functions deploy ghost-data
        env:
          SUPABASE_ACCESS_TOKEN: 
            ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_REF: 
            ${{ secrets.SUPABASE_PROJECT_REF }}
      
      - name: Run migrations
        run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: 
            ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_REF: 
            ${{ secrets.SUPABASE_PROJECT_REF }}

  deploy-vercel:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: --prod
```

---

## PHASE 10: POST-LAUNCH CHECKLIST

```
□ Supabase database backups enabled (daily)
□ Vercel analytics enabled
□ Error monitoring set up (Sentry recommended)
□ Supabase connection pooling enabled (for scale)
□ Rate limiting on Edge Functions (prevent abuse)
□ Test on real mobile devices (iOS Safari + Android Chrome)
□ Check Lighthouse score (performance + accessibility)
□ Add Open Graph meta tags (for social sharing)
□ Add favicon + PWA manifest (optional)
□ Set up Supabase row count alerts 
  (notify if rooms table > 1000 rows)
```

---

## COMPLETE SEQUENTIAL ORDER SUMMARY

```
1.  Initialize Vite project + install dependencies
2.  Set up folder structure
3.  Create GitHub repo + push initial commit
4.  Set up branch strategy + GitHub secrets
5.  Create Supabase project + install CLI
6.  Run Prompt 1 → push schema → deploy function stubs
7.  Run Prompt 2 → test auth + home screen
8.  Run Prompt 3 → test room creation + joining
9.  Run Prompt 4 → test waiting room + realtime
10. Run Prompt 5 → test card dealing + hand review
11. Run Prompt 6 → test full round engine
12. Run Prompt 7 → test elimination + results
13. Run Prompt 8 → test audio + mobile + effects
14. Add static assets (card PNGs, subject-zero SVG)
15. Run full local game test (checklist above)
16. Set up vercel.json + deploy to Vercel
17. Set up GitHub Actions CI/CD pipeline
18. Set up Google Cloud CDN (if needed)
19. Run production smoke test
20. Launch! 🎮
```

Each step builds directly on the previous one. Never skip ahead — especially steps 6–13 which depend on database state from earlier prompts. Good luck! 🧟