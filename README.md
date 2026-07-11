<div align="center">

# ZOMBIE HUNT

**A dark, gritty online multiplayer card game**  
*Inspired by Alice in Borderland Season 3*

[![CI](https://github.com/someshk1703/ZombieHunt/actions/workflows/ci-check.lock.yml/badge.svg)](https://github.com/someshk1703/ZombieHunt/actions)
[![Vercel](https://img.shields.io/badge/deployed-vercel-black)](https://zombie-hunt-tawny-kappa.vercel.app)

</div>

---

## What is Zombie Hunt?

A real-time multiplayer card game where players are secretly assigned roles — **humans** or **zombies**. Each round, players are paired against each other and must play cards strategically to survive, infect, or eliminate opponents.

The game ends when **all humans are eliminated** (zombies win) or **all infected players are eliminated** (humanity prevails).

---

## Gameplay

### Setup
- 2–8 players per room
- Each player receives **7 cards** dealt by the server
- One player is secretly the **Original Infected**

### Each Round
- Players are paired simultaneously (round-robin matchups)
- Each pair commits their hand: play **1 to N cards** per duel
- **Highest cumulative card value wins** the duel

### Special Cards

| Card | Count | Effect |
|---|---|---|
| 🧟 **Zombie** | 1 per 5 players | Beats numeric cards — loser gets secretly infected |
| 🔫 **Shotgun** | 1 per non-zombie player | Eliminates infected players instantly — useless against healthy |
| 💉 **Vaccine** | 1 per 4 players (random) | Clears infection when played — neutralizes zombie card |

### Card Priority
```
Shotgun > Vaccine > Zombie > Numeric
```

### Win Conditions
- **Humans win** — all infected players are eliminated before round ends
- **Zombies win** — all humans are eliminated / infected

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + Framer Motion |
| Backend | Supabase (Postgres + Realtime + Edge Functions) |
| Auth | Supabase Anonymous Auth |
| State | Zustand + React Context |
| Drag & Drop | @dnd-kit |
| Routing | React Router v6 |
| Deploy | Vercel |

---

## Getting Started

### Prerequisites
- Node.js ≥ 20
- A [Supabase](https://supabase.com) project

### Local Setup

```bash
# Clone the repo
git clone https://github.com/someshk1703/ZombieHunt.git
cd ZombieHunt

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Apply database schema
supabase db push

# Start dev server
npm run dev
```

### Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Project Structure

```
src/
├── components/       # Shared UI components
│   └── game/         # Game-specific screens
├── context/          # GameContext (session state)
├── hooks/            # Custom hooks (audio, particles, etc.)
├── lib/              # Supabase client, auth, audio
├── pages/            # Route-level pages
├── store/            # Zustand global store
└── styles/           # Global CSS (glitch, mobile)

supabase/
├── functions/        # Edge functions (deal-cards, resolve-round, etc.)
├── migrations/       # SQL migration history
└── schema.sql        # Full database schema
```

---

## GitHub Actions Workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| `ci-check` | push / PR to `main`, `dev` | AI reviews TypeScript, build health, schema conflicts |
| `supabase-migrate` | push to `main` (migrations changed) | AI reviews SQL migrations for safety & RLS |
| `deploy-preview` | PR opened / updated | AI reviews PR diff and posts a code review comment |
| `daily-repo-status` | Daily schedule | AI generates a daily repo health report as an issue |

---

## Design System

- **Theme:** Dark, post-apocalyptic, brutal
- **No border-radius** — raw aesthetic throughout
- Grain overlay + scanlines + vignette on all backgrounds
- Glitch animation on the title
- **Font:** Bebas Neue (display) / IBM Plex Mono (body)

| Token | Value |
|---|---|
| Background | `#0a0a0a` |
| Surface | `#111111` |
| Red | `#cc0000` |
| Green (terminal) | `#00ff41` |
| Warning | `#ff6b00` |

---

## License

MIT
