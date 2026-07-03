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
				name: "List Trigger Action Buttons",
				value: "listTriggerActionButtons",
				description:
					"Returns all trigger-type action buttons with optional filtering by card type",
				action: "List trigger action buttons",
			},
			{
				name: "List Action Button Executions",
				value: "getTriggerActionButtonPreviewData",
				description:
					"Lists records with stored executions for one action-button property",
				action: "List action button executions",
			},
		],
		default: "getTriggerActionButtonPreviewData",
	},
];

export const actionButtonFields: INodeProperties[] = [
	{
		displayName: "Card Type",
		name: "dynamicDbTableName",
		type: "options",
		options: [
			{
				name: "All",
				value: "",
			},
			{
				name: "Contact",
				value: "Contact",
			},
			{
				name: "Contact Person",
				value: "ContactPerson",
			},
			{
				name: "Deal",
				value: "Deal",
			},
		],
		default: "Contact",
		description: "Filter by card type",
		displayOptions: {
			show: {
				resource: ["actionButton"],
				operation: ["listTriggerActionButtons"],
			},
		},
	},
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
			'Trigger action button to inspect. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
	{
		displayName: "Cursor",
		name: "cursor",
		type: "string",
		default: "",
		description: "Opaque cursor for the next page of items",
		displayOptions: {
			show: {
				resource: ["actionButton"],
				operation: ["getTriggerActionButtonPreviewData"],
			},
		},
	},
	{
		displayName: "Executions Per Record",
		name: "executionsPerRecord",
		type: "number",
		default: 1,
		typeOptions: {
			minValue: 0,
			maxValue: 100,
		},
		description:
			"Number of executions to return for each record. Use 100 to return all stored executions.",
		displayOptions: {
			show: {
				resource: ["actionButton"],
				operation: ["getTriggerActionButtonPreviewData"],
			},
		},
	},
];
