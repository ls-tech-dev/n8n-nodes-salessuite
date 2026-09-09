import type { IDataObject } from "n8n-workflow";

import { type ApiContext, ssRequest } from "./apiclient";
import { joinFieldAndGroupLabel } from "./labels";

export type SearchDataType =
	| "string"
	| "number"
	| "boolean"
	| "dateTime"
	| "select";

export type SearchSelectOption = {
	key: string;
	label: string;
	color?: string;
	icon?: string | null;
	iconColor?: string;
};

export type SearchTypeDefinition =
	| {
			type: "string";
			variant: "singleline" | "multiline" | "email" | "phone" | "link";
	  }
	| {
			type: "number";
			variant: "integer" | "float" | "currency";
			range_validation?: { from?: number; to?: number };
	  }
	| { type: "boolean"; variant: "toggle" | "buttons" | "dropdown" }
	| { type: "dateTime"; variant: "date" | "time" | "dateTime" }
	| {
			type: "select";
			variant: "single" | "multi";
			displayVariant?: "chip" | "checkbox";
			flavor?: "country" | "gender" | "title";
			options?: SearchSelectOption[];
	  }
	| { type: "action"; variant: "link" | "trigger"; config?: IDataObject };

export type SearchProperty = {
	fullPropertyIdentifier: string;
	propertyIdentifier: string;
	typeDefinition: SearchTypeDefinition;
	fieldName: string;
	id: string;
	cardType: "Contact" | "ContactPerson" | "Deal";
	propertyType: "system" | "dynamic";
	required: boolean;
	visibleInCard: boolean;
	card?: { id: string; name: string };
};

export type DecodedPropertyRef = {
	propertyIdentification: string;
	dataType?: SearchDataType;
	variant?: string;
};

const REF_SEPARATOR = "::";

export type SearchCardType = SearchProperty["cardType"];

export function isFilterableProperty(
	property: SearchProperty,
	cardTypes: readonly SearchCardType[],
): boolean {
	return (
		cardTypes.includes(property?.cardType) &&
		property?.typeDefinition?.type !== "action" &&
		Boolean(property?.fullPropertyIdentifier)
	);
}

export function encodePropertyRef(property: SearchProperty): string {
	const { type, variant } = property.typeDefinition;
	return [property.fullPropertyIdentifier, type, variant].join(REF_SEPARATOR);
}

export function decodePropertyRef(raw: unknown): DecodedPropertyRef {
	const value = String(raw ?? "").trim();
	if (!value) return { propertyIdentification: "" };

	const parts = value.split(REF_SEPARATOR);
	if (parts.length < 3) return { propertyIdentification: value };

	const [propertyIdentification, dataType, variant] = parts;
	return {
		propertyIdentification,
		dataType: dataType as SearchDataType,
		variant,
	};
}

const propertyCache = new WeakMap<object, Promise<SearchProperty[]>>();

export async function fetchSearchProperties(
	ctx: ApiContext,
): Promise<SearchProperty[]> {
	const cached = propertyCache.get(ctx);
	if (cached) return await cached;

	const pending = (async () => {
		const data = await ssRequest<SearchProperty[]>(ctx, "GET", "/v1/property");
		return Array.isArray(data) ? data : [];
	})();

	void pending.catch(() => propertyCache.delete(ctx));
	propertyCache.set(ctx, pending);

	return await pending;
}

export async function resolveDataType(
	ctx: ApiContext,
	propertyIdentification: string,
): Promise<SearchDataType | undefined> {
	const properties = await fetchSearchProperties(ctx);
	const match = properties.find(
		(property) =>
			property.fullPropertyIdentifier === propertyIdentification ||
			property.id === propertyIdentification ||
			property.propertyIdentifier === propertyIdentification,
	);

	const type = match?.typeDefinition?.type;
	return type && type !== "action" ? type : undefined;
}

export function findSearchProperty(
	properties: SearchProperty[],
	propertyIdentification: string,
): SearchProperty | undefined {
	return properties.find(
		(property) =>
			property.fullPropertyIdentifier === propertyIdentification ||
			property.id === propertyIdentification ||
			property.propertyIdentifier === propertyIdentification,
	);
}

export function getSearchPropertyLabel(property: SearchProperty): string {
	const name =
		property.fieldName ||
		property.propertyIdentifier ||
		property.fullPropertyIdentifier;
	return joinFieldAndGroupLabel(name, property.card?.name);
}
