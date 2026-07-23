# Changelog

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
