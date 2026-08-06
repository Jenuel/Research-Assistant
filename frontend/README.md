# DocuChat frontend

Next.js 15 (App Router) + React 19, Clerk for auth, zustand for state, axios for
the two backends. Styling is the **Modernist** design system — flat, Archivo
throughout, zero corner radius, a single accent red, structure carried by rules
and alignment. No Tailwind.

The interface is a full-height split: a **Library** pane on the left (search,
sort, selection, upload, delete) and an **Ask** pane on the right (transcript,
scope chips, composer). Answers are drawn only from the documents currently in
scope.

## Styling

- `app/design-system.css` — the Modernist stylesheet, vendored from the Claude
  Design project it was authored in. Retune it upstream and re-vendor rather
  than hand-editing.
- `app/theme.css` — this product's layer over it: the system ships a light
  ground, DocuChat runs on a dark one, so the four ground tokens are re-pointed
  and the component classes that assumed a light ground are re-tinted. Loaded
  after `design-system.css` so it wins on equal specificity.

Components use those classes plus per-element inline styles. Archivo is
self-hosted by `next/font` and exposed as `--font-archivo`, which both font
roles in `theme.css` point at.

## How it maps to the services

| UI | Call |
| --- | --- |
| Library list | `GET {DOCUMENT_API}/api/documents/fetch/all` |
| Upload | `POST {DOCUMENT_API}/api/documents/upload` (multipart field `document`) |
| Delete | `DELETE {DOCUMENT_API}/api/documents/delete/{id}` |
| Ask | `POST {RAG_API}/api/rag/generate` `{ query, ids: number[] }` |
| Degraded banner | `GET {DOCUMENT_API}/` |

Document ids are **numbers** — `QueryRequest.ids` is `List[int]` and rejects
strings.

## Two things worth knowing

**The quota line is usually hidden.** Both services set slowapi's
`headers_enabled=True`, so the `X-RateLimit-*` headers are on the response — but
their CORS middleware sets no `expose_headers`, and a cross-origin response only
surfaces the safelisted headers to JavaScript. `lib/stores/chat.ts` reads them
when they are readable and the line stays hidden when they are not, rather than
inventing a number. Same for the `Retry-After` countdown on a 429. To light both
up, add to each service's `CORSMiddleware`:

```python
expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining",
                "X-RateLimit-Reset", "Retry-After"],
```

**Dates arrive without an offset.** `document_service` serializes `created_at`
with `datetime.isoformat()` on a *naive* datetime. `new Date()` reads that as
local time and shifts every timestamp by the viewer's UTC offset.
`parseServerDate` in `lib/format.ts` appends a `Z` when none is present, and
already handles timezone-aware timestamps if the service ever starts sending
them.

## Running it

```bash
npm install
cp .env.example .env.local   # then fill in the Clerk keys
npm run dev                  # http://localhost:3000
```

Both services must allow this origin in `ALLOWED_ORIGINS`, and it must appear in
their `CLERK_AUTHORIZED_PARTIES`, or the token's `azp` check rejects it.

## Layout

```
app/
  design-system.css   Modernist, vendored
  theme.css           dark ground + product overrides
  layout.tsx          ClerkProvider, Archivo, token bridge
  page.tsx            signed in → /dashboard, else → /login
  login|signup/       Clerk inside the sign-in composition
  dashboard/          the workspace
components/
  workspace.tsx       nav, degraded banner, narrow-pane toggle, split, dialogs
  library-panel.tsx   search, sort, selection, rows, all four list states
  ask-panel.tsx       transcript, scope chips, composer
  answer.tsx          small Markdown renderer (no dangerouslySetInnerHTML)
  upload-dialog.tsx   drag/drop, per-file progress and reasons, retry
  delete-dialog.tsx   confirmation
  toaster.tsx         outcome toasts
lib/
  api.ts              axios clients + Clerk token injection
  errors.ts           HTTP failure → copy the user can act on
  format.ts           sizes, dates, the naive-datetime fix
  clerk-appearance.ts Clerk widget themed as Modernist
  stores/             documents, chat, uploads, toasts, health
```
