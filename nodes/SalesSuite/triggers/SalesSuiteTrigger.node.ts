import { IDataObject, IHookFunctions, INodeOutputConfiguration, INodeType, INodeTypeDescription, IWebhookFunctions, IWebhookResponseData, NodeOperationError } from 'n8n-workflow';

import { getApiClient } from '../helpers/apiclient';
import { deleteWebhookByIdWithRetry, findWebhookByExactUrl, listWebhooks } from '../helpers/triggerHelper';
import { loadCallResultTypes, loadPhoneCallActivityTypes } from '../methods/loadOptions/callactivity.loadOptions';
import { loadContactPropertiesAsOptions, loadDealPropertiesAsOptions, loadForms, loadPipelines, loadStages } from '../methods/loadOptions/trigger.loadOptions';
import { instantProperties } from './trigger.instant.properties';

function buildFilter(ctx: IHookFunctions, event: string): IDataObject {
  const filter: IDataObject = {};

  if (event === 'contact.propertyChanged') {
    const selected = (ctx.getNodeParameter('contactProperties', 0) as string[]) ?? [];
    if (!Array.isArray(selected) || selected.length === 0) {
      throw new NodeOperationError(ctx.getNode(), 'Please select at least one Contact property.');
    }
    filter.propertyIds = selected;
  }

  if (event === 'deal.propertyChanged') {
    const selected = (ctx.getNodeParameter('dealProperties', 0) as string[]) ?? [];
    if (!Array.isArray(selected) || selected.length === 0) {
      throw new NodeOperationError(ctx.getNode(), 'Please select at least one Deal property.');
    }
    filter.propertyIds = selected;
  }

  if (event === 'deal.stageChanged') {
    const scope = (ctx.getNodeParameter('dealStageScope', 0) as 'all' | 'specific') ?? 'all';
    if (scope === 'specific') {
      const pipelineId = (ctx.getNodeParameter('pipelineId', 0) as string) || '';
      const phaseId = (ctx.getNodeParameter('phaseId', 0) as string) || '';
      if (!pipelineId || !phaseId) {
        throw new NodeOperationError(ctx.getNode(), 'Please select a pipeline and phase for this trigger.');
      }
      filter.pipelineId = pipelineId;
      filter.phaseId = phaseId;
    }
  }

  if (event === 'deal.created') {
    const pipelineId = (ctx.getNodeParameter('pipelineId', 0) as string) || '';
    if (pipelineId) filter.pipelineId = pipelineId;
  }

  if (event === 'form.submitted') {
    const formId = (ctx.getNodeParameter('formId', 0) as string) || '';
    if (!formId) {
      throw new NodeOperationError(ctx.getNode(), 'Please select a form.');
    }
    filter.formId = formId;
  }

  if (event === 'activity.created') {
    filter.activityType = 'call';
    const callTypeId = (ctx.getNodeParameter('callTypeId', 0) as string) || '';
    if (callTypeId && callTypeId !== 'any') {
      filter.callTypeId = callTypeId;
    }

    const callResultRaw = (ctx.getNodeParameter('callResult', 0) as string) || '';
    if (callResultRaw && callResultRaw !== 'any') {
      try {
        filter.callResult = typeof callResultRaw === 'string' ? JSON.parse(callResultRaw) : callResultRaw;
      } catch {
        throw new NodeOperationError(ctx.getNode(), 'Call Result must be a valid JSON option.');
      }
    }
  }

  return filter;
}

export class SalesSuiteTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'SalesSuite Trigger',
    name: 'SalesSuiteTrigger',
    icon: {
      light: 'file:../salessuite-light-icon.svg',
      dark: 'file:../salessuite-dark-icon.svg',
    },
    group: ['trigger'],
    version: 1,
    description: 'React to SalesSuite events via webhooks',
    subtitle: '={{$parameter["events"]}}',
    defaults: {
      name: 'SalesSuite Trigger',
      // @ts-expect-error free-form description
      description: 'React to SalesSuite events via webhooks',
    },
    credentials: [{ name: 'salesSuiteApi', required: true }],
    webhooks: [
      {
        name: 'default',
        httpMethod: 'POST',
        responseMode: 'onReceived',
        isFullPath: true,
        path: '',
      },
    ],
    inputs: [],
    outputs: [{ type: 'main' } as INodeOutputConfiguration],
    properties: instantProperties,
  };

  methods = {
    loadOptions: {
      getContactProperties: loadContactPropertiesAsOptions,
      getDealProperties: loadDealPropertiesAsOptions,
      getPipelines: loadPipelines,
      getStages: loadStages,
      getForms: loadForms,
      loadPhoneCallActivityTypes,
      loadCallResultTypes,
    },
  };

  webhookMethods = {
    default: {
      async checkExists(this: IHookFunctions): Promise<boolean> {
        const data = this.getWorkflowStaticData('node') as any;
        const mode = this.getMode?.() as 'manual' | 'trigger' | string;
        if (mode === 'manual') {
          return false;
        }
        const currentUrlRaw = this.getNodeWebhookUrl('default');
        if (!currentUrlRaw) throw new NodeOperationError(this.getNode(), 'Webhook URL could not be determined.');
        const currentUrl = currentUrlRaw;

        const idKey = mode === 'manual' ? 'subscriptionIdTest' : 'subscriptionIdProd';
        const id = data[idKey] as string | undefined;
        if (id) {
          const list = await listWebhooks(this);
          const hit = list.find((w) => w?.id === id && w?.url === currentUrl);
          if (hit) return true;
        }

        const hit = await findWebhookByExactUrl(this, currentUrl);
        if (hit?.id) {
          data[idKey] = hit.id;
          return true;
        }
        return false;
      },

      async create(this: IHookFunctions): Promise<boolean> {
        const data = this.getWorkflowStaticData('node') as any;
        const mode = this.getMode?.() as 'manual' | 'trigger' | string;
        const isManual = mode === 'manual';

        const currentUrlRaw = this.getNodeWebhookUrl('default');
        if (!currentUrlRaw) {
          throw new NodeOperationError(this.getNode(), 'Webhook URL could not be determined');
        }
        const currentUrl = currentUrlRaw;

        if (isManual) {
          try {
            const list = await listWebhooks(this);
            const stale = list.filter((w) => w.url === currentUrl);
            for (const s of stale) {
              await deleteWebhookByIdWithRetry(this, s.id, { retries: 1, backoffMs: 200, failOnError: false });
            }
          } catch {}
        }

        const selectedEvent = this.getNodeParameter('events', 0) as string;
        const filter = buildFilter(this, selectedEvent);

        const client = getApiClient(this as any) as any;
        const res: any = await client.POST('/webhooks/subscription', {
          body: {
            hookUrl: currentUrl,
            type: selectedEvent,
            filter,
          },
        });

        const subscriptionId = res?.id as string | undefined;

        const oldId = isManual ? data.subscriptionIdTest : data.subscriptionIdProd;
        if (oldId && oldId !== subscriptionId) {
          await deleteWebhookByIdWithRetry(this, oldId, { retries: 2, backoffMs: 300, failOnError: false });
        }

        data.idByUrl = data.idByUrl || {};
        if (subscriptionId) data.idByUrl[currentUrl] = { id: subscriptionId, ts: Date.now() };

        if (isManual) {
          data.subscriptionIdTest = subscriptionId;
          data.lastTestUrl = currentUrl;
        } else {
          if (!subscriptionId) {
            throw new NodeOperationError(this.getNode(), 'SalesSuite: Could not read subscriptionId from CreateWebhook.', {
              description: JSON.stringify(res || {}),
            });
          }
          data.subscriptionIdProd = subscriptionId;

          const list = await listWebhooks(this);
          const dups = list.filter((w) => w.url === currentUrl && w.id !== subscriptionId);
          for (const d of dups) {
            await deleteWebhookByIdWithRetry(this, d.id, { retries: 1, backoffMs: 300, failOnError: false });
          }
        }

        return true;
      },

      async delete(this: IHookFunctions): Promise<boolean> {
        const data = this.getWorkflowStaticData('node') as any;
        const mode = this.getMode?.() as 'manual' | 'trigger' | string;
        const isManual = mode === 'manual';
        const currentUrlRaw = this.getNodeWebhookUrl('default');
        if (!currentUrlRaw) throw new NodeOperationError(this.getNode(), 'Webhook URL could not be determined.');
        const currentUrl = currentUrlRaw;

        const failOnProdDeleteError = true;

        const idKey = isManual ? 'subscriptionIdTest' : 'subscriptionIdProd';
        let id = data[idKey] as string | undefined;

        if (!id) {
          const cached = await findWebhookByExactUrl(this, currentUrl);
          id = cached?.id;
        }
        if (!id) return true;

        if (isManual) {
          await deleteWebhookByIdWithRetry(this, id, { retries: 0, backoffMs: 0, failOnError: false });
          if (data.idByUrl?.[currentUrl]) delete data.idByUrl[currentUrl];
          if (data.subscriptionIdTest === id) delete data.subscriptionIdTest;
          return true;
        }

        try {
          const ok = await deleteWebhookByIdWithRetry(this, id, {
            retries: 3,
            backoffMs: 500,
            failOnError: failOnProdDeleteError,
          });
          if (!ok) {
            data.staleProdIds = Array.isArray(data.staleProdIds) ? data.staleProdIds : [];
            if (!data.staleProdIds.includes(id)) data.staleProdIds.push(id);
          }
        } catch (e: any) {
          throw new NodeOperationError(this.getNode(), 'SalesSuite: Delete production webhook failed', {
            description: e?.message || 'unknown',
          });
        } finally {
          if (data.idByUrl?.[currentUrl]) delete data.idByUrl[currentUrl];
          if (data.subscriptionIdProd === id) delete data.subscriptionIdProd;
        }

        return true;
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const req = this.getRequestObject();
    const body = (req.body ?? {}) as IDataObject;
    const mode = this.getMode?.() as 'manual' | 'trigger' | string;

    if (mode === 'manual') {
      try {
        const data = this.getWorkflowStaticData('node') as any;
        const currentUrlRaw = this.getNodeWebhookUrl('default');
        if (currentUrlRaw) {
          const id = data?.subscriptionIdTest as string | undefined;
          if (id) {
            await deleteWebhookByIdWithRetry(this, id, { retries: 0, backoffMs: 0, failOnError: false });
            if (data.idByUrl?.[currentUrlRaw]) delete data.idByUrl[currentUrlRaw];
            if (data.subscriptionIdTest === id) delete data.subscriptionIdTest;
          } else {
            const hit = await findWebhookByExactUrl(this, currentUrlRaw);
            if (hit?.id) {
              await deleteWebhookByIdWithRetry(this, hit.id, { retries: 0, backoffMs: 0, failOnError: false });
              const d = this.getWorkflowStaticData('node') as any;
              if (d.idByUrl?.[currentUrlRaw]) delete d.idByUrl[currentUrlRaw];
              if (d.subscriptionIdTest === hit.id) delete d.subscriptionIdTest;
            }
          }
        }
      } catch {
        this.logger?.warn?.('SalesSuite Trigger: auto-delete test webhook failed (ignored).');
      }
    }

    return {
      webhookResponse: { body: { ok: true }, responseCode: 200 },
      workflowData: [
        [
          {
            json: {
              body,
              executionMode: mode,
            },
          },
        ],
      ],
    };
  }
}
