# Changelog

## 1.3.0 — 2026-09-09

### Added

- **Response Language in the SalesSuite API credential.** The credential gained a *Response Language*
  option (`Deutsch (DE)` / `English (EN)`, default `Deutsch (DE)`) that is sent as the `x-lang` header
  on every authenticated request, so endpoints returning translated text answer in the selected
  language. Credentials saved before this
  release carry no language value and keep resolving to the tenant default locale until they are
  opened and saved again; the option applies from then on. The API's own resolution order still
  applies: `lang` query parameter → `x-lang`/`accept-language` → tenant default locale → global
  fallback `en`.
- **Contact → Search Contacts: structured filter builder (node typeVersion 3).** The filter payload
  for `POST /v2/contact/search` is now built from a guided UI instead of hand-written JSON:
  - **Property picker** fed by `GET /v1/property`, grouped by card and labelled with the field name.
    The data type is carried in the option value, so only the operators valid for that type are
    offered and a type mismatch can no longer produce an opaque 400.
  - **Per-type operators and value inputs** for string, number, boolean, dateTime and select.
    Select values are chosen from the property's own option list (tenant-defined keys are UUIDs);
    country, gender and title selects, which expose no option list, fall back to manual key entry.
  - **Full dateTime support**: exact dates, relative presets (today through 180 days), relative day
    counts, "N days from now", gliding intervals (this week/month/quarter/year, last N days) and
    From/To ranges. The value shape is folded into the operator list, so illegal combinations are
    not offerable.
  - **Filter groups**: conditions live in groups. Everything inside one group is combined with AND,
    separate groups are combined with OR — the OR-of-AND structure the API accepts, made explicit in
    the UI rather than inferred from operator precedence.
  - **Sort rules** as a repeatable property / direction / nulls collection.
  - **Return All** with automatic pagination (the endpoint returns no total or cursor, so pages are
    walked until a short one arrives) and a **Max Pages** safety cap.
  - Escape hatches at two levels: a whole-payload **Raw JSON Filter Groups** mode, and a
    per-condition **Raw JSON Condition** mode that sits in its group like any other condition. Both
    JSON fields ship a working example as their default (n8n does not render placeholders on JSON
    fields); clearing a field applies no filter.
- **Deal → Search Deals.** New operation on `POST /v1/deal/search`, using the same filter builder as
  contact search plus optional **Pipeline** and **Phase** scope filters. Both lead with an explicit
  *All Pipelines* / *All Phases* entry, since the endpoint searches everything when they are left
  empty and a blank dropdown would otherwise read as a required field. The phase picker appears once
  a pipeline is chosen, because its list cannot be built without one. Its property list also
  offers Contact and Contact Person fields: the endpoint accepts `contact_*` and `contactPerson_*`
  identifiers, which the API reference does not document.
- Client-side validation now rejects incomplete conditions (select without values, ranges missing a
  bound, `From` greater than `To`, non-numeric input from expressions) before a request is sent, and
  a rejected filter surfaces as a readable error instead of a bare 400.
- **Field and group labels follow the credential's *Response Language*.** Field mappers and the
  property dropdowns of node, trigger and webhook previously showed hardcoded English group names
  ("Contact Person") and, for system fields, the bare identifier ("firstName"). They now show the
  API's own localized names — "Vorname - Ansprechpartner" on a `de` credential, "First Name -
  Contact Person" on `en`.

  The `/v1/fields/*` endpoints the mappers are built on ignore `x-lang` and return raw i18n keys for
  system cards, so the names are joined in from `GET /v1/property`, which honours the header and
  carries both the property `fieldName` and its card name. Field **ids** are unaffected, so saved
  workflows keep working. Custom (`x_*`) fields are unchanged — they always carried their
  tenant-defined name. If the join request fails the previous labels are used and a warning is
  logged; localization never blocks a mapper.
- **Contact Person → Create / Update: *Email Duplicate Check*.** New option exposing the API's
  `contactPersonEmailDuplicateCheckMode`: *Allow Duplicates* (`allow`), *Reject Within Same Contact*
  (`sameContact`) and *Reject Anywhere* (`none`, rejects the email on any non-archived contact —
  recommended for new integrations). Defaults to `allow`, which matches the API default, so existing
  workflows are unaffected. On create the mode is sent alongside `contactPerson`; on update it is
  part of the flat body — both schemas are `additionalProperties: false`, so the placement differs by
  operation. Setting the mode alone still does not count as an update.

### Changed

- **BREAKING (node typeVersion 3 only)**: the *Filter Groups (JSON)* and *Order By (JSON)* fields of
  **Search Contacts** were replaced by the filter builder. Existing v3 workflows that populated those
  fields lose their filter configuration and must be reconfigured — either through the builder or by
  switching **Search Source** to *Raw JSON Filter Groups* and pasting the previous JSON back in.
  Such a node refuses to run until that is done: it would otherwise search without a filter and
  return every record, and losing the filter silently is worse than the break itself.
  **Search Contacts** on typeVersion 1 and 2 is unchanged; **Search Deals** is a new operation and is
  available on all node versions.
- **Search Contacts** now enforces the API's `pageSize` limit of 100 in the UI and at runtime.
- Some **English** group labels changed too, because the API is now the single source for card
  names: the *Core data* card reads "Contact Master Data" instead of "Contact", and the deal
  properties card reads "Deal Properties" instead of "Deal Information". Labels only — no ids change.
- Property dropdowns are now sorted with the credential's language as the collation locale instead of
  a hardcoded English one.

### Fixed

- **Call Activity → Create offered an invalid *Call Result* (and *Call Type*) value.** Both dropdowns
  listed an "Any …" entry, but `CreateCallActivityRequest` requires a concrete call result and call
  type - `any` appears in no enum of the API at all. It exists purely as a node-side sentinel meaning
  "omit this filter", which is valid in the webhook, trigger and activity-list filters, where the
  field is optional.

  Cause: one loader served both contexts and prepended the sentinel unconditionally. The create
  parameters now use dedicated loaders that never emit it, following the way the `unknown` call
  result is already excluded - by construction rather than by filtering. Creating a call activity
  additionally rejects a non-object call result before sending anything, so an `any` supplied through
  an expression fails with a readable node error instead of an opaque API error.
- **"Any Call Type" was missing from three filter dropdowns whose default is exactly that value**
  (*Activity → List Phone Call Activities*, *Webhook → Create/Update*). `loadPhoneCallActivityTypes`
  existed twice under the same name; loader names are global, and the copy without the sentinel won
  the merge in the main node. That copy was unreferenced - the trigger node imports the real one
  directly - and has been removed.

- **Field mapper sorting ignored the credential language.** The name tie-break inside a card called
  `localeCompare` with no locale, so it collated by the n8n process default rather than the
  configured *Response Language*. Only visible where the two disagree, for example umlauts on a
  `de` credential.
- **The filter builder labelled fields differently from the field mappers** - `Vorname
  (Ansprechpartner)` versus `Vorname - Ansprechpartner` for the same field. Both now use one shared
  formatter.

- **Contact Person → Create / Update: the base fields were missing from the field mapper.**
  `First Name`, `Last Name`, `E-Mail` and `Phone` were never offered — only the custom (`x_*`)
  fields were. This made **Create** unusable, since it requires an email the mapper did not expose.

  Cause: the mapper treats a system property as writable only when the API reports it as such via
  `resolvedPropertyDefinition.propertyInfo`. `GET /v1/fields/contact-person` returns that block for
  no system property at all (measured: 12 of 12 without it), so every one of them was silently
  discarded. `GET /v1/fields/contact` and `GET /v1/fields/deal` do return it, which is why the
  Contact and Deal mappers were never affected.

  Fix: contact-person field metadata is now read from `GET /v1/fields/contact` and filtered to the
  `ContactPerson` table. That endpoint returns the identical set of contact-person properties, but
  with the editability flags and with the *Contact Person* card that supplies grouping and field
  order. **Do not "restore" the `/v1/fields/contact-person` endpoint here** — it would reintroduce
  the bug. The read-only system properties (`createdAt`, `createdBy`, `updatedAt`, `updatedBy`,
  `lastContactedAt/By`, `lastReachedAt/By`) stay excluded, as the API marks them non-editable.
- The contact-person field mapper now raises an error when it resolves no usable fields at all,
  instead of silently rendering an empty mapper — the behaviour that kept the bug above unnoticed.
- **Call Activity**: the phone-field picker no longer relabels the standard `Phone` entry to its raw
  identifier once the system `phone` property becomes visible to the loader.

### Notes

- Search results are still returned as a single item containing a `contacts` array. Set
  **Options → Split Into Items** to emit one item per contact instead.
- `Filter ID` remains a free-text field: the API exposes no endpoint that lists saved filters.

## 1.1.0

Aligns the node with **SalesSuite API 1.5.0**.

### Added

- **Contact → Create or Update Contact by Email**: new operation backed by the server-side
  `POST /v1/contact/create-or-update-by-email` endpoint. Creates a contact or updates the existing
  one matched by contact-person email in a single atomic request; returns a clear error when the
  email is shared by multiple non-archived contact persons.
- **Node typeVersion 3**: new nodes default to v3. In v3 the existing **Upsert Contact (by Email)**
  operation uses the atomic server-side endpoint instead of the previous client-side
  lookup + deprecated `PATCH /v1/contact/{id}` chain. Existing v1/v2 nodes are unchanged.
- **Property → List Cards**: new **Contact Card Visibility** (`visible` / `hidden` / `all`) and
  **Sort By** (`name` / `sortIndex`) filters. Card responses now expose `systemCardName`, which is
  preferred for stable, locale-independent card labels.
- **Webhook resource**: `actionButton.executed` can now be managed as a subscription
  (optional trigger-button and action-kind filters), matching the existing trigger node.

### Changed

- `callResult` handling accepts the new `{ type: "unknown" }` variant introduced in API 1.5.0
  (read/filter completeness only; not offered as a selectable create option).
- Bundled OpenAPI reference (`openapi.json`) updated to 1.5.0.

### Notes

- The internal `test.created` webhook event was removed from the public API and is not exposed
  by the node.
