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
import { type SearchProperty, fetchSearchProperties } from "./searchProperties";
import { compareLabels } from "./labels";

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
	// Joined in from GET /v1/property, which honours x-lang; /v1/fields/* does
	// not. Deliberately not called `fieldName`: /v1/fields/* is undocumented, so
	// a field of that name appearing there later must not be mistaken for this.
	localizedFieldName?: string | null;
};

export type ApiCardDefinition = {
	id: string;
	displayName?: string | null;
	// Stable name of a system card, null for user-created ones. This is what
	// /v1/fields/* returns; the `systemCardName` of /v1/card is not part of it.
	internalCardName?: string | null;
	createdAt?: string | null;
	propertyDefinitions: ApiPropertyDefinition[];
	// Joined in from the `card` object embedded in GET /v1/property. See the note
	// on ApiPropertyDefinition.localizedFieldName.
	localizedName?: string | null;
};

export type FieldApiResponse = {
	properties: ApiPropertyDefinition[];
	cards?: ApiCardDefinition[];
};

function toTimestamp(value?: string | null): number {
	if (!value) return Number.MAX_SAFE_INTEGER;
	const timestamp = Date.parse(value);
	return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

export function getCardDisplayName(card: ApiCardDefinition): string {
	// The API's own, x-lang aware name.
	const localizedName = (card.localizedName ?? "").trim();
	if (localizedName) return localizedName;

	// Fallback for when that request failed. A system card carries a raw i18n key
	// in displayName and its stable name in internalCardName; a user-created card
	// has no internalCardName but a real name in displayName. So this degrades to
	// "CoreData" rather than leaking "dynamicTable.contact.card.coreData.displayName",
	// and it covers system cards added later without a lookup table to maintain.
	const internalCardName = (card.internalCardName ?? "").trim();
	if (internalCardName) return internalCardName;

	return (card.displayName ?? "").trim() || "Other";
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
	language: string,
): ApiPropertyDefinition[] {
	const compare = compareLabels(language);
	return [...properties].sort((a, b) => {
		const aSortIndex = a.sortIndexInCard ?? Number.MAX_SAFE_INTEGER;
		const bSortIndex = b.sortIndexInCard ?? Number.MAX_SAFE_INTEGER;
		if (aSortIndex !== bSortIndex) return aSortIndex - bSortIndex;

		const createdAtDiff = toTimestamp(a.createdAt) - toTimestamp(b.createdAt);
		if (createdAtDiff !== 0) return createdAtDiff;

		return compare(getDisplayName(a), getDisplayName(b));
	});
}

/**
 * Index of the localized labels served by GET /v1/property, keyed by the ids
 * that GET /v1/fields/* uses. Pure and context-free so it can be exercised
 * against a captured payload.
 */
export type LabelIndex = {
	propertyNameById: Map<string, string>;
	cardNameById: Map<string, string>;
};

export function buildLabelIndex(properties: SearchProperty[]): LabelIndex {
	const propertyNameById = new Map<string, string>();
	const cardNameById = new Map<string, string>();

	for (const property of properties) {
		const fieldName = (property?.fieldName ?? "").trim();
		if (property?.id && fieldName) propertyNameById.set(property.id, fieldName);

		const card = property?.card;
		const cardName = (card?.name ?? "").trim();
		if (card?.id && cardName && !cardNameById.has(card.id)) {
			cardNameById.set(card.id, cardName);
		}
	}

	return { propertyNameById, cardNameById };
}

/**
 * Writes the localized labels onto a /v1/fields/* response, in place.
 *
 * Card-embedded property definitions are enriched separately from the top-level
 * `properties` array on purpose: the two are distinct objects for the same
 * property, and the resource mappers read the field label off the card-embedded
 * one, so enriching only the top-level array would have no visible effect.
 */
export function applyLabelIndex(
	data: FieldApiResponse,
	index: LabelIndex,
): FieldApiResponse {
	const applyToProperty = (property: ApiPropertyDefinition) => {
		const name = index.propertyNameById.get(property?.id);
		if (name) property.localizedFieldName = name;
	};

	for (const property of data.properties ?? []) applyToProperty(property);

	for (const card of data.cards ?? []) {
		const cardName = index.cardNameById.get(card?.id);
		if (cardName) card.localizedName = cardName;
		for (const property of card?.propertyDefinitions ?? []) {
			applyToProperty(property);
		}
	}

	return data;
}

/**
 * Joins the localized labels in. Purely cosmetic, so a failure must never break
 * a mapper: on any error the untouched response is returned and labels fall back
 * to what they were before.
 */
async function localizeFieldResponse(
	ctx: ILoadOptionsFunctions | IExecuteFunctions,
	data: FieldApiResponse,
): Promise<FieldApiResponse> {
	try {
		const properties = await fetchSearchProperties(ctx);
		if (!properties.length) return data;
		return applyLabelIndex(data, buildLabelIndex(properties));
	} catch (error) {
		ctx.logger?.warn?.(
			"SalesSuite: could not load localized field labels from /v1/property; falling back to untranslated labels.",
			{ error },
		);
		return data;
	}
}

/**
 * Per-context cache of the /v1/fields/* responses, keyed by endpoint path.
 *
 * This is a prerequisite rather than an optimization: the node dispatches one
 * handler call per input item, and each of those loads the field definitions to
 * build its type map, so an uncached 500-item run issues 500 requests per
 * endpoint — doubled once the localization join is added. A context object is
 * created fresh per load-options request and per execution, so the cache cannot
 * go stale and a changed credential language takes effect on the next open.
 *
 * The cached response is shared: treat it as read-only. Nothing mutates it today
 * (the sort helpers copy, the loaders filter, the mappers build new objects).
 */
const fieldDataCache = new WeakMap<
	object,
	Map<string, Promise<FieldApiResponse>>
>();

async function loadFieldData(
	ctx: ILoadOptionsFunctions | IExecuteFunctions,
	path: "/v1/fields/contact" | "/v1/fields/deal",
): Promise<FieldApiResponse> {
	let byPath = fieldDataCache.get(ctx);
	if (!byPath) {
		byPath = new Map();
		fieldDataCache.set(ctx, byPath);
	}

	const cached = byPath.get(path);
	if (cached) return await cached;

	const pending = (async () => {
		const data = (await ssRequest<FieldApiResponse>(ctx, "GET", path)) ?? {
			properties: [],
		};
		return await localizeFieldResponse(ctx, data);
	})();

	// Evict a rejected promise so a transient failure does not stick for the
	// rest of the run. The rejection itself still surfaces through the await.
	void pending.catch(() => byPath.delete(path));
	byPath.set(path, pending);

	return await pending;
}

export async function loadContactFieldData(
	ctx: ILoadOptionsFunctions | IExecuteFunctions,
): Promise<FieldApiResponse> {
	return await loadFieldData(ctx, "/v1/fields/contact");
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

/**
 * Contact-person field metadata is read from `/v1/fields/contact`, not from
 * `/v1/fields/contact-person`. Both return the identical set of ContactPerson
 * properties, but only the contact endpoint includes
 * `resolvedPropertyDefinition.propertyInfo` (which flags system properties as
 * editable) and the "Contact Person" card used for grouping and ordering.
 * Without it every system property — firstName, lastName, email, phone — is
 * dropped by canUsePropertyAsField and never reaches the resource mapper.
 */
export async function loadContactPersonFieldData(
	ctx: ILoadOptionsFunctions | IExecuteFunctions,
): Promise<FieldApiResponse> {
	return await loadContactFieldData(ctx);
}

export async function loadContactPersonProperties(
	ctx: ILoadOptionsFunctions | IExecuteFunctions,
): Promise<ApiPropertyDefinition[]> {
	const data = await loadContactPersonFieldData(ctx);
	const props = Array.isArray(data?.properties) ? data.properties : [];
	// Contact properties are dropped here: the source endpoint returns both
	// tables, but the contact-person endpoints only accept contact-person fields.
	return props.filter(
		(p) => p.dynamicDbTableName === "ContactPerson" && canUsePropertyAsField(p),
	);
}

export async function loadDealFieldData(
	ctx: ILoadOptionsFunctions | IExecuteFunctions,
): Promise<FieldApiResponse> {
	return await loadFieldData(ctx, "/v1/fields/deal");
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
	// `||` rather than `??` so that empty strings fall through, as before.
	return (
		prop.localizedFieldName ||
		prop.dynamicTypeDefinition?.fieldName ||
		prop.propertyIdentifier
	);
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
