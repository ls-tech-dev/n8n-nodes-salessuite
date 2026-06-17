import { ApplicationError, IDataObject, IExecuteFunctions } from "n8n-workflow";

import { ssRequest } from "../../helpers/apiclient";

type WebhookSubscriptionResponse = IDataObject & {
	hookUrl?: string;
	type?: string;
	filter?: IDataObject;
};

function buildFilter(
	ctx: IExecuteFunctions,
	i: number,
	type: string,
	opts?: { allowEmpty?: boolean },
): IDataObject {
	const filter: IDataObject = {};

	if (type === "contact.propertyChanged" || type === "deal.propertyChanged") {
		const properties =
			(ctx.getNodeParameter("properties", i, []) as string[]) ?? [];
		if (!properties.length) {
			if (opts?.allowEmpty) return filter;
			throw new ApplicationError(
				"Select at least one property for this trigger.",
			);
		}
		filter.propertyIds = properties;
	}

	if (type === "deal.stageChanged") {
		const pipelineId = (
			ctx.getNodeParameter("pipelineId", i, "") as string
		).trim();
		const phaseId = (ctx.getNodeParameter("phaseId", i, "") as string).trim();
		if (pipelineId) filter.pipelineId = pipelineId;
		if (phaseId) filter.phaseId = phaseId;
	}

	if (type === "deal.created") {
		const pipelineId = (
			ctx.getNodeParameter("pipelineId", i, "") as string
		).trim();
		if (pipelineId) filter.pipelineId = pipelineId;
	}

	if (type === "form.submitted") {
		const formId = (ctx.getNodeParameter("formId", i, "") as string).trim();
		if (!formId) {
			if (opts?.allowEmpty) return filter;
			throw new ApplicationError("form.submitted requires a formId.");
		}
		filter.formId = formId;
	}

	if (type === "activity.created") {
		const activityType = (
			ctx.getNodeParameter("activityType", i, "call") as string
		).trim();
		filter.activityType = activityType;

		if (activityType === "call") {
			const callTypeId = (
				ctx.getNodeParameter("callTypeId", i, "") as string
			).trim();
			const callResult = (
				ctx.getNodeParameter("callResult", i, "") as string
			).trim();
			if (callTypeId && callTypeId !== "any") filter.callTypeId = callTypeId;
			if (callResult && callResult !== "any") {
				try {
					filter.callResult =
						typeof callResult === "string"
							? JSON.parse(callResult)
							: callResult;
				} catch {
					filter.callResult = callResult;
				}
			}
		}
	}

	return filter;
}

export async function handleWebhook(
	this: IExecuteFunctions,
	i: number,
	operation: string,
): Promise<unknown> {
	switch (operation) {
		case "listWebhooks": {
			const data = await ssRequest(this, "GET", "/v1/webhooks/subscription");
			return { webhooks: data ?? [] };
		}

		case "getWebhookById": {
			const id = (this.getNodeParameter("webhookId", i) as string)?.trim();
			if (!id) {
				throw new ApplicationError("webhookId is required.");
			}
			const data = await ssRequest(
				this,
				"GET",
				`/v1/webhooks/subscription/${encodeURIComponent(id)}`,
			);
			return data ?? {};
		}

		case "createWebhook": {
			const hookUrl = this.getNodeParameter("url", i) as string;
			const type = this.getNodeParameter("triggers", i) as string;
			const filter = buildFilter(this, i, type);

			const data = await ssRequest(this, "POST", "/v1/webhooks/subscription", {
				body: { hookUrl, type, filter },
			});
			return data ?? {};
		}

		case "updateWebhook": {
			const id = this.getNodeParameter("webhookId", i) as string;
			const url = (this.getNodeParameter("url", i, "") as string).trim();
			const type = (this.getNodeParameter("triggers", i, "") as string).trim();

			const existing = await ssRequest<WebhookSubscriptionResponse>(
				this,
				"GET",
				`/v1/webhooks/subscription/${id}`,
			);

			const nextType = type || existing?.type;
			if (!nextType) {
				throw new ApplicationError(
					"Webhook type is required to update a subscription.",
				);
			}

			const filter = buildFilter(this, i, nextType, { allowEmpty: !type });

			const data = await ssRequest(
				this,
				"PUT",
				`/v1/webhooks/subscription/${id}`,
				{
					body: {
						hookUrl: url || existing?.hookUrl,
						type: nextType,
						filter: Object.keys(filter).length
							? filter
							: (existing?.filter ?? {}),
					},
				},
			);
			return data ?? {};
		}

		case "deleteWebhook": {
			const id = this.getNodeParameter("webhookId", i) as string;
			const data = await ssRequest(
				this,
				"DELETE",
				`/v1/webhooks/subscription/${id}`,
			);
			return { deleted: data ?? null };
		}

		default:
			throw new ApplicationError(`Unsupported webhook operation: ${operation}`);
	}
}
