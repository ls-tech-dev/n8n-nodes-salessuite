import type {
	ILoadOptionsFunctions,
	ResourceMapperField,
	ResourceMapperFields,
} from "n8n-workflow";

import {
	type ApiPropertyDefinition,
	getCardDisplayName,
	getDisplayName,
	getTypeDefinition,
	loadContactFieldData,
	loadContactProperties,
	prefixKey,
	sortCardProperties,
	sortCardsByCreatedAt,
} from "../../helpers/fieldMapping";
import { canUsePropertyAsField } from "./canUsePropertyAsField";
import { mapTypeToResourceMapper } from "./mapTypeToResourceMapper";

export async function getContactResourceMapperFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const data = await loadContactFieldData(this);
	const properties = await loadContactProperties(this);
	const cards = sortCardsByCreatedAt(
		Array.isArray(data?.cards) ? data.cards : [],
	);
	const propertiesById = new Map(properties.map((p) => [p.id, p]));

	const mappedByKey = new Map<
		string,
		ResourceMapperField & { group?: string }
	>();
	const mapped: Array<ResourceMapperField & { group?: string }> = [];

	const addField = (field: ApiPropertyDefinition, groupLabel: string) => {
		if (!field?.propertyIdentifier) return;
		if (
			field.dynamicDbTableName !== "Contact" &&
			field.dynamicDbTableName !== "ContactPerson"
		)
			return;

		const property = propertiesById.get(field.id) ?? field;
		if (!canUsePropertyAsField(property)) return;
		const typeDef = getTypeDefinition(property) ?? getTypeDefinition(field);
		const typeInfo = mapTypeToResourceMapper(typeDef);
		const fieldLabel = getDisplayName(field) || getDisplayName(property);
		const isEmail = field.propertyIdentifier === "email";
		const key = prefixKey(field.dynamicDbTableName, field.propertyIdentifier);

		if (mappedByKey.has(key)) return;

		const entry = {
			id: key,
			displayName: `${fieldLabel} - ${groupLabel}`,
			required: !!(field.required ?? property.required),
			canBeUsedToMatch: isEmail && field.dynamicDbTableName === "ContactPerson",
			defaultMatch: isEmail && field.dynamicDbTableName === "ContactPerson",
			display: true,
			type: typeInfo.type,
			options: typeInfo.options,
			readOnly: false,
			removed: false,
			group: groupLabel,
			...typeInfo,
		} as ResourceMapperField & { group?: string };

		mappedByKey.set(key, entry);
		mapped.push(entry);
	};

	if (cards.length > 0) {
		for (const card of cards) {
			const cardLabel = getCardDisplayName(card);
			for (const field of sortCardProperties(card.propertyDefinitions ?? [])) {
				addField(field, cardLabel);
			}
		}
	}

	for (const prop of properties) {
		const key = prefixKey(prop.dynamicDbTableName, prop.propertyIdentifier);
		if (mappedByKey.has(key)) continue;
		addField(prop, "Other");
	}

	return { fields: mapped };
}

export async function getContactResourceMapperFieldsForUpdate(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const res = await getContactResourceMapperFields.call(this);
	// In node version 2 the contact update endpoint (/v2/contact/{id}) accepts a
	// flat, contact-only body. Contact-person fields move to the Contact Person
	// resource, so hide them here to avoid silently dropped values.
	const nodeVersion = this.getNode().typeVersion ?? 1;
	let fields = res.fields;
	if (nodeVersion >= 2) {
		fields = fields.filter((f) => !f.id.startsWith("contactPerson."));
	}
	res.fields = fields.map((f) => ({
		...f,
		required: false,
		canBeUsedToMatch: false,
		defaultMatch: false,
	}));
	return res;
}

export async function getContactResourceMapperFieldsForUpsert(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const res = await getContactResourceMapperFields.call(this);
	res.fields = res.fields.map((f) => ({
		...f,
		required: false,
	}));
	return res;
}
