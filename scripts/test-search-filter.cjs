const assert = require("node:assert");
const {
	buildOrFilterGroups,
	buildOrderBy,
} = require("../dist/nodes/SalesSuite/helpers/searchFilter.js");

let pass = 0;
const failures = [];

function ctxWith(params) {
	return {
		getNode: () => ({ name: "SalesSuite", type: "salesSuite", typeVersion: 3 }),
		getNodeParameter: (name, _i, fallback) =>
			Object.prototype.hasOwnProperty.call(params, name) ? params[name] : fallback,
	};
}

function groupsParam(...rowGroups) {
	return {
		"filterGroups.group": rowGroups.map((rows) => ({
			conditions: { condition: rows },
		})),
	};
}

async function expectCondition(label, row, expected) {
	try {
		const groups = await buildOrFilterGroups(ctxWith(groupsParam([row])), 0);
		assert.deepStrictEqual(groups[0].andFilterItems[0].condition, expected);
		pass++;
	} catch (err) {
		failures.push(`${label}: ${err.message}`);
	}
}

async function expectThrows(label, params, needle) {
	try {
		await buildOrFilterGroups(ctxWith(params), 0);
		failures.push(`${label}: expected a throw, got none`);
	} catch (err) {
		if (String(err.message).includes(needle)) pass++;
		else failures.push(`${label}: message ${JSON.stringify(err.message)} lacks ${JSON.stringify(needle)}`);
	}
}

const P = {
	str: "contact_companyName::string::singleline",
	num: "contact_x_anzahl::number::integer",
	bool: "contact_x_flag::boolean::toggle",
	date: "contact_createdAt::dateTime::dateTime",
	sel: "contact_x_lead_status::select::multi",
	selSingle: "contact_x_kundenstatus::select::single",
};
const base = { conditionMode: "builder" };

(async () => {
	await expectCondition("string/contains", { ...base, property: P.str, stringOperator: "contains", stringValue: "GmbH" },
		{ type: "string", check: "contains", value: "GmbH" });
	await expectCondition("string/isNull", { ...base, property: P.str, stringOperator: "isNull", stringValue: "ignored" },
		{ type: "string", check: "isNull" });

	await expectCondition("number/isGreaterThan", { ...base, property: P.num, numberOperator: "isGreaterThan", numberValue: 5 },
		{ type: "number", check: "isGreaterThan", value: 5 });
	await expectCondition("number/isBetween", { ...base, property: P.num, numberOperator: "isBetween", numberFrom: 1, numberTo: 10 },
		{ type: "number", check: "isBetween", value: { from: 1, to: 10 } });
	await expectCondition("number/isNotNull", { ...base, property: P.num, numberOperator: "isNotNull" },
		{ type: "number", check: "isNotNull" });

	await expectCondition("boolean/isTrue", { ...base, property: P.bool, booleanOperator: "isTrue" },
		{ type: "boolean", check: "isTrue" });
	await expectCondition("boolean/isFalse", { ...base, property: P.bool, booleanOperator: "isFalse" },
		{ type: "boolean", check: "isFalse" });

	await expectCondition("dt/isAfter+exact", { ...base, property: P.date, dateOperator: "isAfter", dateAtMode: "exact", dateAtExact: "2026-01-15T10:00:00+02:00" },
		{ type: "dateTime", check: "isAfter", value: { exact: "2026-01-15T08:00:00.000Z" } });
	await expectCondition("dt/isBefore+preset", { ...base, property: P.date, dateOperator: "isBefore", dateAtMode: "glidingPreset", dateAtGlidingPreset: "30days" },
		{ type: "dateTime", check: "isBefore", value: { glidingDate: "30days" } });
	await expectCondition("dt/isAfter+glidingDays", { ...base, property: P.date, dateOperator: "isAfter", dateAtMode: "glidingDays", dateAtGlidingDays: 14 },
		{ type: "dateTime", check: "isAfter", value: { glidingDate: "days", value: 14 } });
	await expectCondition("dt/isAfter+xDays", { ...base, property: P.date, dateOperator: "isAfter", dateAtMode: "xDays", dateAtXDays: 3 },
		{ type: "dateTime", check: "isAfter", value: { xDays: 3 } });
	await expectCondition("dt/exact-empty=null", { ...base, property: P.date, dateOperator: "isAfter", dateAtMode: "exact", dateAtExact: "" },
		{ type: "dateTime", check: "isAfter", value: { exact: null } });

	await expectCondition("dt/equals+point", { ...base, property: P.date, dateOperator: "equals", dateEqMode: "glidingPreset", dateEqGlidingPreset: "today" },
		{ type: "dateTime", check: "equals", value: { glidingDate: "today" } });

	await expectCondition("dt/equalsInterval+preset", { ...base, property: P.date, dateOperator: "equalsInterval", dateIntervalMode: "preset", dateIntervalPreset: "thisQuarter" },
		{ type: "dateTime", check: "equals", value: { glidingInterval: "thisQuarter" } });
	await expectCondition("dt/doesNotEqualInterval+lastDays", { ...base, property: P.date, dateOperator: "doesNotEqualInterval", dateIntervalMode: "lastDays", dateIntervalLastDays: 45 },
		{ type: "dateTime", check: "doesNotEqual", value: { glidingInterval: "lastDays", value: 45 } });

	await expectCondition("dt/equalsRange", { ...base, property: P.date, dateOperator: "equalsRange",
		dateFromMode: "glidingPreset", dateFromGlidingPreset: "yesterday", dateToMode: "xDays", dateToXDays: 7 },
		{ type: "dateTime", check: "equals", value: { from: { glidingDate: "yesterday" }, to: { xDays: 7 } } });
	await expectCondition("dt/isBetween mixed modes", { ...base, property: P.date, dateOperator: "isBetween",
		dateFromMode: "exact", dateFromExact: "2026-01-01T00:00:00Z", dateToMode: "glidingPreset", dateToGlidingPreset: "today" },
		{ type: "dateTime", check: "isBetween", value: { from: { exact: "2026-01-01T00:00:00.000Z" }, to: { glidingDate: "today" } } });
	await expectCondition("dt/isNull", { ...base, property: P.date, dateOperator: "isNull" },
		{ type: "dateTime", check: "isNull" });

	await expectCondition("select/containsOneOf", { ...base, property: P.sel, selectOperator: "containsOneOf", selectValueSource: "list", selectValues: ["a", "b"] },
		{ type: "select", check: "containsOneOf", value: ["a", "b"] });
	await expectCondition("select/equals on single-select stays an array", { ...base, property: P.selSingle, selectOperator: "equals", selectValueSource: "list", selectValues: ["only"] },
		{ type: "select", check: "equals", value: ["only"] });
	await expectCondition("select/custom keys + dedupe + sentinel drop", { ...base, property: P.sel, selectOperator: "containsAllOf", selectValueSource: "custom", selectValuesCustom: " x , y ,x, " },
		{ type: "select", check: "containsAllOf", value: ["x", "y"] });
	await expectCondition("select/isEmpty", { ...base, property: P.sel, selectOperator: "isEmpty", selectValues: ["ignored"] },
		{ type: "select", check: "isEmpty" });

	await expectCondition("raw/json string", { conditionMode: "raw", rawPropertyIdentification: "contact_x_weird",
		rawCondition: '{"type":"dateTime","check":"equals","value":{"glidingInterval":"thisYear"}}' },
		{ type: "dateTime", check: "equals", value: { glidingInterval: "thisYear" } });

	try {
		const groups = await buildOrFilterGroups(ctxWith(groupsParam([
			{ conditionMode: "raw", rawPropertyIdentification: P.str,
			  rawCondition: '{"type":"string","check":"equals","value":"X"}' },
		])), 0);
		assert.strictEqual(
			groups[0].andFilterItems[0].propertyIdentification,
			"contact_companyName",
			"encoded suffix must be stripped",
		);
		pass++;
	} catch (err) { failures.push(`raw/encoded identifier: ${err.message}`); }

	try {
		const groups = await buildOrFilterGroups(ctxWith(groupsParam(
			[
				{ ...base, property: P.str, stringOperator: "equals", stringValue: "A" },
				{ ...base, property: P.str, stringOperator: "equals", stringValue: "B" },
			],
			[
				{ ...base, property: P.str, stringOperator: "equals", stringValue: "C" },
				{ ...base, property: P.str, stringOperator: "equals", stringValue: "D" },
			],
		)), 0);
		assert.deepStrictEqual(
			groups.map((g) => g.andFilterItems.map((it) => it.condition.value)),
			[["A", "B"], ["C", "D"]],
			"(A AND B) OR (C AND D)",
		);
		pass++;
	} catch (err) { failures.push(`grouping: ${err.message}`); }

	try {
		const groups = await buildOrFilterGroups(ctxWith(groupsParam(
			[{ ...base, property: P.str, stringOperator: "equals", stringValue: "first" }],
			[{ ...base, property: P.str, stringOperator: "equals", stringValue: "second" }],
			[{ ...base, property: P.str, stringOperator: "equals", stringValue: "third" }],
		)), 0);
		assert.deepStrictEqual(
			groups.map((g) => g.andFilterItems[0].condition.value),
			["first", "second", "third"],
		);
		pass++;
	} catch (err) { failures.push(`group order: ${err.message}`); }

	try {
		const dealRows = [
			{ ...base, property: "deal_name::string::singleline", stringOperator: "doesNotContain", stringValue: "John" },
			{ ...base, property: "contactPerson_email::string::email", stringOperator: "endsWith", stringValue: "@example.com" },
		];
		const groups = await buildOrFilterGroups(ctxWith(groupsParam(dealRows)), 0);
		assert.deepStrictEqual(groups, [{ andFilterItems: [
			{ propertyIdentification: "deal_name", condition: { type: "string", check: "doesNotContain", value: "John" } },
			{ propertyIdentification: "contactPerson_email", condition: { type: "string", check: "endsWith", value: "@example.com" } },
		] }]);
		pass++;
	} catch (err) { failures.push(`deal conditions: ${err.message}`); }

	try {
		const rows = [{ ...base, property: P.date, dateOperator: "equalsInterval", dateIntervalMode: "preset", dateIntervalPreset: "thisYear" }];
		const a = await buildOrFilterGroups(ctxWith(groupsParam(rows)), 0);
		const b = await buildOrFilterGroups(ctxWith({ ...groupsParam(rows), resource: "deal" }), 0);
		assert.deepStrictEqual(a, b, "resource must not influence the payload");
		pass++;
	} catch (err) { failures.push(`resource neutrality: ${err.message}`); }

	try {
		assert.strictEqual(await buildOrFilterGroups(ctxWith({}), 0), undefined);
		assert.strictEqual(await buildOrFilterGroups(ctxWith({ "filterGroups.group": [] }), 0), undefined);
		pass++;
	} catch (err) { failures.push(`empty builder: ${err.message}`); }

	try {
		const ob = buildOrderBy(ctxWith({ "orderByRules.rule": [
			{ sortProperty: "contact_companyName", sortOrder: "asc", nulls: "last" },
			{ sortProperty: "contact_createdAt::dateTime::dateTime", sortOrder: "desc", nulls: "" },
		] }), 0);
		assert.deepStrictEqual(ob, [
			{ propertyIdentification: "contact_companyName", sortOrder: "asc", nulls: "last" },
			{ propertyIdentification: "contact_createdAt", sortOrder: "desc" },
		]);
		assert.strictEqual(buildOrderBy(ctxWith({}), 0), undefined);
		pass++;
	} catch (err) { failures.push(`orderBy: ${err.message}`); }

	await expectThrows("neg/select without values",
		groupsParam([{ ...base, property: P.sel, selectOperator: "containsOneOf", selectValueSource: "list", selectValues: [] }]),
		"needs at least one value");
	await expectThrows("neg/number from > to",
		groupsParam([{ ...base, property: P.num, numberOperator: "isBetween", numberFrom: 10, numberTo: 1 }]),
		"From must not be greater than To");
	await expectThrows("neg/no property chosen",
		groupsParam([{ ...base, property: "" }]),
		"choose a property");
	await expectThrows("neg/non-numeric from an expression",
		groupsParam([{ ...base, property: P.num, numberOperator: "equals", numberValue: "nope" }]),
		"must be a number");
	await expectThrows("neg/raw condition invalid JSON",
		groupsParam([{ conditionMode: "raw", rawPropertyIdentification: "contact_x", rawCondition: "{oops" }]),
		"not valid JSON");
	await expectThrows("neg/raw condition missing check",
		groupsParam([{ conditionMode: "raw", rawPropertyIdentification: "contact_x", rawCondition: '{"type":"string"}' }]),
		'must be an object with string "type" and "check"');
	await expectThrows("neg/empty group",
		groupsParam([{ ...base, property: P.str, stringOperator: "isNull" }], []),
		"Filter group #2 has no conditions");
	await expectThrows("neg/error names group and condition",
		groupsParam([{ ...base, property: P.str, stringOperator: "isNull" }], [{ ...base, property: "" }]),
		"Filter group #2, condition #1");

	console.log(`\npassed: ${pass}`);
	if (failures.length) {
		console.log(`FAILED: ${failures.length}`);
		for (const f of failures) console.log("  - " + f);
		process.exit(1);
	}
	console.log("ALL SERIALIZER ASSERTIONS PASSED");
})();
