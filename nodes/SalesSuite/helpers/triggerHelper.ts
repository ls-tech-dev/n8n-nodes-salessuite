import type { IHookFunctions, IWebhookFunctions } from "n8n-workflow";

import { ssRequest } from "./apiclient";

type WebhookListEntry = {
	id: string;
	hookUrl: string;
	type?: string;
};

type TriggerStaticData = {
	idByUrl?: Record<string, { id: string; ts: number }>;
};

type ApiErrorLike = {
	message?: string;
};

/** Cache-TTL URL→ID Lookups (10 Min) */
export const URL_ID_CACHE_TTL_MS = 10 * 60 * 1000;

export async function listWebhooks(
	ctx: IHookFunctions | IWebhookFunctions,
): Promise<Array<{ id: string; url: string; type?: string }>> {
	try {
		const list = await ssRequest<WebhookListEntry[]>(
			ctx,
			"GET",
			"/v1/webhooks/subscription",
		);
		return Array.isArray(list)
			? list.map((w) => ({ id: w.id, url: w.hookUrl, type: w.type }))
			: [];
	} catch {
		return [];
	}
}

export async function findWebhookByExactUrl(
	ctx: IHookFunctions | IWebhookFunctions,
	url: string,
): Promise<{ id: string; url: string; type?: string } | undefined> {
	const data = ctx.getWorkflowStaticData("node") as TriggerStaticData;
	data.idByUrl = data.idByUrl || {};

	const cached = data.idByUrl[url] as { id: string; ts: number } | undefined;
	if (cached && Date.now() - cached.ts < URL_ID_CACHE_TTL_MS) {
		const list = await listWebhooks(ctx);
		const hit = list.find((w) => w?.id === cached.id && w?.url === url);
		if (hit) return hit;
	}

	const list = await listWebhooks(ctx);
	const hit = list.find((w) => w?.url === url);
	if (hit?.id) {
		data.idByUrl[url] = { id: hit.id, ts: Date.now() };
		return hit;
	}
	return undefined;
}

export async function deleteWebhookByIdWithRetry(
	ctx: IHookFunctions | IWebhookFunctions,
	id: string,
	opts?: {
		retries?: number;
		failOnError?: boolean;
	},
): Promise<boolean> {
	const retries = opts?.retries ?? 3;
	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			await ssRequest(ctx, "DELETE", `/v1/webhooks/subscription/${id}`);
			return true;
		} catch (e) {
			const msg = (e as ApiErrorLike).message || "unknown";
			ctx.logger?.warn?.(
				`SalesSuite: deleteWebhook failed (attempt ${attempt + 1}/${retries + 1})`,
				{ id, error: msg },
			);
			if (attempt === retries) {
				if (opts?.failOnError) throw e;
				return false;
			}
		}
	}
	return false;
}
