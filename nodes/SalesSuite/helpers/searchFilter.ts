import {
	type IDataObject,
	type IExecuteFunctions,
	NodeOperationError,
} from "n8n-workflow";

import { toApiDateTime } from "./datetime";
import { decodePropertyRef, resolveDataType } from "./searchProperties";

export type FilterItem = {
	propertyIdentification: string;
	condition: IDataObject;
};

export type FilterGroup = { andFilterItems: FilterItem[] };

const SELECT_OPERATORS_WITHOUT_VALUE = [
	"isEmpty",
	"isNotEmpty",
	"isNull",
	"isNotNull",
];

function fail(ctx: IExecuteFunctions, i: number, message: string): never {
	throw new NodeOperationError(ctx.getNode(), message, { itemIndex: i });
}

function toFiniteNumber(
	ctx: IExecuteFunctions,
	i: number,
	raw: unknown,
	label: string,
): number {
	const value =
		typeof raw === "number" ? raw : Number(String(raw ?? "").trim());
	if (!Number.isFinite(value)) {
		fail(ctx, i, `${label} must be a number.`);
	}
	return value;
}

function buildDatePoint(
	ctx: IExecuteFunctions,
	i: number,
	row: IDataObject,
	prefix: string,
	label: string,
): IDataObject {
	const mode = String(row[`${prefix}Mode`] ?? "exact");

	switch (mode) {
		case "exact":
			return { exact: toApiDateTime(row[`${prefix}Exact`]) ?? null };
		case "glidingPreset":
			return { glidingDate: String(row[`${prefix}GlidingPreset`] ?? "today") };
		case "glidingDays":
			return {
				glidingDate: "days",
				value: toFiniteNumber(
					ctx,
					i,
					row[`${prefix}GlidingDays`],
					`${label} number of days`,
				),
			};
		case "xDays":
			return {
				xDays: toFiniteNumber(
					ctx,
					i,
					row[`${prefix}XDays`],
					`${label} days from now`,
				),
			};
		default:
			return fail(ctx, i, `Unsupported ${label} date mode: ${mode}`);
	}
}

function buildStringCondition(row: IDataObject): IDataObject {
	const check = String(row.stringOperator ?? "contains");
	if (check === "isNull" || check === "isNotNull") {
		return { type: "string", check };
	}
	return { type: "string", check, value: String(row.stringValue ?? "") };
}

function buildNumberCondition(
	ctx: IExecuteFunctions,
	i: number,
	row: IDataObject,
): IDataObject {
	const check = String(row.numberOperator ?? "equals");

	if (check === "isNull" || check === "isNotNull") {
		return { type: "number", check };
	}

	if (check === "isBetween") {
		const from = toFiniteNumber(ctx, i, row.numberFrom, "From");
		const to = toFiniteNumber(ctx, i, row.numberTo, "To");
		if (from > to) {
			fail(ctx, i, "Number range: From must not be greater than To.");
		}
		return { type: "number", check, value: { from, to } };
	}

	return {
		type: "number",
		check,
		value: toFiniteNumber(ctx, i, row.numberValue, "Value"),
	};
}

function buildBooleanCondition(row: IDataObject): IDataObject {
	return { type: "boolean", check: String(row.booleanOperator ?? "isTrue") };
}

function buildSelectCondition(
	ctx: IExecuteFunctions,
	i: number,
	row: IDataObject,
	where: string,
): IDataObject {
	const check = String(row.selectOperator ?? "containsOneOf");
	if (SELECT_OPERATORS_WITHOUT_VALUE.includes(check)) {
		return { type: "select", check };
	}

	const source = String(row.selectValueSource ?? "list");
	const rawValues =
		source === "custom"
			? String(row.selectValuesCustom ?? "").split(",")
			: Array.isArray(row.selectValues)
				? row.selectValues
				: [];

	const value = [
		...new Set(rawValues.map((entry) => String(entry).trim()).filter(Boolean)),
	];

	if (!value.length) {
		fail(
			ctx,
			i,
			`${where}: select operator "${check}" needs at least one value.`,
		);
	}

	return { type: "select", check, value };
}

function buildDateTimeCondition(
	ctx: IExecuteFunctions,
	i: number,
	row: IDataObject,
): IDataObject {
	const operator = String(row.dateOperator ?? "isAfter");

	switch (operator) {
		case "isNull":
		case "isNotNull":
			return { type: "dateTime", check: operator };

		case "isAfter":
		case "isBefore":
			return {
				type: "dateTime",
				check: operator,
				value: buildDatePoint(ctx, i, row, "dateAt", "Date"),
			};

		case "equals":
		case "doesNotEqual":
			return {
				type: "dateTime",
				check: operator,
				value: buildDatePoint(ctx, i, row, "dateEq", "Date"),
			};

		case "equalsInterval":
		case "doesNotEqualInterval": {
			const check = operator === "equalsInterval" ? "equals" : "doesNotEqual";
			const intervalMode = String(row.dateIntervalMode ?? "preset");
			const value =
				intervalMode === "lastDays"
					? {
							glidingInterval: "lastDays",
							value: toFiniteNumber(
								ctx,
								i,
								row.dateIntervalLastDays,
								"Interval number of days",
							),
						}
					: {
							glidingInterval: String(row.dateIntervalPreset ?? "thisMonth"),
						};
			return { type: "dateTime", check, value };
		}

		case "equalsRange":
		case "doesNotEqualRange":
		case "isBetween": {
			const check =
				operator === "isBetween"
					? "isBetween"
					: operator === "equalsRange"
						? "equals"
						: "doesNotEqual";
			return {
				type: "dateTime",
				check,
				value: {
					from: buildDatePoint(ctx, i, row, "dateFrom", "From"),
					to: buildDatePoint(ctx, i, row, "dateTo", "To"),
				},
			};
		}

		default:
			return fail(ctx, i, `Unsupported date operator: ${operator}`);
	}
}

function buildRawFilterItem(
	ctx: IExecuteFunctions,
	i: number,
	row: IDataObject,
	where: string,
): FilterItem {
	const { propertyIdentification } = decodePropertyRef(
		row.rawPropertyIdentification,
	);
	if (!propertyIdentification) {
		fail(ctx, i, `${where}: choose a property.`);
	}

	const raw = row.rawCondition;
	let parsed: unknown;
	if (raw && typeof raw === "object") {
		parsed = raw;
	} else {
		try {
			parsed = JSON.parse(String(raw ?? ""));
		} catch {
			fail(ctx, i, `${where}: Condition (JSON) is not valid JSON.`);
		}
	}

	const condition = parsed as IDataObject;
	if (
		!condition ||
		typeof condition !== "object" ||
		Array.isArray(condition) ||
		typeof condition.type !== "string" ||
		typeof condition.check !== "string"
	) {
		fail(
			ctx,
			i,
			`${where}: Condition (JSON) must be an object with string "type" and "check" fields.`,
		);
	}

	return { propertyIdentification, condition };
}

async function buildFilterItem(
	ctx: IExecuteFunctions,
	i: number,
	row: IDataObject,
	where: string,
): Promise<FilterItem> {
	if (String(row.conditionMode ?? "builder") === "raw") {
		return buildRawFilterItem(ctx, i, row, where);
	}

	const decoded = decodePropertyRef(row.property);
	if (!decoded.propertyIdentification) {
		fail(ctx, i, `${where}: choose a property.`);
	}

	let dataType = decoded.dataType;
	if (!dataType) {
		dataType = await resolveDataType(ctx, decoded.propertyIdentification);
		if (!dataType) {
			fail(
				ctx,
				i,
				`${where}: could not determine the data type of "${decoded.propertyIdentification}". ` +
					'Pick the property from the list, or switch Condition Mode to "Raw JSON Condition".',
			);
		}
	}

	let condition: IDataObject;
	switch (dataType) {
		case "string":
			condition = buildStringCondition(row);
			break;
		case "number":
			condition = buildNumberCondition(ctx, i, row);
			break;
		case "boolean":
			condition = buildBooleanCondition(row);
			break;
		case "dateTime":
			condition = buildDateTimeCondition(ctx, i, row);
			break;
		case "select":
			condition = buildSelectCondition(ctx, i, row, where);
			break;
		default:
			return fail(
				ctx,
				i,
				`${where}: data type "${String(dataType)}" cannot be filtered.`,
			);
	}

	return {
		propertyIdentification: decoded.propertyIdentification,
		condition,
	};
}

export async function buildOrFilterGroups(
	ctx: IExecuteFunctions,
	i: number,
): Promise<FilterGroup[] | undefined> {
	const groupRows = ctx.getNodeParameter(
		"filterGroups.group",
		i,
		[],
	) as IDataObject[];

	if (!Array.isArray(groupRows) || !groupRows.length) return undefined;

	const result: FilterGroup[] = [];

	for (const [groupIndex, groupRow] of groupRows.entries()) {
		const holder = (groupRow?.conditions ?? {}) as IDataObject;
		const rows = Array.isArray(holder.condition)
			? (holder.condition as IDataObject[])
			: [];

		if (!rows.length) {
			fail(
				ctx,
				i,
				`Filter group #${groupIndex + 1} has no conditions. Add at least one condition or remove the group.`,
			);
		}

		const andFilterItems: FilterItem[] = [];
		for (const [conditionIndex, row] of rows.entries()) {
			andFilterItems.push(
				await buildFilterItem(
					ctx,
					i,
					row ?? {},
					`Filter group #${groupIndex + 1}, condition #${conditionIndex + 1}`,
				),
			);
		}

		result.push({ andFilterItems });
	}

	return result.length ? result : undefined;
}

export function buildOrderBy(
	ctx: IExecuteFunctions,
	i: number,
): IDataObject[] | undefined {
	const rows = ctx.getNodeParameter(
		"orderByRules.rule",
		i,
		[],
	) as IDataObject[];

	if (!Array.isArray(rows) || !rows.length) return undefined;

	const out: IDataObject[] = [];

	for (const [index, row] of rows.entries()) {
		const { propertyIdentification } = decodePropertyRef(row?.sortProperty);
		if (!propertyIdentification) {
			fail(ctx, i, `Order By rule #${index + 1}: choose a property.`);
		}

		const sortOrder = String(row?.sortOrder ?? "desc");
		if (sortOrder !== "asc" && sortOrder !== "desc") {
			fail(
				ctx,
				i,
				`Order By rule #${index + 1}: sort order must be asc or desc.`,
			);
		}

		const entry: IDataObject = { propertyIdentification, sortOrder };
		const nulls = String(row?.nulls ?? "").trim();
		if (nulls === "first" || nulls === "last") {
			entry.nulls = nulls;
		}
		out.push(entry);
	}

	return out.length ? out : undefined;
}
