import type { INodeProperties } from "n8n-workflow";

export const formOperations: INodeProperties[] = [
	{
		displayName: "Operation",
		name: "operation",
		type: "options",
		noDataExpression: true,
		displayOptions: { show: { resource: ["form"] } },
		options: [
			{
				name: "Get Form Submissions",
				value: "getFormSubmissions",
				description: "Retrieve all submissions for a specific form",
				action: "Get form submissions",
			},
			{
				name: "List Forms",
				value: "listForms",
				description: "List all available forms",
				action: "List forms",
			},
		],
		default: "getFormSubmissions",
	},
];

export const formFields: INodeProperties[] = [
	// ===== GET FORM SUBMISSIONS =====
	{
		displayName: "Form Name or ID",
		name: "formId",
		type: "options",
		typeOptions: {
			loadOptionsMethod: "getFormsAsOptions",
			reloadOptions: true,
		},
		required: true,
		default: "",
		description:
			'Form to retrieve submissions for. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: {
			show: { resource: ["form"], operation: ["getFormSubmissions"] },
		},
	},
	{
		displayName: "Page",
		name: "page",
		type: "number",
		default: 0,
		typeOptions: { minValue: 0 },
		displayOptions: {
			show: { resource: ["form"], operation: ["getFormSubmissions"] },
		},
		description: "Page of submissions to retrieve (zero-based)",
	},
	{
		displayName: "Page Size",
		name: "pageSize",
		type: "number",
		default: 20,
		typeOptions: { minValue: 1 },
		displayOptions: {
			show: { resource: ["form"], operation: ["getFormSubmissions"] },
		},
		description: "Number of submissions per page",
	},
];
