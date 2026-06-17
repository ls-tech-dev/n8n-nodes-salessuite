import type { ILoadOptionsFunctions, INodePropertyOptions } from "n8n-workflow";

import { ssRequest } from "../../helpers/apiclient";

type DealPayload = {
	id?: string;
	name?: string;
	pipelineName?: string;
	phaseName?: string;
};

type PipelinePayload = {
	id: string;
	displayName: string;
	phases: Array<{ id: string; displayName: string }>;
};

export async function getDeals(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const data = (await ssRequest(this, "GET", "/v1/deal", {
		qs: { page: 0, pageSize: 50 },
	})) as DealPayload[];
	if (!Array.isArray(data) || !data.length) {
		return [{ name: "No Deals Found", value: "" }];
	}

	return data.map((deal) => {
		const pipeline = deal.pipelineName ? ` • ${deal.pipelineName}` : "";
		const phase = deal.phaseName ? ` › ${deal.phaseName}` : "";
		return {
			name: `${deal.name ?? deal.id}${pipeline}${phase}`,
			value: String(deal.id ?? ""),
			description:
				deal.pipelineName && deal.phaseName
					? `${deal.pipelineName} / ${deal.phaseName}`
					: undefined,
		};
	});
}

export async function getPipelines(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const data = (await ssRequest(
		this,
		"GET",
		"/v1/pipelines",
	)) as PipelinePayload[];
	return (data ?? []).map((p) => ({
		name: p.displayName || p.id,
		value: p.id,
	}));
}

export async function getStagesByPipeline(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const pipelineId = this.getCurrentNodeParameter("pipelineId") as string;
	if (!pipelineId) return [];

	const data = (await ssRequest(
		this,
		"GET",
		"/v1/pipelines",
	)) as PipelinePayload[];
	const pipeline = (data ?? []).find(
		(p) => String(p.id) === String(pipelineId),
	);
	if (!pipeline) return [{ name: "Pipeline Not Found", value: "" }];

	return (pipeline.phases ?? []).map((phase) => ({
		name: phase.displayName || phase.id,
		value: phase.id,
	}));
}
