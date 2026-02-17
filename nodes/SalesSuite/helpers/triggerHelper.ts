import type { IHookFunctions, IWebhookFunctions } from 'n8n-workflow';

import { getApiClient } from '../helpers/apiclient';

/** Cache-TTL URL→ID Lookups (10 Min) */
export const URL_ID_CACHE_TTL_MS = 10 * 60 * 1000;

export async function listWebhooks(ctx: IHookFunctions | IWebhookFunctions): Promise<Array<{ id: string; url: string; type?: string }>> {
  try {
    const client = getApiClient(ctx as any);
    const list = await client.GET('/webhooks/subscription');
    return Array.isArray(list) ? list.map((w) => ({ id: w.id, url: w.hookUrl, type: w.type })) : [];
  } catch {
    return [];
  }
}

export async function findWebhookByExactUrl(ctx: IHookFunctions | IWebhookFunctions, url: string): Promise<{ id: string; url: string; type?: string } | undefined> {
  const data = ctx.getWorkflowStaticData('node') as any;
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
    backoffMs?: number;
    failOnError?: boolean;
  }
): Promise<boolean> {
  try {
    const client = getApiClient(ctx as any);
    await client.DELETE(`/webhooks/subscription/{id}`, {
      params: { path: { id } },
    });
    return true;
  } catch (e: any) {}
  return false;
}
