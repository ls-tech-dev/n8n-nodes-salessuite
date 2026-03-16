import {
	IDataObject,
	IHookFunctions,
	INodeOutputConfiguration,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	NodeOperationError,
} from "n8n-workflow";

import { ssRequest } from "../helpers/apiclient";
import {
	loadCallResultTypes,
	loadPhoneCallActivityTypes,
} from "../methods/loadOptions/callactivity.loadOptions";
import {
	loadContactPropertiesAsOptions,
	loadDealPropertiesAsOptions,
	loadForms,
	loadPipelines,
	loadStages,
} from "../methods/loadOptions/trigger.loadOptions";
import { instantProperties } from "./trigger.instant.properties";

function buildFilter(ctx: IHookFunctions, event: string): IDataObject {
	const filter: IDataObject = {};

	if (event === "contact.propertyChanged") {
		const selected =
			(ctx.getNodeParameter("contactProperties", 0) as string[]) ?? [];
		if (!Array.isArray(selected) || selected.length === 0) {
			throw new NodeOperationError(
				ctx.getNode(),
				"Please select at least one Contact property.",
			);
		}
		filter.propertyIds = selected;
	}

	if (event === "deal.propertyChanged") {
		const selected =
			(ctx.getNodeParameter("dealProperties", 0) as string[]) ?? [];
		if (!Array.isArray(selected) || selected.length === 0) {
			throw new NodeOperationError(
				ctx.getNode(),
				"Please select at least one Deal property.",
			);
		}
		filter.propertyIds = selected;
	}

	if (event === "deal.stageChanged") {
		const scope =
			(ctx.getNodeParameter("dealStageScope", 0) as "all" | "specific") ??
			"all";
		if (scope === "specific") {
			const pipelineId =
				(ctx.getNodeParameter("pipelineId", 0) as string) || "";
			const phaseId = (ctx.getNodeParameter("phaseId", 0) as string) || "";
			if (!pipelineId || !phaseId) {
				throw new NodeOperationError(
					ctx.getNode(),
					"Please select a pipeline and phase for this trigger.",
				);
			}
			filter.pipelineId = pipelineId;
			filter.phaseId = phaseId;
		}
	}

	if (event === "deal.created") {
		const pipelineId = (ctx.getNodeParameter("pipelineId", 0) as string) || "";
		if (pipelineId) filter.pipelineId = pipelineId;
	}

	if (event === "form.submitted") {
		const formId = (ctx.getNodeParameter("formId", 0) as string) || "";
		if (!formId) {
			throw new NodeOperationError(ctx.getNode(), "Please select a form.");
		}
		filter.formId = formId;
	}

	if (event === "email.activity") {
		filter.activityType = "email";
	}

	if (event === "activity.created") {
		filter.activityType = "call";
		const callTypeId = (ctx.getNodeParameter("callTypeId", 0) as string) || "";
		if (callTypeId && callTypeId !== "any") {
			filter.callTypeId = callTypeId;
		}

		const callResultRaw =
			(ctx.getNodeParameter("callResult", 0) as string) || "";
		if (callResultRaw && callResultRaw !== "any") {
			try {
				filter.callResult =
					typeof callResultRaw === "string"
						? JSON.parse(callResultRaw)
						: callResultRaw;
			} catch {
				throw new NodeOperationError(
					ctx.getNode(),
					"Call Result must be a valid JSON option.",
				);
			}
		}
	}

	return filter;
}

export class SalesSuiteTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: "SalesSuite Trigger",
		name: "salesSuiteTrigger",
		icon: {
			light: "file:../salessuite-light-icon.svg",
			dark: "file:../salessuite-dark-icon.svg",
		},
		group: ["trigger"],
		version: 1,
		description:
			"Interact with the SalesSuite API (powered by agentur-systeme.de)",
		subtitle: '={{$parameter["events"]}}',
		defaults: {
			name: "SalesSuite Trigger",
			// @ts-expect-error free-form description
			description:
				"Interact with the SalesSuite API (powered by agentur-systeme.de)",
		},
		credentials: [{ name: "salesSuiteApi", required: true }],
		webhooks: [
			{
				name: "default",
				httpMethod: "POST",
				responseMode: "onReceived",
				isFullPath: true,
				path: "",
			},
		],
		inputs: [],
		outputs: [{ type: "main" } as INodeOutputConfiguration],
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
				const webhookData = this.getWorkflowStaticData("node");
				const id = webhookData.subscriptionId as string | undefined;
				if (!id) return false;

				try {
					await ssRequest(
						this as any,
						"GET",
						`/webhooks/subscription/${encodeURIComponent(id)}`,
					);
					return true;
				} catch (e: any) {
					if (e?.httpCode === "404" || e?.response?.statusCode === 404) {
						delete webhookData.subscriptionId;
						return false;
					}
					throw e;
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl("default");
				if (!webhookUrl) {
					throw new NodeOperationError(
						this.getNode(),
						"Webhook URL could not be determined.",
					);
				}

				const selectedEvent = this.getNodeParameter("events", 0) as string;
				const filter = buildFilter(this, selectedEvent);

				const apiEventType =
					selectedEvent === "email.activity"
						? "activity.created"
						: selectedEvent;

				const res: any = await ssRequest(
					this as any,
					"POST",
					"/webhooks/subscription",
					{
						body: {
							hookUrl: webhookUrl,
							type: apiEventType,
							filter,
						},
					},
				);

				if (!res?.id) {
					throw new NodeOperationError(
						this.getNode(),
						"SalesSuite: Could not read subscriptionId from response.",
						{ description: JSON.stringify(res || {}) },
					);
				}

				const webhookData = this.getWorkflowStaticData("node");
				webhookData.subscriptionId = res.id;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData("node");
				const id = webhookData.subscriptionId as string | undefined;
				if (!id) return true;

				try {
					await ssRequest(
						this as any,
						"DELETE",
						`/webhooks/subscription/${encodeURIComponent(id)}`,
					);
				} catch (e: any) {
					if (e?.httpCode !== "404" && e?.response?.statusCode !== 404) {
						throw e;
					}
				}

				delete webhookData.subscriptionId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const body = (req.body ?? {}) as IDataObject;

		const selectedEvent = this.getNodeParameter("events", 0) as string;

		if (selectedEvent === "email.activity") {
			const emailActivity = body.emailActivity as IDataObject | undefined;
			const content = emailActivity?.content as IDataObject | undefined;
			if (content?.plateValue) {
				const extractText = (node: any): string => {
					if (typeof node.text === "string") return node.text;
					if (Array.isArray(node.children)) {
						return node.children.map(extractText).join("");
					}
					return "";
				};

				const nodes = content.plateValue as any[];
				if (Array.isArray(nodes)) {
					const text = nodes
						.map((node) => {
							if (node.type === "divider") return "---";
							return extractText(node);
						})
						.filter((line) => line.length > 0)
						.join("\n");
					(content as IDataObject).plainText = text;
				}
			}
		}

		if (selectedEvent === "activity.created") {
			const callActivity = body.callActivity as IDataObject | undefined;

			if (callActivity?.callTypeId) {
				try {
					const callTypes = (await ssRequest(
						this as any,
						"GET",
						"/call-types",
					)) as Array<{ id: string; name: string; category: string }>;

					const match = Array.isArray(callTypes)
						? callTypes.find((ct) => ct.id === callActivity.callTypeId)
						: undefined;

					if (match) {
						callActivity.callTypeName = match.name;
						callActivity.callTypeCategory = match.category;
					}
				} catch {}
			}
		}

		return {
			webhookResponse: { body: { ok: true }, responseCode: 200 },
			workflowData: [[{ json: body }]],
		};
	}
}
