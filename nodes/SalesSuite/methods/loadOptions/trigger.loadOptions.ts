import type { ILoadOptionsFunctions, INodePropertyOptions } from "n8n-workflow";

import { ssRequest } from "../../helpers/apiclient";
import {
	getDisplayName,
	loadContactProperties,
	loadDealProperties,
} from "../../helpers/fieldMapping";
import { canUsePropertyAsField } from "../resourceMappers/canUsePropertyAsField";

type PipelinePayload = {
	id: string;
	displayName: string;
	phases: Array<{ id: string; displayName: string }>;
};

type FormPayload = { formId: string; name: string };

type CallTypePayload = { id: string; name: string; category?: string };

export async function loadContactPropertiesAsOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const properties = await loadContactProperties(this);

	return properties
		.filter(
			(p) =>
				p.dynamicDbTableName === "Contact" ||
				p.dynamicDbTableName === "ContactPerson",
		)
		.sort((a, b) =>
			getDisplayName(a).localeCompare(getDisplayName(b), "en", {
				sensitivity: "base",
			}),
		)
		.map((p) => ({
			name: getDisplayName(p),
			value: p.propertyIdentifier,
		}));
}

export async function loadDealPropertiesAsOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const properties = await loadDealProperties(this);
	return properties
		.filter((p) => p.dynamicDbTableName === "Deal" && canUsePropertyAsField(p))
		.sort((a, b) =>
			getDisplayName(a).localeCompare(getDisplayName(b), "en", {
				sensitivity: "base",
			}),
		)
		.map((p) => ({
			name: getDisplayName(p),
			value: p.propertyIdentifier,
		}));
}

export async function loadPipelines(
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

export async function loadStages(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const pipelineId = this.getNodeParameter("pipelineId", 0) as string;
	if (!pipelineId)
		return [{ name: "Please Select a Pipeline First", value: "" }];

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

export async function loadForms(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const data = (await ssRequest(this, "GET", "/v1/form")) as FormPayload[];
	return (data ?? []).map((f) => ({
		name: f.name || f.formId,
		value: f.formId,
	}));
}

type TriggerActionButtonPayload = {
	dynamicDbTableName: string;
	propertyDefinitionId: string;
	propertyIdentifier: string;
	fieldName: string;
	shortName: string;
};

export async function loadTriggerActionButtons(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const data = (await ssRequest(
		this,
		"GET",
		"/v1/action-button/trigger",
	)) as TriggerActionButtonPayload[];
	return (data ?? []).map((b) => ({
		name: `${b.fieldName} (${b.dynamicDbTableName} - ${b.shortName})`,
		value: b.propertyDefinitionId,
	}));
}

export async function loadPhoneCallActivityTypes(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const data = (await ssRequest(
		this,
		"GET",
		"/v1/call-types",
	)) as CallTypePayload[];
	return (data ?? []).map((t) => ({ name: t.name, value: t.id }));
}
