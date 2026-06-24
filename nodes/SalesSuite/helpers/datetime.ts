import { ApplicationError } from "n8n-workflow";

/**
 * Normalize a date/time value (e.g. from an n8n `dateTime` field) to a strict
 * ISO 8601 UTC string ending in `Z`, which the API's `z.string().datetime()`
 * validation expects (it rejects offset forms like `+02:00`).
 *
 * n8n emits ISO values that carry a timezone offset, so `new Date(...)` keeps
 * the exact instant and `toISOString()` re-expresses it in UTC.
 *
 * Returns `undefined` for empty input so optional fields can be omitted; throws
 * on an unparseable value.
 */
export function toApiDateTime(value: unknown): string | undefined {
	const trimmed = String(value ?? "").trim();
	if (!trimmed) return undefined;

	const date = new Date(trimmed);
	if (Number.isNaN(date.getTime())) {
		throw new ApplicationError(`Invalid date/time value: ${trimmed}`);
	}
	return date.toISOString();
}
