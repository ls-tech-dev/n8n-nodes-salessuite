import { ApplicationError, IDataObject, IExecuteFunctions } from "n8n-workflow";

import { ssRequest } from "../../helpers/apiclient";
import {
	buildTypeMap,
	loadContactPersonProperties,
	normalizeValue,
	splitPrefixedFields,
} from "../../helpers/fieldMapping";

// Reduces a contact-person resourceMapper value to a flat, contactPerson-only
// payload. The mapper also exposes contact.* fields (shared cards); those are
// intentionally dropped here because the contact-person endpoints only accept
// contact-person fields.
async function sanitizeContactPersonPayload(
	this: IExecuteFunctions,
	raw: unknown,
): Promise<IDataObject> {
	const maybe = (raw ?? {}) as IDataObject;
	const val = (maybe.value ?? maybe) as IDataObject;

	const { contactPerson } = splitPrefixedFields(val);

	const properties = await loadContactPersonProperties(this);
	const typeMap = buildTypeMap(properties);

	const out: IDataObject = {};
	for (const [key, value] of Object.entries(contactPerson)) {
		const typeDef = typeMap.get(`contactPerson.${key}`);
		const normalized = normalizeValue(value, typeDef);
		if (normalized === undefined) continue;
		out[key] = normalized;
	}

	return out;
}

export async function handleContactPerson(
	this: IExecuteFunctions,
	i: number,
	operation: string,
): Promise<unknown> {
	switch (operation) {
		case "create": {
			const contactId = (
				this.getNodeParameter("contactId", i) as string
			)?.trim();
			if (!contactId) {
				throw new ApplicationError("contactId is required.");
			}

			const makeMainContactPerson = this.getNodeParameter(
				"makeMainContactPerson",
				i,
				false,
			) as boolean;

			const fieldsParam = this.getNodeParameter("fields", i, {} as IDataObject);
			const contactPerson = await sanitizeContactPersonPayload.call(
				this,
				fieldsParam,
			);

			if (!String(contactPerson.email ?? "").trim()) {
				throw new ApplicationError("Create Contact Person requires an email.");
			}

			const result = await ssRequest(this, "POST", "/v1/contact-person", {
				body: { contactId, contactPerson, makeMainContactPerson },
			});

			return {
				...(result ?? {}),
				inputData: { contactId, contactPerson, makeMainContactPerson },
			};
		}

		case "update": {
			const contactPersonId = (
				this.getNodeParameter("contactPersonId", i) as string
			)?.trim();
			if (!contactPersonId) {
				throw new ApplicationError("contactPersonId is required.");
			}

			const fieldsParam = this.getNodeParameter("fields", i, {} as IDataObject);
			const body = await sanitizeContactPersonPayload.call(this, fieldsParam);

			if (Object.keys(body).length === 0) {
				throw new ApplicationError("No fields provided to update.");
			}

			const result = await ssRequest(
				this,
				"PATCH",
				`/v1/contact-person/${contactPersonId}`,
				{ body },
			);

			return { ...(result ?? {}), inputData: body };
		}

		case "delete": {
			const contactPersonId = (
				this.getNodeParameter("contactPersonId", i) as string
			)?.trim();
			if (!contactPersonId) {
				throw new ApplicationError("contactPersonId is required.");
			}

			const result = await ssRequest<IDataObject>(
				this,
				"DELETE",
				`/v1/contact-person/${contactPersonId}`,
			);

			return { contactPersonId, deleted: true, ...(result ?? {}) };
		}

		case "setMainContactPerson": {
			const contactPersonId = (
				this.getNodeParameter("contactPersonId", i) as string
			)?.trim();
			if (!contactPersonId) {
				throw new ApplicationError("contactPersonId is required.");
			}

			const result = await ssRequest<IDataObject>(
				this,
				"PUT",
				`/v1/contact-person/${contactPersonId}/main-contact-person`,
			);

			return { contactPersonId, mainContactPerson: true, ...(result ?? {}) };
		}

		case "getContactPersonById": {
			const contactPersonId = (
				this.getNodeParameter("contactPersonId", i) as string
			)?.trim();

			if (!contactPersonId) {
				throw new ApplicationError("contactPersonId is required.");
			}

			const data = await ssRequest<IDataObject>(
				this,
				"GET",
				`/v1/contact-person/${contactPersonId}`,
			);

			return [
				{
					contactPersonId,
					found: true,
					...(data ?? {}),
				},
			];
		}

		default:
			throw new ApplicationError(
				`Unsupported contactPerson operation: ${operation}`,
			);
	}
}
