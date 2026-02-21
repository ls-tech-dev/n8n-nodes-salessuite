import { ApplicationError, IDataObject, IExecuteFunctions } from "n8n-workflow";

import { ssRequest } from "../../helpers/apiclient";
import {
	buildTypeMap,
	loadDealProperties,
	normalizeValue,
	splitPrefixedFields,
} from "../../helpers/fieldMapping";
import { createNote } from "../../helpers/notes";

async function sanitizeDealPayload(this: IExecuteFunctions, raw: unknown) {
	const maybe = (raw ?? {}) as IDataObject;
	const val = (maybe.value ?? maybe) as IDataObject;

	const { deal } = splitPrefixedFields(val);

	const properties = await loadDealProperties(this);
	const typeMap = buildTypeMap(properties);

	const out: Record<string, any> & { name?: string } = {};
	for (const [key, value] of Object.entries(deal)) {
		const typeDef = typeMap.get(`deal.${key}`);
		const normalized = normalizeValue(value, typeDef);
		if (normalized === undefined) continue;
		out[key] = normalized;
	}

	return out;
}

export async function handleDeal(
	this: IExecuteFunctions,
	i: number,
	operation: string,
): Promise<unknown> {
	switch (operation) {
		case "createDeal": {
			const name = this.getNodeParameter("name", i) as string;
			const contactId = this.getNodeParameter("contactId", i) as string;
			const pipelineId = this.getNodeParameter("pipelineId", i) as string;
			const phaseId = this.getNodeParameter("phaseId", i) as string;

			const fieldsParam = this.getNodeParameter("fields", i, {} as IDataObject);
			const dataObj = await sanitizeDealPayload.call(this, fieldsParam);

			if (name) dataObj.name = name;
			if (!dataObj.name) {
				throw new ApplicationError("Create Deal requires a name.");
			}

			const result = await ssRequest(this, "POST", "/deal", {
				qs: { pipelineId, contactId, phaseId },
				body: dataObj,
			});

			const createInitialNote = this.getNodeParameter(
				"createInitialNote",
				i,
				false,
			) as boolean;
			let initialNoteId: string | undefined;
			if (createInitialNote && result?.deal?.id) {
				const initialNoteText = this.getNodeParameter(
					"initialNoteText",
					i,
					"",
				) as string;
				if (initialNoteText && initialNoteText.trim()) {
					initialNoteId = await createNote(
						this,
						result.deal.id as string,
						initialNoteText,
						"deal",
					);
				}
			}

			return {
				...(result ?? {}),
				inputData: { contactId, pipelineId, phaseId, ...dataObj },
				initialNoteId,
			};
		}

		case "updateDeal": {
			const dealId = this.getNodeParameter("dealId", i) as string;

			const rawName = (this.getNodeParameter("name", i, "") as string) ?? "";
			const name = rawName.trim() || undefined;

			const updatePipelineStage = this.getNodeParameter(
				"updatePipelineStage",
				i,
				false,
			) as boolean;
			const pipelineIdParam = (
				this.getNodeParameter("pipelineId", i, "") as string
			).trim();
			const phaseIdParam = (
				this.getNodeParameter("phaseId", i, "") as string
			).trim();

			const fieldsParam = this.getNodeParameter("fields", i, {} as IDataObject);
			const dataObj = await sanitizeDealPayload.call(this, fieldsParam);

			if (name !== undefined) dataObj.name = name;

			const hasFields = Object.keys(dataObj).length > 0;
			if (!updatePipelineStage && !hasFields) {
				throw new ApplicationError("No fields provided to update.");
			}

			const qs: IDataObject = {};
			if (updatePipelineStage) {
				if (!pipelineIdParam || !phaseIdParam) {
					throw new ApplicationError(
						"To update pipeline/phase, both pipelineId and phaseId are required.",
					);
				}
				qs.pipelineId = pipelineIdParam;
				qs.phaseId = phaseIdParam;
			}

			const appendMultiSelectValues = this.getNodeParameter(
				"appendMultiSelectValues",
				i,
				false,
			) as boolean;
			qs.appendMultiSelectValues = appendMultiSelectValues;

			const result = await ssRequest(this, "PATCH", `/deal/${dealId}`, {
				qs,
				body: dataObj,
			});

			const createInitialNote = this.getNodeParameter(
				"createInitialNote",
				i,
				false,
			) as boolean;
			let initialNoteId: string | undefined;
			if (createInitialNote) {
				const initialNoteText = this.getNodeParameter(
					"initialNoteText",
					i,
					"",
				) as string;
				if (initialNoteText && initialNoteText.trim()) {
					initialNoteId = await createNote(
						this,
						dealId,
						initialNoteText,
						"deal",
					);
				}
			}

			return { ...(result ?? {}), inputData: dataObj, initialNoteId };
		}

		case "getById": {
			const dealId = (this.getNodeParameter("dealId", i) as string)?.trim();

			if (!dealId) {
				throw new ApplicationError("dealId is required.");
			}

			const data = await ssRequest(this, "GET", `/deal/${dealId}`);

			return {
				dealId,
				...data,
			};
		}

		case "getDealsByContactId": {
		const contactId = (this.getNodeParameter("contactId", i) as string)?.trim();
		const pipelineId =
			(this.getNodeParameter("pipelineId", i, "") as string).trim() || undefined;

		if (!contactId) {
			throw new ApplicationError("contactId is required.");
		}

		const pageSize = 100; // fixed internal page size
		let page = 0;         // SalesSuite is 0-based
		let hasMore = true;

		const allDeals: IDataObject[] = [];

		while (hasMore) {
			const data = await ssRequest(
			this,
			"GET",
			`/deal/by-contact/${contactId}`,
			{ qs: { page, pageSize, pipelineId } },
			);

			const deals = Array.isArray(data) ? (data as IDataObject[]) : [];
			allDeals.push(...deals);

			if (deals.length === pageSize) {
			page++;
			} else {
			hasMore = false;
			}
		}

		const count = allDeals.length;

		if (!count) {
			return [{
			contactId,
			found: false,
			count: 0,
			pipelineId: pipelineId ?? null,
			}];
		}

		return allDeals.map((deal, index) => ({
			contactId,
			found: true,
			count,
			index: index + 1,
			pipelineId: pipelineId ?? null,
			...deal,
		}));
		}

		case "findDealsByEmail": {
			const email = (this.getNodeParameter("email", i) as string)?.trim();
			const returnAll = this.getNodeParameter("returnAll", i, true) as boolean;

			if (!email) {
				throw new ApplicationError("Email is required.");
			}

			const data = await ssRequest(this, "GET", "/deal/by-email", {
				qs: { email },
			});

			const deals = Array.isArray(data) ? data : [];
			const count = deals.length;

			if (!count) {
				return [
					{
						email,
						found: false,
						count: 0,
					},
				];
			}

			if (!returnAll) {
				return [
					{
						email,
						found: true,
						count,
						index: 1,
						...deals[0],
					},
				];
			}

			return deals.map((deal, index) => ({
				email,
				found: true,
				count,
				index: index + 1,
				...deal,
			}));
		}

		case "listDeals": {
			const page = this.getNodeParameter("page", i, 0) as number;
			const pageSize = this.getNodeParameter("pageSize", i, 25) as number;
			const pipelineId =
				(this.getNodeParameter("pipelineId", i, "") as string) || undefined;

			const data = await ssRequest(this, "GET", "/deal", {
				qs: { page, pageSize, pipelineId },
			});
			return {
				page,
				pageSize,
				pipelineId: pipelineId ?? null,
				deals: data ?? [],
			};
		}

		case "getPipelines": {
			const data = await ssRequest(this, "GET", "/pipelines");
			return data ?? [];
		}

		case "getDealsByPipelinePhase": {
			const pipelineId = this.getNodeParameter("pipelineId", i) as string;
			const phaseId = this.getNodeParameter("phaseId", i) as string;
			const pageSize = 100;

			let page = 0;
			let hasMore = true;
			const allDeals: IDataObject[] = [];

			while (hasMore) {
				const deals = ((await ssRequest(this, "GET", "/deal", {
					qs: { page, pageSize, pipelineId },
				})) ?? []) as IDataObject[];

				const stageDeals = deals.filter((deal) => deal.phaseId === phaseId);
				allDeals.push(...stageDeals);

				if (deals.length === pageSize) {
					page++;
				} else {
					hasMore = false;
				}
			}

			return allDeals;
		}

		case "changeDealPipelinePhase": {
			const dealId = this.getNodeParameter("dealId", i) as string;
			const pipelineId = this.getNodeParameter("pipelineId", i) as string;
			const phaseId = this.getNodeParameter("phaseId", i) as string;

			const result = await ssRequest(this, "PATCH", `/deal/${dealId}`, {
				qs: { pipelineId, phaseId },
				body: {},
			});

			return result ?? {};
		}

		default:
			throw new ApplicationError(`Unsupported deal operation: ${operation}`);
	}
}
