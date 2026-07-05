# Tobyworld — The Living Flywheel

A lore-first, mobile-first Next.js prototype for the $TOBY / Tobyworld ecosystem.

It intentionally starts as an offchain interactive atlas:

- A stylized flywheel map for $TOBY, $PATIENCE, TABOSHI, SATO, Loreland, and the locked Gold Gate.
- A press-and-hold Still-Water ritual that reveals a Lotus Spore.
- A Taboshi tend-plot and Sato river interaction persisted only in localStorage.
- Shareable lore fragment pages with generated Open Graph images at `/lore/[slug]`.
- Native mobile sharing with clipboard fallback.
- No wallet connection, token transfer, eligibility check, reward calculation, or financial claims in Phase 1.

## Run it

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy

Deploy as a standard Next.js web app on Vercel, then register the final URL and app metadata on Base.dev. The app is intentionally structured as a web-and-wallet-ready experience rather than relying on legacy Farcaster-only mechanics.

## What to connect next

1. Replace cosmetic localStorage progress with a database (Supabase works well) only after defining official progression rules.
2. Add Base wallet connection with wagmi + viem for **read-only** asset badges.
3. Add a server-managed content collection for official approved lore quotations and source links.
4. Add a verified official contracts configuration only after addresses and qualification rules are confirmed.
5. Add Base.dev metadata/screenshots and a wallet-address notification flow after launch.

## Where official copy lives

Lore fragments in `lib/lore.ts` link back to `https://toadgod.xyz/` and `https://toadgod.xyz/rune3`. Keep direct quotations short and verify new copy with the project before publishing.
