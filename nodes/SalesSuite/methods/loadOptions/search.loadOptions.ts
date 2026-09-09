import type { ILoadOptionsFunctions, INodePropertyOptions } from "n8n-workflow";

import { getCredentialLanguage } from "../../helpers/apiclient";
import {
	decodePropertyRef,
	encodePropertyRef,
	fetchSearchProperties,
	findSearchProperty,
	getSearchPropertyLabel,
	isFilterableProperty,
	type SearchCardType,
} from "../../helpers/searchProperties";
import { compareLabels } from "../../helpers/labels";

const CARD_TYPES_BY_RESOURCE: Record<string, readonly SearchCardType[]> = {
	contact: ["Contact", "ContactPerson"],
	deal: ["Deal", "Contact", "ContactPerson"],
};

const DEFAULT_CARD_TYPES: readonly SearchCardType[] = [
	"Contact",
	"ContactPerson",
];

function cardTypesForCurrentResource(
	ctx: ILoadOptionsFunctions,
): readonly SearchCardType[] {
	const resource = String(ctx.getCurrentNodeParameter("resource") ?? "");
	return CARD_TYPES_BY_RESOURCE[resource] ?? DEFAULT_CARD_TYPES;
}

function byLabel(language: string) {
	const compare = compareLabels(language);
	return (a: INodePropertyOptions, b: INodePropertyOptions): number =>
		compare(String(a.name), String(b.name));
}

export async function getSearchFilterProperties(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const cardTypes = cardTypesForCurrentResource(this);
	const properties = (await fetchSearchProperties(this)).filter((property) =>
		isFilterableProperty(property, cardTypes),
	);

	if (!properties.length) {
		return [{ name: "No Filterable Properties Found", value: "" }];
	}

	return properties
		.map((property) => ({
			name: getSearchPropertyLabel(property),
			value: encodePropertyRef(property),
			description: property.fullPropertyIdentifier,
		}))
		.sort(byLabel(await getCredentialLanguage(this)));
}

export async function getSearchPropertyIdentifiers(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const cardTypes = cardTypesForCurrentResource(this);
	const properties = (await fetchSearchProperties(this)).filter((property) =>
		isFilterableProperty(property, cardTypes),
	);

	if (!properties.length) {
		return [{ name: "No Properties Found", value: "" }];
	}

	return properties
		.map((property) => ({
			name: getSearchPropertyLabel(property),
			value: property.fullPropertyIdentifier,
			description: property.fullPropertyIdentifier,
		}))
		.sort(byLabel(await getCredentialLanguage(this)));
}

export async function getSearchSelectOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const raw = this.getCurrentNodeParameter("&property");
	const { propertyIdentification } = decodePropertyRef(raw);

	if (!propertyIdentification) {
		return [{ name: "Select a Property First", value: "" }];
	}

	const properties = await fetchSearchProperties(this);
	const match = findSearchProperty(properties, propertyIdentification);

	if (!match || match.typeDefinition?.type !== "select") {
		return [{ name: "Property Is Not a Select", value: "" }];
	}

	const options = match.typeDefinition.options ?? [];
	if (!options.length) {
		return [
			{
				name: "No Predefined Options - Switch Value Source to Custom Keys",
				value: "",
			},
		];
	}

	return options.map((option) => ({
		name: option.label || option.key,
		value: option.key,
		description: option.key,
	}));
}
