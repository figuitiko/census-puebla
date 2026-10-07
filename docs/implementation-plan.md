# Padron Puebla - Implementation Plan (slim MVP)

Extra deliverable offered to the client. Scope: **capture** faithful to the Excel cedula, **dashboard**, **reports**. ~40 units, ~6 brigades. Companion file: `docs/data-model.prisma`.

## 1. Scope

In: 26-field cedula (sections A-E), drafts, private photo evidence, simple review, dashboard with filters/charts/map, XLSX registry, PDF dossier per unit.

Out of MVP: offline sync, revision history, audit log, holiday calendar, ExportJob, duplicate-detection UI, bulk import, automated ZIPs (done manually), background jobs, email/invitations/verification, billing, resident profiling.

## 2. Stack decisions

| Topic | Decision |
|---|---|
| Framework | Next.js 16 (read `node_modules/next/dist/docs/` first), dynamic rendering, `cacheComponents` OFF, `proxy.ts` replaces middleware (optimistic cookie redirect only) |
| Layout | Repo root, NO `src/`; alias `@/*` -> root |
| DB | PostgreSQL + Prisma 7 pinned 7.x stable (never 8 RC), `prisma.config.ts`, `@prisma/adapter-pg` |
| Auth | Better Auth core, email+password, sign-up disabled, admin creates users. Own `role` column. No org plugin |
| Evidence | Private Vercel Blob; read only via authenticated streaming route (`Cache-Control: private, no-store`); no public/presigned links |
| Reports | ExcelJS (XLSX), `@react-pdf/renderer` (PDF), photos downscaled with `sharp` |
| Quality | `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` + manual walkthrough. No automated tests |

Folder layout:

```
app/(auth)/login
app/(app)/{dashboard,registro,unidades/[id],campo,campo/[unitId]/cedula,admin/usuarios}
app/api/{auth/[...all],evidence/[id],evidence/upload,reports/xlsx,reports/dossier/[unitId]}
features/{census,evidence,review,dashboard,reports,units,users}/{actions.ts,queries.ts,schema.ts,components/}
lib/{db,auth,auth-client,dal,permissions,catalogs,blob}.ts
components/ui · proxy.ts · prisma/schema.prisma
```

## 3. Roles and lifecycle

| Action | ADMIN | COORDINADOR | ENCUESTADOR | VISOR |
|---|---|---|---|---|
| Manage users / campaign / units | Y | - | - | - |
| Assign units | Y | Y | - | - |
| Edit / submit cedula, upload evidence | Y | - | own assigned, DRAFT or RETURNED | - |
| Approve / return | Y | Y | - | - |
| Dashboard, registry, reports | Y | Y | own units list only | Y (ALL data, incl. non-approved, read-only) |
| Read evidence | Y | Y | own | Y |
| Delete evidence | Y | Y | own, before approval | - |

Enforcement: `lib/dal.ts` (`requireUser()`) + `can(user, action, resource?)` in `lib/permissions.ts` on every action/route/page. Never rely on `proxy.ts` alone.

```
DRAFT --submit--> SUBMITTED --approve--> APPROVED
                     |--return (comment REQUIRED)--> RETURNED --resubmit--> SUBMITTED
```

- SUBMITTED / APPROVED are locked for the encuestador. Transitions run in a transaction with a `version` check.
- Not located (field 9 = No): only section A, field 26 and photos (optional) required; it can still be approved as an incident.
- Coordinates (field 4) are typed manually (range-validated lat/lng). Photos come already georeferenced: no EXIF, no stored photo coordinates.

## 4. Dashboard metrics

Three DISTINCT metrics, never merged. One shared `UnitFilters` (campaign, status, colonia, junta, assignee, inScope) and one `features/dashboard/queries.ts` so registry and dashboard agree.

- **Coverage** = units with submission >= SUBMITTED / inScope units (discovered units reported separately).
- **Approval** = APPROVED / submitted-or-later.
- **Dossier readiness** = ready / APPROVED located. **Ready** = APPROVED + located + confirmed photos >= `minPhotos` + complex coordinates present.
- Dwellings sum excludes unknowns, shown as "N sin dato".
- Photo progress = confirmed / (`minPhotos` x located units).
- Field 12 total is derived: 0 if field 11 = No; null if any count is null (screens show known partial).

## 5. Reports

- **XLSX**: sheet "Registro" (one row per unit, 26 columns in cedula order under section bands) + per-unit "Cedula" sheet copying A1:D40. Streams directly. Default filter may be approved-only; VISOR can view all in UI.
- **PDF dossier** (on demand): cover, cedula data, location map (static image, fallback to coordinates text), photo grid with captions, review status. Render, `put` as private Blob, stream back through the authenticated route (avoids the 4.5MB response cap).

## 6. Source-to-field mapping (workbook sheet "Cedula")

Value cell = column B on the same row as the label in column A. Catalog columns refer to sheet "Catalogos".

| # | Field | Cell | Type | Catalog / validation | Skip rule | Prisma |
|---|---|---|---|---|---|---|
| 1 | Folio | A5/B5 | auto | - | - | `CampaignUnit.folio` |
| 2 | Fecha y hora | A6/B6 | auto | - | - | `CensusSubmission.visitedAt` |
| 3 | Persona responsable | A7/B7 | auto | user catalog | - | `CensusSubmission.authorId` |
| 4 | Georreferenciacion | A8/B8 | manual lat/lng | - | - | `HousingComplex.lat/lng` |
| 5 | Nombre de la UH | A9/B9 | auto, editable | - | - | `HousingComplex.name` |
| 6 | Junta auxiliar | A10/B10 | catalog (pending) | municipal catalog TBD; free text meanwhile | - | `HousingComplex.juntaAuxiliar` |
| 7 | Colonia | A11/B11 | catalog (pending) | municipal catalog TBD; free text meanwhile | - | `HousingComplex.colonia` |
| 8 | Domicilio o referencia | A12/B12 | text | - | - | `HousingComplex.address` |
| 9 | UH localizada | A13/B13 | Si/No | DV `Si,No` (Catalogos J2:J3) | No -> record incident, finish (B14) | `located` (Boolean) |
| 10 | Total viviendas | A16/B16 | integer | - | - | `dwellings` |
| 11 | Otras unidades privativas | A17/B17 | tri-state | Si / No / No fue posible determinar (Catalogos A2:A4) | No -> hide breakdown, total = 0 | `otherUnits` (TriState) |
| 12 | Tipo de unidad privativa | A18, rows 19-22 (B19 Local comercial, B20 Oficinas, B21 Consultorios, B22 Otros), Total B23 | integers | Catalogos C2:C5; no DV on counts | hidden if 11 = No; excludes viviendas | `PrivateUnitCount` (total derived) |
| 13 | Areas verdes | A25/B25 | tri-state | Si / No / No fue posible determinar | No -> skip 14-18 | `greenAreas` (TriState) |
| 14 | Numero de areas verdes | A26/B26 | integer | no DV | skip if 13 = No | `greenAreaCount` |
| 15 | Tipo predominante | A27/B27 | single | Catalogos D2:D5: Jardin, Parque, Camellon, Otra area verde | skip if 13 = No | `greenType` |
| 16 | Uso principal | A28/B28 | single | Catalogos E2:E8: Recreacion, Descanso y convivencia, Juego infantil, Actividad fisica o deportiva, Ornamental, Conservacion/ambiental, Otro | skip if 13 = No | `greenUse` |
| 17 | Equipamiento | A29/B29 | multi (Instrucciones A6; DV is single) | Catalogos F2:F7: Ninguno, Bancas o mobiliario de descanso, Juegos infantiles, Equipamiento deportivo, Senderos, Otro | skip if 13 = No | `EquipmentSelection` |
| 18 | Condicion general | A30/B30 | single | Catalogos G2:G5: Buena, Regular, Deficiente, No fue posible valorar | skip if 13 = No | `greenCondition` |
| 19 | Figura de administracion identificada | A32/B32 | tri-state | Si / No / No fue posible determinar | No -> skip 20-21 | `orgIdentified` (TriState) |
| 20 | Figura(s) identificada(s) | A33/B33 | multi | **Catalogos H2:H5**: Administrador/a, Comite de administracion, Mesa directiva, Otra. The workbook DV on B33 wrongly reuses the source list (I2:I8): do NOT copy it | skip if 19 != Si | `OrganizationSelection` |
| 21 | Caracteristicas / observaciones | A34/B34 | text | - | skip if 19 != Si | `orgNotes` |
| 22 | Fuente principal | A36/B36 | single | Catalogos I2:I8: Administrador/a, Comite o mesa directiva, Persona residente, Documento disponible, Registro proporcionado por el Municipio, Observacion directa, Otra (DV B36) | - | `source` |
| 23 | Evidencia documental | A37/B37 | Si/No | DV in the x14 extension block -> `Catalogos!J2:J3` (Si, No). openpyxl drops it; verify in raw XML | No -> skip 24 | `hasDocEvidence` (Boolean) |
| 24 | Tipo de documento | A38/B38 | free text ("[Especifique]") | no catalog | skip if 23 = No | `docType` |
| 25 | Evidencia fotografica | A39/B39 | files | min 10 georeferenced photos / expediente (B39) | - | `Evidence` (kind PHOTO) |
| 26 | Observaciones o incidencias | A40/B40 | text | - | - | `observations` |

Notes: section headers A4 (A), A15 (B), A24 (C), A31 (D), A35 (E). Catalogos col B "Calidad dato" is referenced by no validation: deferred. Instrucciones A5: never include viviendas in the field 12 breakdown. A7: photos linked to folio + expediente.

## 7. Wireframes (ASCII, FICTIONAL data)

```
DASHBOARD  [Campana v][Colonia v][Estado v]
[Cobertura 18/40 45%][Aprobadas 12/18][Expedientes listos 9/12][Viviendas 3,410 (2 sin dato)]
Bar: estado por brigada            Map: units by estado
Table: Folio | Unidad | Estado | Fotos 7/10 | ->
```

```
WIZARD (mobile)  Paso 2/5 · B. Viviendas
"U.H. Los Fresnos (ficticio)"  FOL-007
10 Total viviendas [ 240 ]  [ ] No se sabe
11 Otras unidades? (o)Si ( )No ( )No fue posible
12 Locales[3] Oficinas[ ] Consult.[1] Otros[ ]  -> Total: 4+ (parcial)
[Atras]                         [Guardar] [Siguiente]
```

```
DOSSIER  FOL-007  U.H. Los Fresnos (ficticio)   APROBADA - Listo
Tabs: Cedula | Fotos (12) | Mapa | Revision
[Descargar PDF] [Descargar XLSX]
```

## 8. Backlog (3 phases)

Gates for EVERY phase: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build` all green + the manual checks below.

### Phase 1 - Capture
Depends on: nothing (starts from this plan).
Deliverables: install/pin deps, `prisma.config.ts` + schema from `data-model.prisma`, migration; Better Auth (email+password, no sign-up) + auth tables via CLI; `proxy.ts`, DAL, permissions; admin user management; campaign + units + assignment; mobile wizard A-E with skip rules and derived total; drafts; private Blob upload + `confirmEvidence`; review (approve / return with comment).
Exit criteria (manual):
- Catalog check: fields 9, 13, 20, 23 show exactly the lists in section 6.
- Total: 11 = Si with 10 and 5 gives 15; 11 = No gives 0 and hides counts.
- Resume: a partial draft reopens on mobile with values intact.
- Anonymous photo request returns 401/403, no bytes.
- 9 confirmed photos blocks submit with the shortfall; 10 allows it.
- Return without comment is rejected; with comment the encuestador edits and resubmits.
- Encuestador cannot edit SUBMITTED/APPROVED.
- Unauthenticated visit redirects to login; VISOR denied capture and approval.

### Phase 2 - Dashboard
Depends on: Phase 1 (data + roles).
Deliverables: shared `UnitFilters` + queries, three metric cards, charts, map, registry table, unit dossier page, VISOR read-only view (all data).
Exit criteria (manual):
- Divergence: 10 captured, 6 approved shows different coverage and approval values.
- Filter status=approved updates cards, charts and map together.
- Dwellings card shows "N sin dato" when unknowns exist.
- VISOR sees non-approved data read-only and has no action buttons.

### Phase 3 - Reports
Depends on: Phase 2 (queries/filters).
Deliverables: XLSX registry (Registro + per-unit Cedula sheets), PDF dossier on demand, static map (or coordinates fallback).
Exit criteria (manual):
- XLSX opens in Excel with 26 fields per unit in cedula layout.
- PDF dossier downloads with cedula data, photos, location and review status.
- Dossier request without session is denied.

## 9. Decisions to confirm

Resolved: VISOR sees ALL data (read-only). COORDINADOR is a 4th role. Coordinates are manual. Photos are pre-georeferenced (no EXIF).

Open:
1. Better Auth user creation: `admin` plugin `createUser` vs server script with `auth.$context.password.hash` (verify in Phase 1 with sign-up disabled).
2. Static map provider and API key (fallback: coordinates text).
3. Official colonia and junta auxiliar catalogs, and the real list of 40 units.
4. Final contract vs proposals (ACYGP 2026-09-10, KROLENS 2026-09-18; neither is the contract) - may add requirements.
5. Vercel plan tier and DB host (function limits, Blob, Postgres provider).
