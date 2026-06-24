import type { ILoadOptionsFunctions, INodePropertyOptions } from "n8n-workflow";

import {
	type CallActivityResultType,
	type OpeningCallResultNew,
	closingCallResultSchema,
	openingCallResultSchema,
	settingCallResultSchema,
} from "../../helpers/call-activity";
import { ssRequest } from "../../helpers/apiclient";
import {
	getTypeDefinition,
	loadContactPersonProperties,
} from "../../helpers/fieldMapping";

function assertUnreachable(x: never): never {
	throw new Error(`Unhandled call activity type: ${String(x)}`);
}

type CallTypePayload = { id: string; name: string; category?: string };

function generateOpeningCallResults(): CallActivityResultType[] {
	const options = openingCallResultSchema.options.flatMap((opt) => {
		if ("viaGatekeeper" in opt._def.shape()) {
			return [true, false].map((viaGatekeeper) => ({
				result: opt._def.shape().result.value,
				viaGatekeeper,
			}));
		}
		return {
			result: opt._def.shape().result.value,
		};
	});

	return options.map(
		(opt) =>
			({
				type: "opening",
				openingResult: opt as OpeningCallResultNew,
			}) satisfies CallActivityResultType,
	);
}

function buildCallResultOptions(
	callTypes: CallTypePayload[],
	selectedCallTypeId?: string,
): CallActivityResultType[] {
	const selected = selectedCallTypeId
		? callTypes.find((ct) => String(ct.id) === String(selectedCallTypeId))
		: undefined;
	const optionsByCategory = {
		setting: settingCallResultSchema.options.map(
			(opt) =>
				({
					type: "setting",
					settingResult: opt,
				}) satisfies CallActivityResultType,
		),
		closing: closingCallResultSchema.options.map(
			(opt) =>
				({
					type: "closing",
					closingResult: opt,
				}) satisfies CallActivityResultType,
		),
		opening: generateOpeningCallResults(),
	};

	if (
		selected?.category &&
		optionsByCategory[selected.category as keyof typeof optionsByCategory]
	) {
		return optionsByCategory[
			selected.category as keyof typeof optionsByCategory
		];
	}

	return [
		...optionsByCategory.closing,
		...optionsByCategory.opening,
		...optionsByCategory.setting,
	];
}

function toCallResultOption(
	option: CallActivityResultType,
): INodePropertyOptions {
	const type = option.type;
	switch (type) {
		case "opening": {
			const viaGatekeeper = option.openingResult.viaGatekeeper;
			const suffix =
				viaGatekeeper !== undefined
					? ` (${viaGatekeeper ? "via gatekeeper" : "direct"})`
					: "";
			return {
				name: `${option.openingResult.result}${suffix}`,
				value: JSON.stringify(option),
			};
		}
		case "setting":
			return {
				name: option.settingResult ?? "",
				value: JSON.stringify(option),
			};
		case "closing":
			return {
				name: option.closingResult ?? "",
				value: JSON.stringify(option),
			};
		default:
			assertUnreachable(type);
	}
}

/** Load phone call activity types from API */
export async function loadPhoneCallActivityTypes(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const list = (await ssRequest(
		this,
		"GET",
		"/v1/call-types",
	)) as CallTypePayload[];
	return [
		{ name: "Any Call Type", value: "any" },
		...(list ?? []).map((t: CallTypePayload) => ({
			name: t.category ? `${t.name} (${t.category})` : t.name,
			value: String(t.id),
		})),
	];
}

/** Load call result types depending on selected call type (or any) */
export async function loadCallResultTypes(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	let callTypeId = "";
	try {
		callTypeId = (this.getNodeParameter("callTypeId", 0) as string) || "";
	} catch {
		callTypeId = "";
	}
	if (!callTypeId) {
		try {
			callTypeId =
				(this.getNodeParameter("phoneCallActivityTypeId", 0) as string) || "";
		} catch {
			callTypeId = "";
		}
	}

	const list = (await ssRequest(
		this,
		"GET",
		"/v1/call-types",
	)) as CallTypePayload[];
	const selectedCallTypeId =
		callTypeId && callTypeId !== "any" ? callTypeId : undefined;
	const options = buildCallResultOptions(list ?? [], selectedCallTypeId);
	return [
		{ name: "Any Call Result", value: "any" },
		...options.map(toCallResultOption),
	];
}

type ContactPersonLite = {
	id?: string;
	firstName?: string | null;
	lastName?: string | null;
	email?: string | null;
	[key: string]: unknown;
};

type ContactWithPersons = {
	mainContactPerson?: ContactPersonLite | null;
	additionalContactPersons?: ContactPersonLite[] | null;
};

/** Safely read a sibling node parameter at load time. */
function readParam(ctx: ILoadOptionsFunctions, name: string): string {
	try {
		return (ctx.getCurrentNodeParameter(name) as string) || "";
	} catch {
		return "";
	}
}

/** Build a readable display name for a contact person. */
function personLabel(person: ContactPersonLite): string {
	const full = `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim();
	return full || (person.email ?? "") || (person.id ?? "") || "Unknown";
}

/**
 * Determine which contact-person fields are phone numbers: the standard `phone`
 * field plus every property whose type definition has `variant: "phone"`.
 * Returns a map of field key -> human-readable label. Falls back to just the
 * standard `phone` field if the property definitions cannot be loaded.
 */
async function loadPhoneFields(
	ctx: ILoadOptionsFunctions,
): Promise<Map<string, string>> {
	const fields = new Map<string, string>([["phone", "Phone"]]);
	try {
		const props = await loadContactPersonProperties(ctx);
		for (const prop of props) {
			const typeDef = getTypeDefinition(prop) as
				| { variant?: string }
				| undefined;
			if (typeDef?.variant === "phone") {
				fields.set(
					prop.propertyIdentifier,
					prop.dynamicTypeDefinition?.fieldName || prop.propertyIdentifier,
				);
			}
		}
	} catch {
		// keep the standard `phone` field only
	}
	return fields;
}

/** Collect the phone values of a contact person, deduped by number. */
function collectPhones(
	person: ContactPersonLite,
	phoneFields: Map<string, string>,
): Array<{ label: string; number: string }> {
	const seen = new Set<string>();
	const phones: Array<{ label: string; number: string }> = [];
	for (const [key, label] of phoneFields) {
		const value = person[key];
		if (typeof value !== "string") continue;
		const number = value.trim();
		if (!number || seen.has(number)) continue;
		seen.add(number);
		phones.push({ label, number });
	}
	return phones;
}

/**
 * Resolve the contact persons (main + additional) for the current call target.
 * Works for both `contact` and `deal` targets — for a deal the related contactId
 * is resolved first via the deal endpoint.
 */
async function resolveCallTargetContactPersons(
	ctx: ILoadOptionsFunctions,
): Promise<ContactPersonLite[]> {
	const callTarget = readParam(ctx, "callTarget") || "contact";

	let contactId = "";
	if (callTarget === "deal") {
		const dealId = readParam(ctx, "dealId");
		if (!dealId) return [];
		const deal = (await ssRequest(
			ctx,
			"GET",
			`/v1/deal/${encodeURIComponent(dealId)}`,
		)) as { contactId?: string };
		contactId = (deal?.contactId ?? "").trim();
	} else {
		contactId = readParam(ctx, "contactId").trim();
	}

	if (!contactId) return [];

	const data = (await ssRequest(
		ctx,
		"GET",
		`/v1/contact/${encodeURIComponent(contactId)}`,
	)) as ContactWithPersons;

	return [
		data?.mainContactPerson,
		...(data?.additionalContactPersons ?? []),
	].filter((p): p is ContactPersonLite => Boolean(p && p.id));
}

/** Load contact persons (main + additional) of the call target as options. */
export async function getCalleeContactPersons(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const persons = await resolveCallTargetContactPersons(this);
	if (!persons.length) {
		return [{ name: "No Contact Persons Found", value: "" }];
	}

	const phoneFields = await loadPhoneFields(this);

	return [
		{ name: "None", value: "" },
		...persons.map((person) => {
			const phone = collectPhones(person, phoneFields)[0]?.number;
			return {
				name: personLabel(person),
				value: String(person.id ?? ""),
				description: phone || person.email || undefined,
			};
		}),
	];
}

/**
 * Load phone numbers of the call target's contact persons as options. If a
 * contact person is already selected, only that person's numbers are listed.
 */
export async function getCalleePhoneNumbers(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const allPersons = await resolveCallTargetContactPersons(this);
	const selectedId = readParam(this, "calleeContactPersonId").trim();
	const persons = selectedId
		? allPersons.filter((p) => String(p.id) === selectedId)
		: allPersons;

	const phoneFields = await loadPhoneFields(this);
	const withPrefix = persons.length > 1;
	const seen = new Set<string>();
	const options: INodePropertyOptions[] = [];

	for (const person of persons) {
		for (const { label, number } of collectPhones(person, phoneFields)) {
			if (seen.has(number)) continue;
			seen.add(number);
			const name = withPrefix
				? `${personLabel(person)} · ${label}: ${number}`
				: `${label}: ${number}`;
			options.push({ name, value: number });
		}
	}

	if (!options.length) {
		return [{ name: "No Phone Numbers Found", value: "" }];
	}
	return options;
}
