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
	loadDealFieldData,
	loadDealProperties,
	prefixKey,
	sortCardProperties,
	sortCardsByCreatedAt,
} from "../../helpers/fieldMapping";
import { canUsePropertyAsField } from "./canUsePropertyAsField";
import { mapTypeToResourceMapper } from "./mapTypeToResourceMapper";

export async function getDealResourceMapperFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const data = await loadDealFieldData(this);
	const properties = await loadDealProperties(this);
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
		if (field.dynamicDbTableName !== "Deal") return;
		if (field.propertyIdentifier === "name") return;

		const property = propertiesById.get(field.id) ?? field;
		if (!canUsePropertyAsField(property)) return;
		const typeDef = getTypeDefinition(property) ?? getTypeDefinition(field);
		const typeInfo = mapTypeToResourceMapper(typeDef);
		const fieldLabel = getDisplayName(field) || getDisplayName(property);
		const key = prefixKey(field.dynamicDbTableName, field.propertyIdentifier);

		if (mappedByKey.has(key)) return;

		const entry = {
			id: key,
			displayName: `${fieldLabel} - ${groupLabel}`,
			required: !!(field.required ?? property.required),
			canBeUsedToMatch: false,
			defaultMatch: false,
			display: true,
			type: typeInfo.type,
			options: typeInfo.options,
			readOnly: false,
			removed: false,
			group: groupLabel,
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

export async function getDealResourceMapperFieldsForUpdate(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const res = await getDealResourceMapperFields.call(this);
	res.fields = res.fields.map((f) => ({
		...f,
		required: false,
		canBeUsedToMatch: false,
		defaultMatch: false,
	}));
	return res;
}
