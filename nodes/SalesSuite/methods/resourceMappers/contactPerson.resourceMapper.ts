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
	loadContactPersonFieldData,
	loadContactPersonProperties,
	prefixKey,
	sortCardProperties,
	sortCardsByCreatedAt,
} from "../../helpers/fieldMapping";
import { canUsePropertyAsField } from "./canUsePropertyAsField";
import { mapTypeToResourceMapper } from "./mapTypeToResourceMapper";

export async function getContactPersonResourceMapperFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const data = await loadContactPersonFieldData(this);
	const properties = await loadContactPersonProperties(this);
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
		// Fall back to the table name (Contact / ContactPerson) instead of a
		// generic "Other" group for uncarded properties.
		addField(prop, prop.dynamicDbTableName);
	}

	return { fields: mapped };
}

export async function getContactPersonResourceMapperFieldsForUpdate(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const res = await getContactPersonResourceMapperFields.call(this);
	res.fields = res.fields.map((f) => ({
		...f,
		required: false,
		canBeUsedToMatch: false,
		defaultMatch: false,
	}));
	return res;
}
