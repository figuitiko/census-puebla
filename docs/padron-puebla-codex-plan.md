# CODEX PROMPT — Padrón Puebla

Create an implementation plan for **Padrón Puebla**, a housing complex census platform, inside my existing empty Next.js project. Inspect the repository first; preserve its package manager and compatible configuration. **This task is planning only: do not implement the app yet.**

Produce `docs/implementation-plan.md`, `docs/data-model.prisma`, and a phased development backlog. Identify assumptions and decisions that need confirmation without blocking the plan.

Do not install or configure automated testing frameworks, write automated tests, or add automated test requirements. Use manual workflow verification, lint, type checking, and production builds.

## 1. Project Brief

Build a Spanish-language platform for collecting, validating, and reporting census information about condominium housing complexes in Puebla.

**Important domain distinction:** one census record represents an entire **unidad habitacional / condominio**, with an aggregate dwelling count. The supplied form does not request individual household or resident records.

### Source documents

- `Cedula_levantamiento_unidades_habitacionales_Puebla_ajustada.xlsx`
- `Cotización CENSO ACYGP.pdf`
- `PROPUESTA ECONOMICA KROLENS.pdf`

The source documents describe:

- An initial campaign covering 40 priority housing complexes over two months.
- At least six field brigades and two coordinators.
- Field scheduling, visits, incident logging, and supervisory validation.
- A municipal registry organized by locality, colonia, and junta auxiliar.
- Individual dossiers containing the completed cédula, at least 10 georeferenced color photographs, location maps, and graphics.
- Monthly progress reports and final digital and printed deliverables.

Treat these as configurable campaign requirements, not hardcoded limits. Do not assume either commercial proposal is the final signed contract.

**Success criteria:** pollsters can capture reliable information on phones, coordinators can review it, and administrators can produce traceable institutional deliverables.

MVP priorities:

1. Campaign, housing complex, brigade, and assignment management.
2. Mobile census form faithfully reproducing the spreadsheet.
3. Evidence collection and review workflow.
4. Operational dashboard and municipal registry.
5. PDF and spreadsheet reports.

Exclude individual resident profiling, billing, AI-generated conclusions, and automated route optimization from the MVP.

## 2. Tech Stack

- Next.js App Router + TypeScript.
- Tailwind CSS + shadcn/ui.
- PostgreSQL + Prisma.
- Zod for server-side validation.
- React Hook Form for the interactive census wizard.
- Better Auth with invitation-based access and server-enforced roles; verify compatibility before adopting.
- **Vercel Blob with private access** for photographs, documentary evidence, and generated report files. Do not use S3 buckets or AWS storage configuration.
- MapLibre GL JS with a configurable map provider and attribution.
- Recharts for interactive charts.
- ExcelJS for XLSX exports.
- Evaluate PDF generation against deployment limits; use a dedicated worker for large dossier bundles.
- Vercel deployment; development must work locally.

Follow current official documentation and installed-version compatibility. Use Server Components by default and keep interactive client boundaries small.

References:

- https://nextjs.org/docs
- https://vercel.com/blog/introducing-react-best-practices
- https://ui.shadcn.com/
- https://www.prisma.io/docs
- https://vercel.com/docs/vercel-blob

Verify current Vercel Blob private-access and client-upload APIs before designing the storage adapter. Keep credentials server-side and document required configuration without exposing tokens.

## 3. Architecture Decisions

### Roles

| Role | Access |
|---|---|
| Administrator | Campaign configuration, users, catalogs, assignments, all records and exports |
| Coordinator | Assigned brigades, schedules, census review, corrections and approval |
| Pollster | Assigned complexes, visits, drafts, evidence uploads and submission |
| Institutional viewer | Approved registry and authorized reports |

Authentication is required because this is an operational application with multiple users and restricted evidence.

### Workflow

- Assignment: pending → scheduled → visited.
- Census: draft → submitted → changes requested → resubmitted → approved.
- “Not located” is a visit outcome, distinct from review status.
- Dossier readiness is calculated separately from census approval.
- Approved submissions are immutable. Corrections produce a new revision with history.

### Boundaries

- Server Components load authorized pages, tables, and aggregates.
- Client components handle wizard interaction, GPS, camera/file selection, maps, and charts.
- Server Actions handle ordinary mutations.
- Route Handlers support authentication endpoints, downloads, Vercel Blob client-upload token generation/completion callbacks, and later offline synchronization.
- Upload binary files directly to Vercel Blob using its supported client-upload flow, authorized by the server; avoid routing large uploads through Server Actions.
- All data access, authorization, and secrets remain server-side.
- Check object-level permissions on every read, write, upload, and export.

### Vercel Blob storage

- Use a private Blob store. Do not expose evidence through public URLs.
- Use the official `@vercel/blob` SDK and supported private-access APIs.
- Store Blob pathname, returned URL or identifier, content type, byte size, and upload state in PostgreSQL; never store file bytes in the database.
- Authorize upload token generation against the user's role, assignment, and submission.
- Constrain allowed file types, file size, and server-approved path prefixes. Use non-identifying generated filenames.
- Bind upload completion to a server-issued pending evidence record; verify the uploaded object before marking it available. Do not trust arbitrary client-provided URLs or metadata.
- Implement an authenticated read/download endpoint using the supported private Blob read API. Check record permissions before streaming files, and prevent public caching.
- Support authenticated photograph previews through the same private access boundary.
- Upload generated PDFs, XLSX files, and ZIP bundles to private Blob storage, with authorized downloads.
- Plan failed-upload cleanup, orphan-object cleanup, and authorized deletion. Preserve evidence attached to approved snapshots according to configured retention rules.
- Keep Blob read/write tokens out of client bundles, responses, logs, and source control.
- Do not assume S3-style presigned URLs exist in Vercel Blob; use documented Blob mechanisms.

### Caching and consistency

- Do not put restricted data in shared public caches.
- Start with fresh authenticated operational queries; cache only where scope and invalidation are explicit.
- Invalidate affected pages after mutations.
- Use optimistic concurrency through record versions.
- Allocate folios transactionally; never generate them using `count + 1`.
- Use idempotency keys for submissions and upload completion.

### Field reliability

- MVP: server autosave with visible “Guardando / Guardado / Error” states and draft recovery.
- Never show unsaved changes as saved.
- Phase 2: offline capture with IndexedDB, explicit synchronization, conflict handling, pending attachment uploads, and shared-device cleanup.
- Do not claim that an installable PWA automatically works offline.

## 4. Routes & Screens

| Route | Purpose |
|---|---|
| `/login` | Restricted sign-in |
| `/dashboard` | Campaign progress, coverage, review backlog and dossier readiness |
| `/unidades` | Searchable municipal inventory with filters and table/map views |
| `/unidades/[id]` | Complex profile, census history, visits, evidence and dossier |
| `/campo` | Mobile pollster workspace: today’s visits, drafts and corrections |
| `/campo/[assignmentId]/cedula` | Census wizard |
| `/revision` | Coordinator submission queue |
| `/revision/[submissionId]` | Read-only review with section-specific feedback |
| `/agenda` | Visits and brigade scheduling |
| `/mapa` | Geographic coverage and visit outcomes |
| `/reportes` | Registry exports, monthly reports and dossier generation |
| `/configuracion` | Campaigns, brigades, catalogs, users and delivery settings |

### Creative product direction

- Desktop: calm institutional interface with navy, teal, clear typography and restrained status colors.
- Mobile: large controls, clear step progress, sticky save/continue actions, minimal typing.
- Each complex gets an **“Expediente listo” checklist** showing missing cédula, photographs, map, graphics, or validation.
- Dashboard includes **“Requiere atención”**, listing actionable issues with links.
- Map colors represent workflow status, with an accessible legend.
- Separate coverage, review approval, and deliverable completion; do not combine them into a misleading progress percentage.

## 5. Folder Structure

```text
src/
  app/
    (auth)/
    (platform)/
    api/
  features/
    campaigns/
    housing-complexes/
    assignments/
    census/
    evidence/
    reviews/
    reports/
  components/
    ui/
    layout/
  lib/
    auth/
    db/
    storage/
      vercel-blob.ts
    authorization/
    reporting/
prisma/
  schema.prisma
  migrations/
  seed.ts
docs/
  implementation-plan.md
  data-model.prisma
```

Keep business rules in shared server/domain modules rather than duplicating them across actions, UI, and exports. Use a server-only Prisma singleton appropriate to the installed Prisma version.

## 6. Data Model

Draft a complete, relation-valid Prisma schema around these entities:

| Entity | Main fields and purpose |
|---|---|
| User / auth models | Identity, role, active status; compatible with authentication provider |
| Campaign | Name, dates, municipality, target count, minimum photographs, status, timezone |
| Brigade / BrigadeMembership | Campaign, coordinator, pollsters and membership |
| GeographicArea | Type, official code if available, name, parent area |
| HousingComplex | Name, aliases, address/reference, geographic areas, source, coordinates |
| CampaignUnit | Campaign + complex, unique campaign folio, priority, planned scope |
| Assignment | Campaign unit, brigade, assigned pollster, scheduled date, status |
| Visit | Assignment, pollster, timestamps, outcome, GPS accuracy, incidents |
| CensusSubmission | Campaign unit, visit, author, schema version, revision, status, responses, review timestamps |
| PrivateUnitCount | Submission, type, quantity, “other” description |
| OrganizationSelection | Submission and selected organization figure |
| EquipmentSelection | Submission and selected equipment |
| Evidence | Submission/visit, Blob pathname and identifier/URL, content type, size, type, caption, coordinates, accuracy, capture time, geolocation source, upload/verification status |
| Review | Submission, reviewer, decision and section-specific comments |
| ActivityLog | Campaign unit/visit, activity type, author, event time, notes |
| AuditEvent | Actor, entity, action, timestamp and relevant change metadata |
| ExportJob | Campaign, filters, immutable snapshot reference, status, private Blob output pathname/identifier |
| CatalogOption | Catalog, stable code, Spanish label, active flag, order |

All models include `createdAt` and `updatedAt`. Add appropriate relations, uniqueness constraints, and indexes.

Design requirements:

- A housing complex can participate in multiple campaigns.
- Multiple visits must not create duplicate housing complexes.
- Each submission is a versioned snapshot; draft edits use a concurrency version.
- Store important reportable fields as typed columns, not only an unrestricted JSON blob.
- Nullable counts mean unknown; zero means a confirmed absence.
- Use `YES / NO / UNDETERMINED` where the spreadsheet supports three answers.
- Keep housing counts separate from other private-unit counts.
- Preserve catalog codes and historical labels in finalized submissions.
- Seed sample data only as clearly labeled fictional examples.
- Do not invent official colonia/junta auxiliar catalogs or the actual list of 40 complexes.
- Include a quality-of-data field based on the workbook’s catalog, marked as an optional enhancement because its placement is not explicit in the cédula.

## 7. Server Actions / APIs

Plan actions for:

- Campaign and catalog management.
- Housing complex creation/import/update.
- Brigade membership and assignment.
- Visit scheduling and outcome recording.
- Draft creation and autosave.
- Census submission.
- Correction requests, resubmission, approval, and new revisions.
- Evidence metadata editing and authorized removal.
- Export requests and export status.

Use typed results:

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: string;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };
```

Validate inputs and permissions server-side. Database transactions must protect submission transitions, folio allocation, and audit history.

Plan Route Handlers for:

- Authentication endpoints required by the provider.
- Vercel Blob client-upload token generation and verified completion callbacks.
- Authorized private evidence reads/downloads.
- Authorized private report downloads.
- Offline synchronization in its later phase.

Downloads must verify access before reading private Blob files. Large exports need durable background execution, not an untracked promise in a serverless request.

## 8. UI Components and Census Form

Use shadcn/ui `Sidebar`, `Card`, `Table`, `Tabs`, `Badge`, `Progress`, `Dialog`, `Sheet`, `AlertDialog`, `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Button`, `Skeleton`, and `Sonner`.

Use accessible form composition with labels, descriptions, field errors, keyboard navigation, focus states, and semantic HTML. Include clear empty, loading, and error states.

Reproduce all **26 fields** from the workbook:

| Section | Fields |
|---|---|
| A. Control e identificación | 1. Folio; 2. Date/time; 3. Responsible pollster; 4. Georeferencing; 5. Complex name; 6. Junta auxiliar; 7. Colonia; 8. Address/reference; 9. Located? |
| B. Viviendas y unidades privativas | 10. Total dwellings; 11. Other private units?; 12. Counts of commercial premises, offices, consulting rooms and others, with computed total |
| C. Áreas verdes | 13. Presence; 14. Count; 15. Predominant type; 16. Principal observed use; 17. Equipment; 18. Observable condition |
| D. Organización condominal | 19. Organization identified?; 20. Multiple organization figures; 21. Relevant characteristics/observations |
| E. Fuente y evidencias | 22. Main information source; 23. Documentary evidence?; 24. Document type; 25. Photographs; 26. Observations/incidents |

Use the workbook catalogs:

- Three-state answer: Sí, No, No fue posible determinar.
- Quality of data: Dato confirmado, Dato aproximado, No fue posible determinar.
- Private-unit type: Local comercial, Oficinas, Consultorios, Otros.
- Green-area type: Jardín, Parque, Camellón, Otra área verde.
- Use: Recreación, Descanso y convivencia, Juego infantil, Actividad física o deportiva, Ornamental, Conservación/ambiental, Otro.
- Equipment: Ninguno, Bancas o mobiliario de descanso, Juegos infantiles, Equipamiento deportivo, Senderos, Otro.
- Condition: Buena, Regular, Deficiente, No fue posible valorar.
- Organization: Administrador/a, Comité de administración, Mesa directiva, Otra.
- Source: Administrador/a, Comité o mesa directiva, Persona residente, Documento disponible, Registro proporcionado por el Municipio, Observación directa, Otra.

Treat the organization catalog as authoritative; the spreadsheet’s dropdown validation appears to reuse the information-source list for that field.

### Photograph experience

- Camera/file input, upload progress, thumbnails and captions.
- Counter: “7 de 10 fotografías válidas”.
- Store photo coordinates separately from the complex coordinates.
- Show capture-time versus upload-time metadata.
- Never claim an imported photo was georeferenced at capture unless supported by its metadata or recorded capture.
- Provide a documented manual location fallback with provenance when GPS is unavailable.
- Use authorized private Vercel Blob reads for previews; avoid exposing public evidence URLs.

## 9. Validation & Errors

Implement conditional server-side schemas:

- If the complex was not located, require an incident and finish through the short outcome flow. Do not require sections B–E or 10 photos for this branch.
- If no other private units exist, skip and clear their breakdown.
- If no green areas exist, skip and clear their characteristics.
- If organization is absent, skip and clear its dependent selections.
- If documentary evidence is absent, skip document details.
- “Undetermined” is distinct from “No”; show an optional explanation without forcing invented values.
- Counts must be nonnegative integers.
- “Other” selections require a description.
- “Ninguno” cannot coexist with equipment selections.
- Validate coordinates and retain GPS accuracy.
- Require the configured number of successfully uploaded, georeferenced photographs before declaring a located-unit dossier ready.
- Prevent submission with unfinished required uploads.
- Detect potential duplicate complexes using name/address/location and offer review; never merge automatically.
- Show expired-session, permission, concurrent-edit, Blob-storage, and network errors in plain Spanish.

## 10. Step-by-Step Tasks

Create a backlog with dependencies, deliverables, and exit criteria for these phases:

### Phase 0 — Foundation and prototype

- [ ] Inspect repository and dependency versions.
- [ ] Produce source-to-field mapping and clarify ambiguities.
- [ ] Draft schema, permission matrix, lifecycle and reporting definitions.
- [ ] Design dashboard, mobile wizard and complex dossier screens using fictional data.

### Phase 1 — Working field capture

- [ ] Configure authentication, database and private Vercel Blob storage.
- [ ] Implement campaigns, complex inventory, brigades and assignments.
- [ ] Implement all cédula fields and conditional rules.
- [ ] Implement autosave, visits, incidents, GPS and authorized Blob evidence uploads.
- [ ] Manually verify one end-to-end pollster workflow.

### Phase 2 — Supervision and operational dashboard

- [ ] Implement review, corrections, approval and audit history.
- [ ] Implement dashboard filters and map.
- [ ] Add dossier completeness and attention queues.
- [ ] Implement municipal baseline import with preview, validation and duplicate handling.

### Phase 3 — Institutional deliverables

- [ ] Export registry to XLSX/CSV.
- [ ] Generate individual color PDF dossiers in US Letter format.
- [ ] Generate monthly progress reports with visits, activities, incidents and evidence.
- [ ] Create downloadable delivery bundles organized by geographic area.
- [ ] Store generated deliverables in private Vercel Blob and authorize downloads.
- [ ] Record export snapshot, filters, author and generation time.

### Phase 4 — Field resilience and pilot

- [ ] Implement offline synchronization if pilot connectivity requires it.
- [ ] Run a pilot with fictional/sample complexes and actual field devices.
- [ ] Manually validate permissions, skip logic, review transitions, private file access, print layout, and exported totals.
- [ ] Run lint, TypeScript checking, and a production build.
- [ ] Document deployment, database backup/restore, Blob retention/recovery, and field usage.

Monthly report deadlines should be configurable. Working-day calculations need a supplied holiday calendar; do not treat Monday–Friday as a complete official calendar.

## 11. Acceptance Criteria

Verify these through manual walkthroughs and appropriate static/build checks:

- A pollster resumes a saved draft after refreshing.
- A pollster cannot access another brigade’s restricted assignment.
- All 26 source fields and catalog options are represented.
- The not-located branch creates a reviewable incident without requiring unrelated census fields.
- Conditional sections never leave stale hidden answers in a finalized submission.
- GPS refusal produces an explicit fallback, not fake coordinates.
- Located-unit dossiers remain incomplete until their required evidence is verified.
- Coordinators can return submissions with feedback and approve corrected revisions.
- Two concurrent edits trigger conflict handling rather than silent overwrite.
- Approved reports exclude draft data by default.
- Dashboard totals match the registry under identical filters.
- Coverage uses the campaign’s planned-unit denominator; newly discovered units are reported separately until added to scope.
- Unknown dwelling counts are excluded from sums and reported as unknown.
- PDF dossiers contain the cédula, evidence captions/coordinates, location map and graphics.
- XLSX exports preserve Spanish labels, folios and unknown-versus-zero values.
- Export bundles contain real files, not expiring links alone.
- Photographs, documents, and generated reports are stored in private Vercel Blob.
- Unauthorized users cannot obtain upload authorization or read/download private evidence and reports.
- Upload failures and retries do not create duplicate verified evidence records.
- No storage secrets enter the client bundle.
- Lint, type checking, and production builds pass.

End the plan with a short list of decisions to confirm: municipal catalogs and baseline inventory, selected proposal/contract requirements, authentication provider, map provider, Vercel Blob private-store configuration, connectivity expectations, and authorized report recipients.
