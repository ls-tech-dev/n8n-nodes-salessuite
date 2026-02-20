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
			emptyString: { severity: "info", replacement: undefined as any },
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
					emptyString: { replacement: undefined as any, severity: "silent" },
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
					emptyString: { replacement: undefined as any, severity: "silent" },
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
	propertyType?: "dynamic" | "system" | string | null;
	required?: boolean | null;
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

export type FieldApiResponse = {
	properties: ApiPropertyDefinition[];
	cards?: Array<{
		id: string;
		displayName?: string | null;
		internalCardName?: string | null;
		propertyDefinitions: ApiPropertyDefinition[];
	}>;
};

export async function loadContactFieldData(
	ctx: ILoadOptionsFunctions | IExecuteFunctions,
): Promise<FieldApiResponse> {
	return ssRequest(ctx as any, "GET", "/fields/contact");
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

export async function loadDealFieldData(
	ctx: ILoadOptionsFunctions | IExecuteFunctions,
): Promise<FieldApiResponse> {
	return ssRequest(ctx as any, "GET", "/fields/deal");
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
