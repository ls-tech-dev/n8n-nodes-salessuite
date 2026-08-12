import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
} from "n8n-workflow";

import {
	actionButtonFields,
	actionButtonOperations,
} from "./actions/action-buttons";
import {
	callActivityFields,
	callActivityOperations,
} from "./actions/call-activity";
import { activityFields, activityOperations } from "./actions/activity";
import { apiCallFields, apiCallOperations } from "./actions/apiCall";
import { contactFields, contactOperations } from "./actions/contact";
import {
	contactPersonFields,
	contactPersonOperations,
} from "./actions/contact-person";
import { dealFields, dealOperations } from "./actions/deal";
import {
	emailActivityFields,
	emailActivityOperations,
} from "./actions/email-activity";
import { formFields, formOperations } from "./actions/form";
import { noteFields, noteOperations } from "./actions/note";
import { propertyFields, propertyOperations } from "./actions/property";
import { resourceSelector } from "./actions/resource.selector";
import { route } from "./actions/router";
import { userFields, userOperations } from "./actions/user";
import { webhookFields, webhookOperations } from "./actions/webhook";
import * as Loaders from "./methods/loadOptions";
import {
	getContactResourceMapperFields,
	getContactResourceMapperFieldsForUpdate,
	getContactResourceMapperFieldsForUpsert,
} from "./methods/resourceMappers/contact.resourceMapper";
import {
	getContactPersonResourceMapperFields,
	getContactPersonResourceMapperFieldsForUpdate,
} from "./methods/resourceMappers/contactPerson.resourceMapper";
import {
	getDealResourceMapperFields,
	getDealResourceMapperFieldsForUpdate,
} from "./methods/resourceMappers/deal.resourceMapper";

export class SalesSuite implements INodeType {
	description: INodeTypeDescription = {
		displayName: "SalesSuite",
		name: "salesSuite",
		icon: {
			light: "file:salessuite-light-icon.svg",
			dark: "file:salessuite-dark-icon.svg",
		},
		group: ["transform"],
		version: [1, 2, 3],
		description: "Interact with the official SalesSuite API",
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: "SalesSuite",
			// @ts-expect-error free-form description
			description: "Interact with the official SalesSuite API",
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: "salesSuiteApi",
				required: true,
			},
		],
		usableAsTool: true,
		properties: [
			resourceSelector,

			// Action Button
			...actionButtonOperations,
			...actionButtonFields,

			// Activity
			...activityOperations,
			...activityFields,

			// Call Activity
			...callActivityOperations,
			...callActivityFields,

			// API Call
			...apiCallOperations,
			...apiCallFields,

			// Contact
			...contactOperations,
			...contactFields,

			// Contact Person
			...contactPersonOperations,
			...contactPersonFields,

			// Deal
			...dealOperations,
			...dealFields,

			// Email Activity
			...emailActivityOperations,
			...emailActivityFields,

			// Form
			...formOperations,
			...formFields,

			// Note
			...noteOperations,
			...noteFields,

			// Property
			...propertyOperations,
			...propertyFields,

			// User
			...userOperations,
			...userFields,

			// Webhook
			...webhookOperations,
			...webhookFields,
		],
	};

	methods = {
		loadOptions: {
			...Loaders.commonLoaders,
			...Loaders.contactLoaders,
			...Loaders.dealLoaders,
			...Loaders.webhookLoaders,
			...Loaders.phoneCallLoaders,
			...Loaders.triggerLoaders,
			...Loaders.userLoaders,
		},
		resourceMapping: {
			getContactResourceMapperFields,
			getContactResourceMapperFieldsForUpdate,
			getContactResourceMapperFieldsForUpsert,
			getContactPersonResourceMapperFields,
			getContactPersonResourceMapperFieldsForUpdate,
			getDealResourceMapperFields,
			getDealResourceMapperFieldsForUpdate,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter("resource", i) as string;
				const operation = this.getNodeParameter("operation", i) as string;
				const result = (await route.call(
					this,
					i,
					resource,
					operation,
				)) as unknown;

				if (Array.isArray(result)) {
					for (const entry of result) {
						returnData.push({
							json: entry as IDataObject,
							pairedItem: { item: i },
						});
					}
				} else if (result && typeof result === "object") {
					returnData.push({
						json: result as IDataObject,
						pairedItem: { item: i },
					});
				}
			} catch (error) {
				const nodeError =
					error instanceof NodeApiError || error instanceof NodeOperationError
						? error
						: new NodeOperationError(this.getNode(), error as Error, {
								itemIndex: i,
							});

				if (this.continueOnFail()) {
					returnData.push({
						json: items[i].json,
						error: nodeError,
						pairedItem: { item: i },
					});
					continue;
				}
				throw nodeError;
			}
		}

		return [returnData];
	}
}
