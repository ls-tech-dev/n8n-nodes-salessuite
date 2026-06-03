import type { INodeProperties } from "n8n-workflow";

export const actionButtonOperations: INodeProperties[] = [
	{
		displayName: "Operation",
		name: "operation",
		type: "options",
		noDataExpression: true,
		displayOptions: { show: { resource: ["actionButton"] } },
		options: [
			{
				name: "Get Trigger Action Button Preview Data",
				value: "getTriggerActionButtonPreviewData",
				description:
					"Returns preview records for one trigger button with latest execution and contact/deal payload",
				action: "Get trigger action button preview data",
			},
		],
		default: "getTriggerActionButtonPreviewData",
	},
];

export const actionButtonFields: INodeProperties[] = [
	{
		displayName: "Trigger Action Button Name or ID",
		name: "propertyDefinitionId",
		type: "options",
		typeOptions: {
			loadOptionsMethod: "loadTriggerActionButtons",
			reloadOptions: true,
		},
		required: true,
		default: "",
		description:
			'Trigger action button to preview. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ["actionButton"],
				operation: ["getTriggerActionButtonPreviewData"],
			},
		},
	},
	{
		displayName: "Limit",
		name: "limit",
		type: "number",
		default: 50,
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		description: "Max number of results to return",
		displayOptions: {
			show: {
				resource: ["actionButton"],
				operation: ["getTriggerActionButtonPreviewData"],
			},
		},
	},
];
