const fs = require("node:fs");
const path = require("node:path");

// Declared in devDependencies and pinned to 6.x: the schema below is assembled as a
// draft-07 document with a `definitions` block, which ajv 8 no longer accepts by
// default. Not resolvable means a broken install, so fail rather than skip.
let Ajv;
try {
	Ajv = require("ajv");
} catch {
	console.error("ajv is not resolvable - run npm install.");
	process.exit(1);
}

const {
	buildOrFilterGroups,
	buildOrderBy,
} = require("../dist/nodes/SalesSuite/helpers/searchFilter.js");

const specPath = path.join(__dirname, "..", "openapi.json");
if (!fs.existsSync(specPath)) {
	console.log("openapi.json not present - skipping schema validation");
	process.exit(0);
}
const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));

function toJsonSchema(node) {
	if (Array.isArray(node)) return node.map(toJsonSchema);
	if (!node || typeof node !== "object") return node;

	const out = {};
	for (const [key, value] of Object.entries(node)) {
		if (key === "$ref" && typeof value === "string") {
			out.$ref = value.replace("#/components/schemas/", "#/definitions/");
			continue;
		}
		if (key === "nullable" || key === "example" || key === "examples") continue;
		if (
			(key === "exclusiveMinimum" || key === "exclusiveMaximum") &&
			typeof value === "boolean"
		)
			continue;
		out[key] = toJsonSchema(value);
	}
	if (node.nullable === true && out.type) {
		out.type = Array.isArray(out.type)
			? [...out.type, "null"]
			: [out.type, "null"];
	}
	return out;
}

const definitions = toJsonSchema(spec.components.schemas);
const ajv = new Ajv({ allErrors: true });
const validateContact = ajv.compile({
	$ref: "#/definitions/SearchContactV2Request",
	definitions,
});
const validateDeal = ajv.compile({
	$ref: "#/definitions/SearchDealsRequest",
	definitions,
});

function ctxWith(params) {
	return {
		getNode: () => ({ name: "SalesSuite", type: "salesSuite", typeVersion: 3 }),
		getNodeParameter: (name, _i, fallback) =>
			Object.prototype.hasOwnProperty.call(params, name)
				? params[name]
				: fallback,
	};
}

const base = { conditionMode: "builder" };
const P = {
	str: "contact_companyName::string::singleline",
	num: "contact_x_anzahl::number::integer",
	bool: "contact_x_flag::boolean::toggle",
	date: "contact_createdAt::dateTime::dateTime",
	sel: "contact_x_lead_status::select::multi",
};

const contactCases = [
	["string contains", [{ ...base, property: P.str, stringOperator: "contains", stringValue: "GmbH" }]],
	["string isNotNull", [{ ...base, property: P.str, stringOperator: "isNotNull" }]],
	["number isLessThan", [{ ...base, property: P.num, numberOperator: "isLessThan", numberValue: 42 }]],
	["number isBetween", [{ ...base, property: P.num, numberOperator: "isBetween", numberFrom: 1, numberTo: 10 }]],
	["boolean isFalse", [{ ...base, property: P.bool, booleanOperator: "isFalse" }]],
	["dt isAfter exact", [{ ...base, property: P.date, dateOperator: "isAfter", dateAtMode: "exact", dateAtExact: "2026-03-01T09:00:00Z" }]],
	["dt isAfter exact null", [{ ...base, property: P.date, dateOperator: "isAfter", dateAtMode: "exact", dateAtExact: "" }]],
	["dt isBefore preset", [{ ...base, property: P.date, dateOperator: "isBefore", dateAtMode: "glidingPreset", dateAtGlidingPreset: "180days" }]],
	["dt isAfter glidingDays", [{ ...base, property: P.date, dateOperator: "isAfter", dateAtMode: "glidingDays", dateAtGlidingDays: 14 }]],
	["dt isAfter xDays", [{ ...base, property: P.date, dateOperator: "isAfter", dateAtMode: "xDays", dateAtXDays: 5 }]],
	["dt equals point", [{ ...base, property: P.date, dateOperator: "equals", dateEqMode: "glidingPreset", dateEqGlidingPreset: "today" }]],
	["dt equals interval preset", [{ ...base, property: P.date, dateOperator: "equalsInterval", dateIntervalMode: "preset", dateIntervalPreset: "thisWeek" }]],
	["dt doesNotEqual interval lastDays", [{ ...base, property: P.date, dateOperator: "doesNotEqualInterval", dateIntervalMode: "lastDays", dateIntervalLastDays: 90 }]],
	["dt equalsRange", [{ ...base, property: P.date, dateOperator: "equalsRange", dateFromMode: "glidingPreset", dateFromGlidingPreset: "yesterday", dateToMode: "xDays", dateToXDays: 7 }]],
	["dt isBetween mixed", [{ ...base, property: P.date, dateOperator: "isBetween", dateFromMode: "exact", dateFromExact: "2026-01-01T00:00:00Z", dateToMode: "glidingDays", dateToGlidingDays: 30 }]],
	["dt isNull", [{ ...base, property: P.date, dateOperator: "isNull" }]],
	["select containsAllOf", [{ ...base, property: P.sel, selectOperator: "containsAllOf", selectValueSource: "list", selectValues: ["afba8669-f363-44aa-a5d2-9806cdfea616"] }]],
	["select isNotEmpty", [{ ...base, property: P.sel, selectOperator: "isNotEmpty" }]],
	["two OR groups", [
		[{ ...base, property: P.str, stringOperator: "contains", stringValue: "A" }],
		[{ ...base, property: P.num, numberOperator: "equals", numberValue: 3 }],
	]],
	["raw condition", [{ conditionMode: "raw", rawPropertyIdentification: "contactPerson_email", rawCondition: '{"type":"string","check":"endsWith","value":"@example.com"}' }]],
];

const dealCases = [
	["deal_name", [{ ...base, property: "deal_name::string::singleline", stringOperator: "doesNotContain", stringValue: "John" }], {}],
	["cross-entity contactPerson_email", [{ ...base, property: "contactPerson_email::string::email", stringOperator: "endsWith", stringValue: "@example.com" }], {}],
	["scoped to a pipeline", [{ ...base, property: "deal_name::string::singleline", stringOperator: "contains", stringValue: "X" }], { pipelineId: "pipe-1" }],
	["scoped to a phase", [{ ...base, property: "deal_name::string::singleline", stringOperator: "contains", stringValue: "X" }], { pipelineId: "pipe-1", phaseId: "phase-2" }],
];

async function bodyFor(rows, extraBody = {}) {
	const groupRows = Array.isArray(rows[0]) ? rows : [rows];
	const ctx = ctxWith({
		"filterGroups.group": groupRows.map((r) => ({
			conditions: { condition: r },
		})),
		"orderByRules.rule": [
			{ sortProperty: "contact_companyName", sortOrder: "asc", nulls: "last" },
		],
	});
	const body = { page: 0, pageSize: 25, ...extraBody };
	const groups = await buildOrFilterGroups(ctx, 0);
	if (groups) body.orFilterGroups = groups;
	const orderBy = buildOrderBy(ctx, 0);
	if (orderBy) body.orderBy = orderBy;
	return body;
}

const item = (condition) => ({
	page: 0,
	pageSize: 25,
	orFilterGroups: [
		{
			andFilterItems: [
				{ propertyIdentification: "contact_x", condition },
			],
		},
	],
});

const mustFail = [
	["unknown string check", item({ type: "string", check: "bogus", value: "x" })],
	["string check with a number value", item({ type: "string", check: "contains", value: 5 })],
	["select value as a bare string, not an array", item({ type: "select", check: "equals", value: "key" })],
	["number isBetween missing `to`", item({ type: "number", check: "isBetween", value: { from: 1 } })],
	["glidingInterval under isBetween (illegal per spec)", item({ type: "dateTime", check: "isBetween", value: { glidingInterval: "thisWeek" } })],
	["unknown glidingDate preset", item({ type: "dateTime", check: "isAfter", value: { glidingDate: "42days" } })],
	["extra key on the filter item", { page: 0, pageSize: 25, orFilterGroups: [{ andFilterItems: [{ propertyIdentification: "c", condition: { type: "string", check: "isNull" }, extra: 1 }] }] }],
	["empty orFilterGroups array", { page: 0, pageSize: 25, orFilterGroups: [] }],
	["empty andFilterItems array", { page: 0, pageSize: 25, orFilterGroups: [{ andFilterItems: [] }] }],
	["pageSize above 100", { page: 0, pageSize: 250 }],
	["orderBy with a bogus sortOrder", { page: 0, orderBy: [{ propertyIdentification: "contact_createdAt", sortOrder: "sideways" }] }],
];

(async () => {
	let ok = 0;
	const bad = [];

	for (const [label, rows] of contactCases) {
		const body = await bodyFor(rows);
		if (validateContact(body)) ok++;
		else bad.push(`contact/${label}: ${ajv.errorsText(validateContact.errors)}`);
	}

	for (const [label, rows, extra] of dealCases) {
		const body = await bodyFor(rows, extra);
		if (validateDeal(body)) ok++;
		else bad.push(`deal/${label}: ${ajv.errorsText(validateDeal.errors)}`);
	}

	for (const [label, body] of [
		["filterId only", { page: 0, pageSize: 25, filterId: "cmqan98nv0001085dsux89c02" }],
		["no filter at all", { page: 0, pageSize: 100 }],
	]) {
		if (validateContact(body)) ok++;
		else bad.push(`${label}: ${ajv.errorsText(validateContact.errors)}`);
	}

	const total = contactCases.length + dealCases.length + 2;
	console.log(`\nbodies conforming to the spec: ${ok}/${total}`);
	if (bad.length) {
		console.log("FAILURES:");
		for (const b of bad) console.log("  - " + b);
		process.exit(1);
	}

	let rejected = 0;
	const accepted = [];
	for (const [label, body] of mustFail) {
		if (validateContact(body)) accepted.push(`contact/${label}`);
		else rejected++;
		if (validateDeal(body)) accepted.push(`deal/${label}`);
		else rejected++;
	}

	console.log(`rejected as expected: ${rejected}/${mustFail.length * 2}`);
	if (accepted.length) {
		console.log("VALIDATOR ACCEPTED INVALID BODIES (validation is meaningless):");
		for (const a of accepted) console.log("  - " + a);
		process.exit(1);
	}

	console.log("ALL SCHEMA CHECKS PASSED");
})();
