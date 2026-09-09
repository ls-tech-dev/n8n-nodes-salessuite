import {
	type IDataObject,
	type IExecuteFunctions,
	type JsonObject,
	NodeApiError,
	NodeOperationError,
} from "n8n-workflow";

import { ssRequest } from "./apiclient";
import { buildOrderBy, buildOrFilterGroups } from "./searchFilter";

const SEARCH_PAGE_SIZE_MAX = 100;

export type EntitySearchOptions = {
	path: string;
	resultKey: string;
	extraBody?: IDataObject;
};

function getStatusCode(error: unknown): number | undefined {
	const e = error as {
		httpCode?: string | number;
		statusCode?: number;
		status?: number;
		response?: { statusCode?: number; status?: number };
	};
	const raw =
		e?.httpCode ??
		e?.statusCode ??
		e?.status ??
		e?.response?.statusCode ??
		e?.response?.status;
	const code = typeof raw === "string" ? Number.parseInt(raw, 10) : raw;
	return Number.isFinite(code) ? (code as number) : undefined;
}

function parseJsonParam(
	ctx: IExecuteFunctions,
	raw: unknown,
	fieldName: string,
): unknown {
	if (raw === undefined || raw === null || raw === "") return undefined;
	if (typeof raw !== "string") return raw;
	const trimmed = raw.trim();
	if (!trimmed) return undefined;
	try {
		return JSON.parse(trimmed);
	} catch {
		throw new NodeOperationError(
			ctx.getNode(),
			`${fieldName} must be valid JSON.`,
		);
	}
}

function isConfiguredJsonParam(value: unknown): boolean {
	if (Array.isArray(value)) return value.length > 0;
	if (typeof value !== "string") return value !== undefined && value !== null;
	const trimmed = value.trim();
	return trimmed !== "" && trimmed !== "[]";
}

/**
 * A Search Contacts node saved under 1.2.4 on typeVersion 3 keeps its filter in the
 * legacy `orFilterGroups` / `orderBy` JSON parameters. Those fields render on
 * typeVersion 2 only now, and `searchSource` falls back to the builder - which is
 * empty on such a node. Without this guard the search would run unfiltered and
 * return every record, with nothing to indicate that the filter was dropped.
 *
 * Read from the raw stored parameters rather than getNodeParameter: that one
 * resolves through the current typeVersion's displayOptions, which is exactly what
 * hides these two fields.
 */
function assertNoLegacySearchConfig(ctx: IExecuteFunctions, i: number): void {
	const stored = (ctx.getNode().parameters ?? {}) as IDataObject;

	// Only ever unset while the node sits on the "builder" default - once the user
	// picks a source explicitly, n8n stores it and the migration has happened.
	if (stored.searchSource !== undefined) return;

	const legacy = (["orFilterGroups", "orderBy"] as const).filter((name) =>
		isConfiguredJsonParam(stored[name]),
	);
	if (!legacy.length) return;

	throw new NodeOperationError(
		ctx.getNode(),
		"This node still carries a search filter from the JSON fields that node version 3 no longer shows.",
		{
			itemIndex: i,
			description:
				'Set "Search Source" to "Raw JSON Filter Groups" and paste the previous JSON into "Filter Groups (JSON)", or rebuild the filter with the Filter Builder. Running the node unchanged would search without any filter and return every record.',
		},
	);
}

export async function runEntitySearch(
	ctx: IExecuteFunctions,
	i: number,
	options: EntitySearchOptions,
): Promise<unknown> {
	const { path, resultKey, extraBody } = options;

	assertNoLegacySearchConfig(ctx, i);

	const searchSource = ctx.getNodeParameter(
		"searchSource",
		i,
		"builder",
	) as string;
	const searchOptions = ctx.getNodeParameter(
		"searchOptions",
		i,
		{},
	) as IDataObject;

	const baseBody: IDataObject = { ...(extraBody ?? {}) };

	if (searchSource === "filterId") {
		const filterId = (ctx.getNodeParameter("filterId", i, "") as string).trim();
		if (!filterId) {
			throw new NodeOperationError(ctx.getNode(), "Filter ID is required.", {
				itemIndex: i,
			});
		}
		baseBody.filterId = filterId;
	} else if (searchSource === "json") {
		const parsed = parseJsonParam(
			ctx,
			ctx.getNodeParameter("orFilterGroupsJson", i, ""),
			"Filter Groups (JSON)",
		);
		if (parsed !== undefined && !Array.isArray(parsed)) {
			throw new NodeOperationError(
				ctx.getNode(),
				"Filter Groups (JSON) must be an array.",
				{ itemIndex: i },
			);
		}
		if (Array.isArray(parsed) && parsed.length) {
			baseBody.orFilterGroups = parsed;
		}
	} else {
		const groups = await buildOrFilterGroups(ctx, i);
		if (groups) baseBody.orFilterGroups = groups;
	}

	const orderBy = buildOrderBy(ctx, i);
	if (orderBy) baseBody.orderBy = orderBy;

	const returnAll = ctx.getNodeParameter("returnAll", i, false) as boolean;
	const records: IDataObject[] = [];

	let page = 0;
	let pageSize = SEARCH_PAGE_SIZE_MAX;

	try {
		if (returnAll) {
			const maxPages = Math.max(1, Number(searchOptions.maxPages ?? 200));
			for (let current = 0; current < maxPages; current++) {
				const data = await ssRequest(ctx, "POST", path, {
					body: { ...baseBody, page: current, pageSize },
				});
				const batch = Array.isArray(data) ? (data as IDataObject[]) : [];
				records.push(...batch);
				if (batch.length < pageSize) break;
			}
		} else {
			page = Math.max(0, Number(ctx.getNodeParameter("page", i, 0)));
			pageSize = Math.min(
				SEARCH_PAGE_SIZE_MAX,
				Math.max(1, Number(ctx.getNodeParameter("pageSize", i, 25))),
			);
			const data = await ssRequest(ctx, "POST", path, {
				body: { ...baseBody, page, pageSize },
			});
			records.push(...(Array.isArray(data) ? (data as IDataObject[]) : []));
		}
	} catch (error) {
		if (getStatusCode(error) === 400) {
			throw new NodeOperationError(
				ctx.getNode(),
				"The SalesSuite API rejected the search filter. This is usually a mismatch between the selected property and the condition type, or an unknown property identifier.",
				{ itemIndex: i, description: (error as Error)?.message },
			);
		}
		throw new NodeApiError(ctx.getNode(), error as JsonObject);
	}

	if (searchOptions.splitIntoItems === true) {
		return records;
	}

	return {
		...(returnAll ? {} : { page, pageSize }),
		filterId: baseBody.filterId ?? null,
		count: records.length,
		[resultKey]: records,
	};
}
