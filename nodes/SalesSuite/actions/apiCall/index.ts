import type { INodeProperties } from "n8n-workflow";

export const apiCallOperations: INodeProperties[] = [
	{
		displayName: "Operation",
		name: "operation",
		type: "options",
		noDataExpression: true,
		default: "makeRequest",
		displayOptions: { show: { resource: ["apiCall"] } },
		options: [
			{
				name: "Make Request",
				value: "makeRequest",
				description: "Make a custom API call",
				action: "Custom API call",
			},
		],
	},
];

export const apiCallFields: INodeProperties[] = [
	{
		displayName: "HTTP Method",
		name: "httpMethod",
		type: "options",
		displayOptions: {
			show: { resource: ["apiCall"], operation: ["makeRequest"] },
		},
		options: [
			{ name: "DELETE", value: "DELETE" },
			{ name: "GET", value: "GET" },
			{ name: "PATCH", value: "PATCH" },
			{ name: "POST", value: "POST" },
			{ name: "PUT", value: "PUT" },
		],
		default: "GET",
		required: true,
		description: "HTTP method for the API call",
	},
	{
		displayName: "Endpoint",
		name: "endpoint",
		type: "string",
		displayOptions: {
			show: { resource: ["apiCall"], operation: ["makeRequest"] },
		},
		default: "",
		required: true,
		placeholder: "/contact",
		description: "API endpoint path (without base URL)",
	},
	{
		displayName: "Request Body",
		name: "requestBody",
		type: "json",
		displayOptions: {
			show: {
				resource: ["apiCall"],
				operation: ["makeRequest"],
				httpMethod: ["POST", "PUT", "PATCH"],
			},
		},
		default: "{}",
		description: "Request body as JSON",
	},
	{
		displayName: "Query Parameters",
		name: "queryParameters",
		type: "fixedCollection",
		typeOptions: { multipleValues: true },
		displayOptions: {
			show: { resource: ["apiCall"], operation: ["makeRequest"] },
		},
		default: {},
		options: [
			{
				name: "parameter",
				displayName: "Parameter",
				values: [
					{
						displayName: "Name",
						name: "name",
						type: "string",
						default: "",
						description: "Name of the query parameter",
					},
					{
						displayName: "Value",
						name: "value",
						type: "string",
						default: "",
						description: "Value of the query parameter",
					},
				],
			},
		],
	},
];
