# TradeApp — Sync & Multi-Device Build Spec

**Target:** v0.4.0
**Status:** DRAFT for review (no code written yet)
**Owner:** alekpeed
**Last updated:** 2026-07-15

> This document is the durable record of the sync/multi-device/encryption plan.
> UI/UX polish is explicitly **low priority** for this phase (see §0). Keep this
> file updated as decisions change — it is the source of truth for the plan, and
> a handoff anchor for future sessions.

---

## 0. Principle #0 — overrides everything

> **She never sees a login, a password, a code, or an error, and is never
> blocked — on any device, for any reason.** Recovery is always the developer's
> job, never hers.

Any design choice that violates this loses, even if it is "more secure" or
"cleaner." This is a **behavioral** requirement, not a visual one — it is *not*
in scope for "UI/UX deprioritization." Cosmetic polish (bubble visuals, theme
tweaks) is low priority; the frictionless/never-blocked behavior is core.

The intended end user is non-technical with a low tolerance for tech friction.
The whole point of this build is that finance data syncs and is protected
*without* her ever managing any of it.

---

## 1. Architecture

```
   WINDOWS PC                     SUPABASE (cloud)                iPHONE
 ┌─────────────────┐          ┌────────────────────┐        ┌───────────────┐
 │ Electron app    │  sync    │ Postgres           │  sync  │ PWA, then     │
 │ local SQLite    │◄────────►│  (ciphertext only) │◄──────►│ native app    │
 │ = source of     │  HTTPS   │ Row-Level Security │        │ local cache   │
 │   truth, opens  │          │ Edge Function(auth)│        │               │
 │   offline       │          └────────────────────┘        └───────────────┘
        ▲                              ▲                            ▲
        └── all devices hold the SAME per-user data key, escrowed by the dev ──┘
```

**Local-first:** every device keeps its own local copy and opens instantly
offline. The cloud is a **mirror + relay between devices**, never a gatekeeper.
If the cloud is fully down, the app still opens and works; sync resumes later.

---

## 2. Surfaces

| Surface | How | Apple fee? |
|---|---|---|
| **Windows desktop** | Existing Electron app + new sync layer | No |
| **iPhone — Phase A** | **PWA** (React UI, "Add to Home Screen") | **No** |
| **iPhone — Phase B** | **Native via Capacitor** (wraps the *same* React code in a real iOS app) | **$99/yr** |

- **Capacitor** is chosen for native because it reuses the existing React
  renderer — no second codebase. Same code → web *and* native iOS. Native buys
  App Store/TestFlight install, reliable local storage, background sync, push.
- **iOS caveat:** a PWA's local data can be evicted by iOS after ~7 days unused.
  This is **not data loss** (cloud re-syncs on next open), but it weakens the
  offline guarantee on PWA specifically. Strong offline on desktop and native;
  weaker on PWA. This is the practical argument for paying the $99 for native.

---

## 3. Auth — an "eternal" login, done safely

Requirement: she never re-authenticates, on any device, ever.

- **Not** a raw never-expiring token in a file (fragile: leak = valid forever).
- **Instead:** bake a **device secret** (random per-user key) into the build. On
  launch the app hands it to a small **Supabase Edge Function**, which trades it
  for a fresh short-lived session. Session auto-renews silently.

Net effect: **eternal from her point of view** (never re-auths), but the actual
tokens are short-lived and the device secret is **revocable by the developer**
from the server. Eternal **+ kill-switch**. Survives reinstalls and new devices
cleanly (a plain baked-in Supabase refresh token would not — those rotate on
first use).

---

## 4. Sync engine

- **Source of truth:** local SQLite on each device.
- **Change tracking:** every row carries `updated_at` + a soft-delete tombstone
  (deletes propagate; nothing resurrects).
- **Push triggers:**
  1. **After every new entry / edit / delete** — immediate.
  2. **On app launch** — pull anything newer.
  3. **Once a day even if unused** — background backstop.
- **Merge rule:** **last-write-wins** by timestamp. She never sees a
  "which version?" dialog. (Rarely even triggers for a single primary device.)
- **Failure behavior:** any sync error → keep working locally, retry quietly,
  and notify the **developer** (never her).

**Reliability of the daily-idle sync:** fully reliable on **desktop** (Windows
scheduled task / tray helper); **best-effort** on native iOS (OS-scheduled);
**not possible** on PWA. Because push-after-every-entry already covers freshness,
the daily backstop mainly matters for pulling *other* devices' changes — low
impact for a single primary user.

---

## 5. Encryption — all four layers, developer holds the key

| Layer | Protection | Key held by |
|---|---|---|
| In transit | TLS/HTTPS | Automatic |
| Server at rest | Supabase disk encryption | Supabase |
| **App-level (primary)** | Data encrypted on-device before upload → Supabase stores only ciphertext | Per-user data key |
| Local file on PC | Encrypted local DB; copying the file off the machine is useless | Same data key |

**Key escrow (the "never locked out" mechanism):** the per-user data key is
generated once; the **developer keeps a safe copy** (password manager / secure
store). It also rides inside the builds shipped to her, so every device can
decrypt. If she loses every device, the developer restores from cloud +
escrowed key. She is never the single point of failure.

**Trust model:** the cloud provider cannot read her data; only the developer and
her devices can. Strongest posture compatible with "she never manages a key."

---

## 6. Changes to the existing app

1. **New `sync/` module** (main process): Supabase client, device-secret
   exchange, push/pull/merge, background scheduler.
2. **Encryption layer** wrapping DB reads/writes.
3. **Schema mirror** in Supabase (Postgres versions of existing tables +
   `net_worth_items`) with Row-Level Security.
4. **One-time migration:** existing local data → first encrypted push.
5. **Config:** device secret + data key baked in at build time (per-user build).
6. **Renderer:** essentially unchanged (the point of local-first). Optional tiny
   "last synced" indicator, hidden from her by default (dev-facing).

---

## 7. Phases & rough effort

| Phase | What | Effort |
|---|---|---|
| **0** | Cut **v0.3.0** (currently stuck — no tag/release exists) | Minutes (dev, web UI) |
| **1** | Supabase project + schema + RLS + Edge Function + desktop sync (no encryption yet) | Medium |
| **2** | Encryption + key escrow | Medium |
| **3** | iPhone **PWA** (free) | Small–Medium |
| **4** | Native iOS via Capacitor (needs $99) | Medium |

Ship **1 → 2 together** (never sync unencrypted finance data). Then 3, then 4
if/when Apple fee is paid.

---

## 8. Costs

- **Supabase:** free tier is ample for one user. $0.
- **Apple Developer:** $99/yr — only for native iOS (Phase 4). PWA is free.
- Everything else: $0.

---

## 9. Decisions

1. **Surfaces — DECIDED.** Three targets sharing one core:
   - **Windows desktop** (Electron) — exists.
   - **iPhone PWA** — build now.
   - **iPhone native** (Capacitor) — the committed end goal, pending the end
     user's approval of the $99/yr Apple fee. **Build the PWA Capacitor-ready**
     so native is a packaging step, not a rewrite.
   Implication: a **data-layer abstraction** is required so the same React UI
   runs on desktop (IPC + local SQLite), web/PWA (Supabase), and native
   (Capacitor + Supabase). No surface-specific forks of the UI.
2. **Data-key escrow — DECIDED.** The end user's developer (repo owner) will
   generate and hold the encryption key. Claude never needs to see it; the
   encryption design must accept an externally-supplied key.
3. **Branch of record:** `claude/trade-tracking-app-design-xfby7l`. Merged into
   `main` on 2026-07-15; ongoing work continues on the feature branch and is
   merged to `main` by default ("merge, always").

---

## 11. Release process (hands-off, no token, no UI)

Releases are cut by a CI workflow — **no local tag push, no GitHub web UI, no
personal access token**. This exists because the dev sandbox's egress proxy
blocks all direct GitHub *write* API calls; the release writes must happen on
GitHub's runners instead.

- Workflow: `.github/workflows/release.yml` (lives on the **default branch
  `main`** so it is dispatchable; builds whatever ref is passed in).
- To cut a release: dispatch `release.yml` with inputs `version` (must match
  `package.json` on the source ref) and `source_ref` (branch to build from).
  Claude can trigger this via the GitHub Actions MCP tool.
- The workflow self-heals: it deletes any existing release/tag for that version,
  re-tags the source ref, builds, and publishes the Windows installer +
  `latest.yml` to a real GitHub Release (`releaseType: release` in
  `electron-builder.yml`) for the auto-updater.
- `build-windows.yml` remains for tag-triggered builds and manual test builds.

## 10. Change log

- **2026-07-15** — Initial draft. Direction locked: local-first + Supabase +
  baked-in device-secret auth ("eternal" login) + full-layer encryption with
  developer-escrowed key. iPhone added as a target (PWA → native Capacitor).
  UI/UX deprioritized except Principle #0 behavior. v0.3.0 confirmed still uncut.
- **2026-07-15 (later)** — **v0.3.0 shipped.** Cut via the new CI release
  pipeline after diagnosing that the original 403 was an environment egress
  policy (not a token/permissions issue) that blocks direct GitHub writes.
  Added `releaseType: release` to `electron-builder.yml` and a triggerable
  `release.yml` on `main`. v0.3.0 release now carries the installer + blockmap +
  `latest.yml` (published, non-draft). Future releases are one dispatch away.
- **2026-07-15 (later)** — Branch merged to `main` (PR #1). Surfaces decided:
  Windows desktop + iPhone PWA (now) + iPhone native (committed goal, pending
  end-user approval of Apple fee) — all sharing one React core via a data-layer
  abstraction; PWA built Capacitor-ready. Key escrow owned by the repo owner
  (Claude never sees the key). Next: Phase 1 — Supabase backend + the data-layer
  seam that unblocks both desktop sync and the PWA.
