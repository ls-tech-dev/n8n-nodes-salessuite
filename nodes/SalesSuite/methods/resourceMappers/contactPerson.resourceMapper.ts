import {
	type ILoadOptionsFunctions,
	NodeOperationError,
	type ResourceMapperField,
	type ResourceMapperFields,
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
import { getCredentialLanguage } from "../../helpers/apiclient";
import { joinFieldAndGroupLabel } from "../../helpers/labels";
import { canUsePropertyAsField } from "./canUsePropertyAsField";
import { mapTypeToResourceMapper } from "./mapTypeToResourceMapper";

export async function getContactPersonResourceMapperFields(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const data = await loadContactPersonFieldData(this);
	const properties = await loadContactPersonProperties(this);
	const language = await getCredentialLanguage(this);
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
		// The field data is loaded from /v1/fields/contact, which also carries the
		// Contact table. Only contact-person fields are accepted by the
		// contact-person endpoints, so everything else is dropped here.
		if (field.dynamicDbTableName !== "ContactPerson") return;

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
			displayName: joinFieldAndGroupLabel(fieldLabel, groupLabel),
			required: !!(field.required ?? property.required),
			canBeUsedToMatch: isEmail,
			defaultMatch: isEmail,
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
			for (const field of sortCardProperties(
				card.propertyDefinitions ?? [],
				language,
			)) {
				addField(field, cardLabel);
			}
		}
	}

	for (const prop of properties) {
		const key = prefixKey(prop.dynamicDbTableName, prop.propertyIdentifier);
		if (mappedByKey.has(key)) continue;
		// Fall back to the table name instead of a generic "Other" group for
		// properties that are not assigned to any card.
		addField(prop, prop.dynamicDbTableName);
	}

	// An empty field list is never legitimate: every tenant has at least the
	// system properties. Failing loudly here surfaces a changed API response
	// format instead of silently rendering a mapper without any fields.
	if (mapped.length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			"SalesSuite: no usable contact person fields were returned by /v1/fields/contact.",
			{
				description:
					"The API response format may have changed. Check that ContactPerson properties still carry resolvedPropertyDefinition.",
				level: "warning",
			},
		);
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
