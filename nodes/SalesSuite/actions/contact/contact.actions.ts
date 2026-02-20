import { ApplicationError, IDataObject, IExecuteFunctions } from "n8n-workflow";

import { ssRequest } from "../../helpers/apiclient";
import {
	buildTypeMap,
	loadContactProperties,
	normalizeValue,
	splitPrefixedFields,
} from "../../helpers/fieldMapping";
import { createNote } from "../../helpers/notes";

async function sanitizeContactPayload(
	this: IExecuteFunctions,
	raw: unknown,
): Promise<{
	contact: any;
	contactPerson: any;
}> {
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

	return createNote(ctx, contactId, initialNoteText, "contact");
}

function pickEmail(payload: {
	contact: IDataObject;
	contactPerson: IDataObject;
}): string {
	const email = payload.contactPerson?.email ?? payload.contact?.email;
	return String(email ?? "").trim();
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

			const result = await ssRequest(this, "POST", "/contact/create", {
				body: payload,
			});

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
				delete (payload.contact as any)?.email;
				delete (payload.contactPerson as any)?.email;
			}

			const hasFields =
				Object.keys(payload.contact).length > 0 ||
				Object.keys(payload.contactPerson).length > 0;
			if (!hasFields) {
				throw new ApplicationError("No fields provided to update.");
			}

			const appendMultiSelectValues = this.getNodeParameter(
				"appendMultiSelectValues",
				i,
				false,
			) as boolean;

			const result = await ssRequest(this, "PATCH", `/contact/${contactId}`, {
				qs: { appendMultiSelectValues },
				body: payload,
			});

			const initialNoteId = await maybeCreateNote(this, i, contactId);

			return { ...(result ?? {}), inputData: payload, initialNoteId };
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

			const lookup = (await ssRequest(this, "GET", "/contact/by-email", {
				qs: { email },
			})) as Array<any>;

			const existing = Array.isArray(lookup) ? lookup[0] : null;
			const contactId = existing?.contact?.id as string | undefined;

			if (contactId) {
				const appendMultiSelectValues = this.getNodeParameter(
					"appendMultiSelectValues",
					i,
					false,
				) as boolean;
				const result = await ssRequest(this, "PATCH", `/contact/${contactId}`, {
					qs: { appendMultiSelectValues },
					body: payload,
				});
				return {
					mode: "found-and-updated",
					...(result ?? {}),
					inputData: payload,
				};
			}

			const created = await ssRequest(this, "POST", "/contact/create", {
				body: payload,
			});

			return { mode: "created-new", ...(created ?? {}), inputData: payload };
		}

		case "getByEmail": {
			const email = this.getNodeParameter("email", i) as string;
			const data = await ssRequest(this, "GET", "/contact/by-email", {
				qs: { email },
			});
			return { email, contacts: data ?? [] };
		}

		case "getContactById": {
			const contactId = this.getNodeParameter("contactId", i) as string;
			const data = await ssRequest(this, "GET", `/contact/${contactId}`);
			return { contactId, contact: data ?? null };
		}

		case "searchContacts": {
			const searchString = this.getNodeParameter(
				"searchString",
				i,
				"",
			) as string;
			if (!searchString.trim()) {
				throw new ApplicationError("Search requires a query string.");
			}
			const data = await ssRequest(this, "GET", "/contact/search", {
				qs: { query: searchString.trim() },
			});
			return { searchString, contacts: data ?? [] };
		}

		case "listContacts": {
			const page = this.getNodeParameter("page", i, 0) as number;
			const pageSize = this.getNodeParameter("pageSize", i, 25) as number;
			const data = await ssRequest(this, "GET", "/contact", {
				qs: { page, pageSize },
			});
			return { page, pageSize, contacts: data ?? [] };
		}

		default:
			throw new ApplicationError(`Unsupported contact operation: ${operation}`);
	}
}
