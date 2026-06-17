import { ILoadOptionsFunctions, INodePropertyOptions } from "n8n-workflow";

import { ssRequest } from "../../helpers/apiclient";

type ContactPayload = {
	contact?: {
		id?: string;
		firstName?: string;
		lastName?: string;
		email?: string;
	};
	mainContactPerson?: {
		id?: string;
		firstName?: string;
		lastName?: string;
		email?: string;
	};
};

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

function formatContactLabel(entry: ContactPayload): {
	label: string;
	email?: string;
} {
	const contact = entry?.contact ?? {};
	const person = entry?.mainContactPerson ?? {};
	const first = person.firstName || contact.firstName || "";
	const last = person.lastName || contact.lastName || "";
	const email = person.email || contact.email || "";
	const full = `${first} ${last}`.trim();
	return {
		label: full || email || contact.id || "Unknown",
		email: email || undefined,
	};
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
		(p: PipelinePayload) => String(p.id) === String(pipelineId),
	);
	if (!pipeline) return [{ name: "Pipeline Not Found", value: "" }];

	return (pipeline.phases ?? []).map(
		(phase: { id: string; displayName: string }) => ({
			name: phase.displayName || phase.id,
			value: phase.id,
		}),
	);
}

export async function getContacts(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	let search = "";
	try {
		search = (this.getNodeParameter("contactSearch", 0) as string) || "";
	} catch {
		search = "";
	}

	let data: ContactPayload[] = [];

	if (search.trim()) {
		data = (await ssRequest(this, "GET", "/v1/contact/search", {
			qs: { query: search.trim() },
		})) as ContactPayload[];
	} else {
		data = (await ssRequest(this, "GET", "/v1/contact", {
			qs: { page: 0, pageSize: 25 },
		})) as ContactPayload[];
	}

	if (!Array.isArray(data) || !data.length) {
		return [{ name: "No Contacts Found", value: "" }];
	}

	return data.map((entry) => {
		const { label, email } = formatContactLabel(entry);
		return {
			name: label,
			value: String(entry?.contact?.id ?? ""),
			description: email,
		};
	});
}

export async function getDeals(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const data = (await ssRequest(this, "GET", "/v1/deal", {
		qs: { page: 0, pageSize: 25 },
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
