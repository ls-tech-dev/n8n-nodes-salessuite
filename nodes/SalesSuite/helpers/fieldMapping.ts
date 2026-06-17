import {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from "n8n-workflow";

import {
	type DynamicDbTableName,
	type FixValueForTypeDefinitionConfig,
	type TypeDefinition,
	createDataFixerForTypeDefinition,
} from "./property-definition";

type TypeConverterConfigStringToDate = {
	format: "any" | "WallTime" | string;
	emptyString?: { severity: string; replacement: unknown };
};

type TypeConverterConfigToDate = {
	fromUndefined?: unknown;
	fromNull?: unknown;
	fromNumber?: unknown;
	fromString?: TypeConverterConfigStringToDate;
};

import { canUsePropertyAsField } from "../methods/resourceMappers/canUsePropertyAsField";
import { ssRequest } from "./apiclient";

function getStrictDateConverterConfig(
	format: TypeConverterConfigStringToDate["format"],
): TypeConverterConfigToDate {
	return {
		fromUndefined: undefined,
		fromNull: undefined,
		fromNumber: {
			excelConversion: true,
			unixTimestampSeconds: true,
			jsDateMilliseconds: true,
		},
		fromString: {
			format: format,
			emptyString: { severity: "info", replacement: undefined },
		},
	};
}

function getTypeCoercionConfig(
	locale: string,
): FixValueForTypeDefinitionConfig {
	return {
		boolean: {
			typeConverterConfig: {
				fromNull: undefined,
				fromUndefined: undefined,
				fromNumber: "info",
				fromBigInt: "info",
				fromString: {
					caseSensitive: false,
					trueValues: ["true"],
					falseValues: ["false"],
					emptyString: { replacement: undefined, severity: "silent" },
				},
			},
		},
		number: {
			typeConverterConfig: {
				fromUndefined: undefined,
				fromNull: undefined,
				fromNumber: {
					infinity: undefined,
					nan: undefined,
				},
				fromBigInt: {
					type: "clamp",
					severity: "warning",
				},
				fromBoolean: undefined,
				fromString: {
					/**
					 * the GQL API should always use . as decimal separator
					 */
					locale: locale,
					suffixes: {
						kilo: true,
					},
					currency: "auto",
					specialNumberConfig: undefined,
					emptyString: { replacement: undefined, severity: "silent" },
					onlySignsAsZero: true,
				},
			},
			range: {
				clampToMinSeverity: "info",
				clampToMaxSeverity: "info",
			},
		},
		string: {
			typeConverterConfig: {
				fromUndefined: undefined,
				fromNull: undefined,
				fromNumber: { format: "simple", nan: undefined, infinity: undefined },
				fromBigInt: "silent",
				fromBoolean: {
					trueString: "true",
					falseString: "false",
					severity: "silent",
				},
			},
			email: {
				trimWhitespace: "silent",
				changeToLowerCase: "silent",
				zodEmailCheck: "error",
			},
			link: {
				trimWhitespace: "silent",
				ensureUrlOpensInNewRoot: "info",
				skipStrictUrlCheck: true,
			},
			phoneNumber: {
				fixPhoneNumber: {
					reportMode: "reportChangesExceptWhitespace",
					severity: "info",
				},
			},
		},
		dateTime: {
			date: getStrictDateConverterConfig("any"),
			dateTime: getStrictDateConverterConfig("any"),
			time: getStrictDateConverterConfig("WallTime"),
		},
		select: {
			parseJson: undefined,
			countrySelect: {
				convertedToAlpha2Code: "info",
				unknownCountry: "warning",
			},
			optionsConfig: {
				unknownItem: "warning",
				ignoreDuplicateLabel: true,
				/**
				 * we always get the labels only form the external GQL
				 */
				mapByLabelWhenKeyNotFound: "silent",
			},
		},
	};
}

export const TABLE_PREFIX: Record<DynamicDbTableName, string> = {
	Contact: "contact",
	ContactPerson: "contactPerson",
	Deal: "deal",
};

export function prefixKey(tableName: DynamicDbTableName, key: string) {
	return `${TABLE_PREFIX[tableName]}.${key}`;
}

export type ApiPropertyDefinition = {
	id: string;
	propertyIdentifier: string;
	dynamicDbTableName: DynamicDbTableName;
	cardId?: string | null;
	createdAt?: string | null;
	propertyType?: "dynamic" | "system" | string | null;
	required?: boolean | null;
	sortIndexInCard?: number | null;
	dynamicTypeDefinition?: {
		fieldName?: string;
		shortName?: string;
		description?: string | null;
		type?: TypeDefinition | null;
	} | null;
	typeDefinition?: TypeDefinition | null;
	resolvedPropertyDefinition?: {
		propertyInfo?: {
			editableInForm?: boolean;
			editableInBulk?: boolean;
		} | null;
	} | null;
};

export type ApiCardDefinition = {
	id: string;
	displayName?: string | null;
	internalCardName?: string | null;
	createdAt?: string | null;
	propertyDefinitions: ApiPropertyDefinition[];
};

export type FieldApiResponse = {
	properties: ApiPropertyDefinition[];
	cards?: ApiCardDefinition[];
};

const CARD_DISPLAY_NAME_MAP: Record<string, string> = {
	"dynamicTable.contact.card.contactPerson.displayName": "Contact Person",
	"dynamicTable.contact.card.coreData.displayName": "Contact",
	"dynamicTable.contact.card.marketingInformation.displayName":
		"Marketing Information",
	"dynamicTable.deal.card.dealProperties.displayName": "Deal Information",
};

function toTimestamp(value?: string | null): number {
	if (!value) return Number.MAX_SAFE_INTEGER;
	const timestamp = Date.parse(value);
	return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

export function getCardDisplayName(card: ApiCardDefinition): string {
	const rawDisplayName = (card.displayName ?? "").trim();
	if (rawDisplayName) {
		return CARD_DISPLAY_NAME_MAP[rawDisplayName] ?? rawDisplayName;
	}

	return "Other";
}

export function sortCardsByCreatedAt(
	cards: ApiCardDefinition[],
): ApiCardDefinition[] {
	return [...cards].sort(
		(a, b) => toTimestamp(a.createdAt) - toTimestamp(b.createdAt),
	);
}

export function sortCardProperties(
	properties: ApiPropertyDefinition[],
): ApiPropertyDefinition[] {
	return [...properties].sort((a, b) => {
		const aSortIndex = a.sortIndexInCard ?? Number.MAX_SAFE_INTEGER;
		const bSortIndex = b.sortIndexInCard ?? Number.MAX_SAFE_INTEGER;
		if (aSortIndex !== bSortIndex) return aSortIndex - bSortIndex;

		const createdAtDiff = toTimestamp(a.createdAt) - toTimestamp(b.createdAt);
		if (createdAtDiff !== 0) return createdAtDiff;

		return getDisplayName(a).localeCompare(getDisplayName(b));
	});
}

export async function loadContactFieldData(
	ctx: ILoadOptionsFunctions | IExecuteFunctions,
): Promise<FieldApiResponse> {
	return (
		(await ssRequest<FieldApiResponse>(ctx, "GET", "/v1/fields/contact")) ?? {
			properties: [],
		}
	);
}

export async function loadContactProperties(
	ctx: ILoadOptionsFunctions | IExecuteFunctions,
): Promise<ApiPropertyDefinition[]> {
	const data = await loadContactFieldData(ctx);
	const props = Array.isArray(data?.properties) ? data.properties : [];
	return props.filter(
		(p) =>
			(p.dynamicDbTableName === "Contact" ||
				p.dynamicDbTableName === "ContactPerson") &&
			canUsePropertyAsField(p),
	);
}

export async function loadContactPersonFieldData(
	ctx: ILoadOptionsFunctions | IExecuteFunctions,
): Promise<FieldApiResponse> {
	return (
		(await ssRequest<FieldApiResponse>(
			ctx,
			"GET",
			"/v1/fields/contact-person",
		)) ?? {
			properties: [],
		}
	);
}

export async function loadContactPersonProperties(
	ctx: ILoadOptionsFunctions | IExecuteFunctions,
): Promise<ApiPropertyDefinition[]> {
	const data = await loadContactPersonFieldData(ctx);
	const props = Array.isArray(data?.properties) ? data.properties : [];
	return props.filter(
		(p) =>
			(p.dynamicDbTableName === "Contact" ||
				p.dynamicDbTableName === "ContactPerson") &&
			canUsePropertyAsField(p),
	);
}

export async function loadDealFieldData(
	ctx: ILoadOptionsFunctions | IExecuteFunctions,
): Promise<FieldApiResponse> {
	return (
		(await ssRequest<FieldApiResponse>(ctx, "GET", "/v1/fields/deal")) ?? {
			properties: [],
		}
	);
}

export async function loadDealProperties(
	ctx: ILoadOptionsFunctions | IExecuteFunctions,
): Promise<ApiPropertyDefinition[]> {
	const data = await loadDealFieldData(ctx);
	const props = Array.isArray(data?.properties) ? data.properties : [];
	return props.filter(
		(p) => p.dynamicDbTableName === "Deal" && canUsePropertyAsField(p),
	);
}

export function getTypeDefinition(
	prop: ApiPropertyDefinition,
): TypeDefinition | undefined {
	return (prop.typeDefinition ??
		prop.dynamicTypeDefinition?.type ??
		undefined) as TypeDefinition | undefined;
}

export function getDisplayName(prop: ApiPropertyDefinition): string {
	return prop.dynamicTypeDefinition?.fieldName || prop.propertyIdentifier;
}

export function buildTypeMap(
	properties: ApiPropertyDefinition[],
): Map<string, TypeDefinition | undefined> {
	const map = new Map<string, TypeDefinition | undefined>();
	for (const prop of properties) {
		const key = prefixKey(prop.dynamicDbTableName, prop.propertyIdentifier);
		map.set(key, getTypeDefinition(prop));
	}
	return map;
}

export function normalizeValue(
	value: unknown,
	typeDef?: TypeDefinition,
	locale = "en",
): unknown {
	if (value === undefined || value === null) return undefined;
	if (typeof value === "string" && value.trim() === "") return undefined;

	if (!typeDef) return value;

	// Select fields: API always expects an array (even for single-select)
	if (typeDef.type === "select") {
		if (Array.isArray(value)) return value;
		if (typeof value === "string") return [value];
		return undefined;
	}

	const fixedValue = createDataFixerForTypeDefinition(
		typeDef,
		getTypeCoercionConfig(locale),
	)(value);

	return fixedValue.value;
}

export function splitPrefixedFields(input: IDataObject) {
	const contact: IDataObject = {};
	const contactPerson: IDataObject = {};
	const deal: IDataObject = {};

	for (const [key, value] of Object.entries(input)) {
		if (key.startsWith("contact.")) {
			contact[key.slice("contact.".length)] = value;
			continue;
		}
		if (key.startsWith("contactPerson.")) {
			contactPerson[key.slice("contactPerson.".length)] = value;
			continue;
		}
		if (key.startsWith("deal.")) {
			deal[key.slice("deal.".length)] = value;
			continue;
		}
		contact[key] = value;
	}

	return { contact, contactPerson, deal };
}
