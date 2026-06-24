import { ApplicationError, IDataObject, IExecuteFunctions } from "n8n-workflow";

import { ssRequest } from "../../helpers/apiclient";
import {
	buildTypeMap,
	loadContactProperties,
	normalizeValue,
	splitPrefixedFields,
} from "../../helpers/fieldMapping";
import { createNote, NoteContentType } from "../../helpers/notes";

type ContactFields = IDataObject & {
	email?: string;
};

type ContactPayload = {
	contact: ContactFields;
	contactPerson: ContactFields;
};

type ContactLookupEntry = IDataObject & {
	contact?: {
		id?: string;
		email?: string;
	};
	mainContactPerson?: {
		id?: string;
		email?: string;
	};
	additionalContactPersons?: Array<{
		id?: string;
		email?: string;
	}>;
};

type ContactMutationResponse = IDataObject & {
	contact?: {
		id?: string;
	};
};

async function sanitizeContactPayload(
	this: IExecuteFunctions,
	raw: unknown,
): Promise<ContactPayload> {
	const maybe = (raw ?? {}) as IDataObject;
	const val = (maybe.value ?? maybe) as IDataObject;

	const { contact, contactPerson } = splitPrefixedFields(val);
	const properties = await loadContactProperties(this);
	const typeMap = buildTypeMap(properties);

	const sanitize = (
		input: IDataObject,
		prefix: "contact" | "contactPerson",
	) => {
		const out: IDataObject = {};
		for (const [key, value] of Object.entries(input)) {
			const typeDef = typeMap.get(`${prefix}.${key}`);
			const normalized = normalizeValue(value, typeDef);
			if (normalized === undefined) continue;
			out[key] = normalized;
		}
		return out;
	};

	return {
		contact: sanitize(contact, "contact"),
		contactPerson: sanitize(contactPerson, "contactPerson"),
	};
}

async function maybeCreateNote(
	ctx: IExecuteFunctions,
	i: number,
	contactId: string,
): Promise<string | undefined> {
	const createInitialNote = ctx.getNodeParameter(
		"createInitialNote",
		i,
		false,
	) as boolean;
	if (!createInitialNote) return undefined;

	const initialNoteText = ctx.getNodeParameter(
		"initialNoteText",
		i,
		"",
	) as string;
	if (!initialNoteText?.trim()) return undefined;

	const initialNoteFormat = ctx.getNodeParameter(
		"initialNoteFormat",
		i,
		"text/plain",
	) as NoteContentType;

	return createNote(
		ctx,
		contactId,
		initialNoteText,
		"contact",
		initialNoteFormat,
	);
}

function pickEmail(payload: {
	contact: IDataObject;
	contactPerson: IDataObject;
}): string {
	const email = payload.contactPerson?.email ?? payload.contact?.email;
	return String(email ?? "").trim();
}

// Determines where the matched email lives on a contact lookup entry: on the
// main contact person, or on one of the additional contact persons (with index).
function resolveEmailSource(
	entry: ContactLookupEntry,
	email: string,
): IDataObject | null {
	const wanted = email.toLowerCase();

	if (entry.mainContactPerson?.email?.toLowerCase() === wanted) {
		return { type: "mainContactPerson", id: entry.mainContactPerson.id };
	}

	if (Array.isArray(entry.additionalContactPersons)) {
		const index = entry.additionalContactPersons.findIndex(
			(person) => person?.email?.toLowerCase() === wanted,
		);
		if (index !== -1) {
			return {
				type: "additionalContactPerson",
				id: entry.additionalContactPersons[index].id,
				index,
			};
		}
	}

	return null;
}

// Returns true if the contact's MAIN contact person uses the given email.
function isMainContactPersonEmail(
	entry: ContactLookupEntry,
	email: string,
): boolean {
	return entry.mainContactPerson?.email?.toLowerCase() === email.toLowerCase();
}

// Accepts either an already-parsed array/object (n8n "json" field) or a JSON
// string and returns the parsed value. Throws a readable error on bad JSON.
function parseJsonParam(raw: unknown, fieldName: string): unknown {
	if (raw === undefined || raw === null || raw === "") return undefined;
	if (typeof raw !== "string") return raw;
	const trimmed = raw.trim();
	if (!trimmed) return undefined;
	try {
		return JSON.parse(trimmed);
	} catch {
		throw new ApplicationError(`${fieldName} must be valid JSON.`);
	}
}

export async function handleContact(
	this: IExecuteFunctions,
	i: number,
	operation: string,
): Promise<unknown> {
	switch (operation) {
		case "createContact": {
			const fieldsParam = this.getNodeParameter("fields", i, {} as IDataObject);
			const payload = await sanitizeContactPayload.call(this, fieldsParam);

			const email = pickEmail(payload);
			if (!email) {
				throw new ApplicationError(
					"Create Contact requires at least an email (contactPerson.email or contact.email).",
				);
			}

			const result = await ssRequest<ContactMutationResponse>(
				this,
				"POST",
				"/v1/contact/create",
				{
					body: payload,
				},
			);

			const initialNoteId = result?.contact?.id
				? await maybeCreateNote(this, i, result.contact.id as string)
				: undefined;

			return { ...(result ?? {}), inputData: payload, initialNoteId };
		}

		case "updateContact": {
			const contactId = this.getNodeParameter("contactId", i) as string;
			if (!contactId)
				throw new ApplicationError("updateContact requires a contactId.");

			const fieldsParam = this.getNodeParameter("fields", i, {} as IDataObject);
			const payload = await sanitizeContactPayload.call(this, fieldsParam);

			const allowChangeEmail = this.getNodeParameter(
				"allowChangeEmail",
				i,
				false,
			) as boolean;
			if (!allowChangeEmail) {
				delete payload.contact.email;
				delete payload.contactPerson.email;
			}

			const appendMultiSelectValues = this.getNodeParameter(
				"appendMultiSelectValues",
				i,
				false,
			) as boolean;

			const nodeVersion = this.getNode().typeVersion ?? 1;

			let result: unknown;
			let inputData: IDataObject = payload as unknown as IDataObject;
			if (nodeVersion >= 2) {
				// v2: flat, contact-only body. Contact-person data is edited via the
				// dedicated Contact Person resource and is not accepted here.
				const body: IDataObject = { ...payload.contact };
				delete body.email; // v2 contact schema has no email field
				if (Object.keys(body).length === 0) {
					throw new ApplicationError(
						"No contact-level fields to update. Edit contact persons via the Contact Person resource.",
					);
				}
				inputData = body;
				result = await ssRequest(this, "PATCH", `/v2/contact/${contactId}`, {
					qs: { appendMultiSelectValues },
					body,
				});
			} else {
				const hasFields =
					Object.keys(payload.contact).length > 0 ||
					Object.keys(payload.contactPerson).length > 0;
				if (!hasFields) {
					throw new ApplicationError("No fields provided to update.");
				}
				result = await ssRequest(this, "PATCH", `/v1/contact/${contactId}`, {
					qs: { appendMultiSelectValues },
					body: payload,
				});
			}

			const initialNoteId = await maybeCreateNote(this, i, contactId);

			return { ...(result ?? {}), inputData, initialNoteId };
		}

		case "upsertContact": {
			const fieldsParam = this.getNodeParameter("fields", i, {} as IDataObject);
			const payload = await sanitizeContactPayload.call(this, fieldsParam);

			const email = pickEmail(payload);
			if (!email) {
				throw new ApplicationError(
					"Upsert requires an email (contactPerson.email or contact.email).",
				);
			}

			const lookup = await ssRequest<ContactLookupEntry | ContactLookupEntry[]>(
				this,
				"GET",
				"/v1/contact/by-email",
				{
					qs: { email },
				},
			);

			const nodeVersion = this.getNode().typeVersion ?? 1;

			let contactId: string | undefined;
			if (nodeVersion >= 2) {
				// v2: the email may match several contacts (main or additional
				// contact persons). Resolve the update target via Match Strategy.
				let entries: ContactLookupEntry[] = [];
				if (Array.isArray(lookup)) {
					entries = lookup;
				} else if (lookup && Object.keys(lookup).length > 0) {
					entries = [lookup];
				}

				const matchStrategy = this.getNodeParameter(
					"upsertMatchStrategy",
					i,
					"errorOnMultiple",
				) as string;

				let target: ContactLookupEntry | undefined;
				if (matchStrategy === "preferMainContactPerson") {
					const mains = entries.filter((entry) =>
						isMainContactPersonEmail(entry, email),
					);
					if (mains.length > 1) {
						throw new ApplicationError(
							`Email "${email}" is the main contact person on ${mains.length} contacts — ambiguous. Update by contact ID instead.`,
						);
					}
					target = mains[0]; // undefined → fall through to create
				} else if (matchStrategy === "firstMatch") {
					target = entries[0];
				} else {
					// errorOnMultiple (default)
					if (entries.length > 1) {
						throw new ApplicationError(
							`Email "${email}" matches ${entries.length} contacts — ambiguous. Use a different Match Strategy or update by contact ID.`,
						);
					}
					target = entries[0];
				}

				contactId = target?.contact?.id as string | undefined;
			} else {
				const existing: ContactLookupEntry | null = Array.isArray(lookup)
					? (lookup[0] ?? null)
					: lookup && typeof lookup === "object" && !Array.isArray(lookup)
						? Object.keys(lookup).length > 0
							? lookup
							: null
						: null;
				contactId = existing?.contact?.id as string | undefined;
			}

			if (contactId) {
				const appendMultiSelectValues = this.getNodeParameter(
					"appendMultiSelectValues",
					i,
					false,
				) as boolean;
				const result = await ssRequest(
					this,
					"PATCH",
					`/v1/contact/${contactId}`,
					{
						qs: { appendMultiSelectValues },
						body: payload,
					},
				);
				return {
					mode: "found-and-updated",
					...(result ?? {}),
					inputData: payload,
				};
			}

			const created = await ssRequest(this, "POST", "/v1/contact/create", {
				body: payload,
			});

			return { mode: "created-new", ...(created ?? {}), inputData: payload };
		}

		case "getByEmail": {
			const email = (this.getNodeParameter("email", i) as string)?.trim();
			const failIfNotFound = this.getNodeParameter(
				"failIfNotFound",
				i,
				false,
			) as boolean;

			if (!email) {
				throw new ApplicationError("Email is required.");
			}

			const data = await ssRequest<ContactLookupEntry[]>(
				this,
				"GET",
				"/v1/contact/by-email",
				{
					qs: { email },
				},
			);

			const nodeVersion = this.getNode().typeVersion ?? 1;

			if (nodeVersion >= 2) {
				// v2: the endpoint returns ALL contacts whose main OR additional
				// contact person uses this email — emit one item per contact.
				let entries = Array.isArray(data) ? data : [];

				const onlyMainContactPerson = this.getNodeParameter(
					"onlyMainContactPerson",
					i,
					false,
				) as boolean;
				if (onlyMainContactPerson) {
					entries = entries.filter((entry) =>
						isMainContactPersonEmail(entry, email),
					);
				}

				if (entries.length === 0) {
					if (failIfNotFound) {
						throw new ApplicationError(`No contact found for email: ${email}`);
					}
					return [{ email, found: false }];
				}

				return entries.map((entry) => ({
					email,
					found: true,
					emailSource: resolveEmailSource(entry, email),
					...entry,
				}));
			}

			// v1: legacy single-item behaviour (first match only).
			const entry = Array.isArray(data) && data.length > 0 ? data[0] : null;

			if (!entry) {
				if (failIfNotFound) {
					throw new ApplicationError(`No contact found for email: ${email}`);
				}
				return [{ email, found: false }];
			}

			return [
				{
					email,
					found: true,
					emailSource: resolveEmailSource(entry, email),
					...entry,
				},
			];
		}

		case "getContactById": {
			const contactId = (
				this.getNodeParameter("contactId", i) as string
			)?.trim();

			if (!contactId) {
				throw new ApplicationError("contactId is required.");
			}

			const data = await ssRequest<IDataObject>(
				this,
				"GET",
				`/v1/contact/${contactId}`,
			);

			return [
				{
					contactId,
					found: true,
					...(data ?? {}),
				},
			];
		}

		case "searchContacts": {
			const nodeVersion = this.getNode().typeVersion ?? 1;

			if (nodeVersion >= 2) {
				const filterId = (
					this.getNodeParameter("filterId", i, "") as string
				).trim();
				const page = this.getNodeParameter("page", i, 0) as number;
				const pageSize = this.getNodeParameter("pageSize", i, 25) as number;
				const orFilterGroups = parseJsonParam(
					this.getNodeParameter("orFilterGroups", i, "[]"),
					"orFilterGroups",
				);
				const orderBy = parseJsonParam(
					this.getNodeParameter("orderBy", i, "[]"),
					"orderBy",
				);

				const body: IDataObject = { page, pageSize };
				if (filterId) body.filterId = filterId;
				if (Array.isArray(orFilterGroups) && orFilterGroups.length)
					body.orFilterGroups = orFilterGroups;
				if (Array.isArray(orderBy) && orderBy.length) body.orderBy = orderBy;

				const data = await ssRequest(this, "POST", "/v2/contact/search", {
					body,
				});
				return {
					page,
					pageSize,
					filterId: filterId || null,
					contacts: data ?? [],
				};
			}

			const searchString = this.getNodeParameter(
				"searchString",
				i,
				"",
			) as string;
			if (!searchString.trim()) {
				throw new ApplicationError("Search requires a query string.");
			}
			const data = await ssRequest(this, "GET", "/v1/contact/search", {
				qs: { query: searchString.trim() },
			});
			return { searchString, contacts: data ?? [] };
		}

		case "getAllContacts": {
			const pageSize = 100;
			let page = 0;
			let hasMore = true;
			const allContacts: IDataObject[] = [];

			while (hasMore) {
				const data = await ssRequest(this, "GET", "/v1/contact", {
					qs: { page, pageSize },
				});
				const contacts = Array.isArray(data) ? (data as IDataObject[]) : [];
				allContacts.push(...contacts);

				if (contacts.length === pageSize) {
					page++;
				} else {
					hasMore = false;
				}
			}

			return allContacts;
		}

		case "listContacts": {
			const page = this.getNodeParameter("page", i, 0) as number;
			const pageSize = this.getNodeParameter("pageSize", i, 25) as number;
			const data = await ssRequest(this, "GET", "/v1/contact", {
				qs: { page, pageSize },
			});
			return { page, pageSize, contacts: data ?? [] };
		}

		default:
			throw new ApplicationError(`Unsupported contact operation: ${operation}`);
	}
}
