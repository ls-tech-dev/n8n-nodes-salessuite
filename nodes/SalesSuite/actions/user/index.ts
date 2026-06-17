import type { INodeProperties } from "n8n-workflow";

export const userOperations: INodeProperties[] = [
	{
		displayName: "Operation",
		name: "operation",
		type: "options",
		noDataExpression: true,
		displayOptions: { show: { resource: ["user"] } },
		options: [
			{
				name: "Find User by Email",
				value: "getByEmail",
				description: "Find a single user by email address",
				action: "Find user by email",
			},
			{
				name: "Get User by ID",
				value: "getById",
				description: "Get a single user by ID",
				action: "Get user by ID",
			},
			{
				name: "List Users",
				value: "list",
				description: "List users with pagination",
				action: "List users",
			},
		],
		default: "list",
	},
];

export const userFields: INodeProperties[] = [
	// ===== GET BY ID =====
	{
		displayName: "User Name or ID",
		name: "userId",
		type: "options",
		typeOptions: { loadOptionsMethod: "getUsers" },
		default: "",
		required: true,
		displayOptions: {
			show: { resource: ["user"], operation: ["getById"] },
		},
		description:
			'Pick a user. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	// ===== GET BY EMAIL =====
	{
		displayName: "User Name or ID",
		name: "email",
		type: "options",
		typeOptions: { loadOptionsMethod: "getUsersByEmail" },
		placeholder: "name@email.com",
		default: "",
		required: true,
		displayOptions: {
			show: { resource: ["user"], operation: ["getByEmail"] },
		},
		description:
			'Pick a user. The selected value is the email address. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	// ===== LIST =====
	{
		displayName: "Page",
		name: "page",
		type: "number",
		default: 0,
		displayOptions: {
			show: { resource: ["user"], operation: ["list"] },
		},
	},
	{
		displayName: "Page Size",
		name: "pageSize",
		type: "number",
		default: 25,
		typeOptions: { minValue: 1 },
		description: "Max number of results to return",
		displayOptions: {
			show: { resource: ["user"], operation: ["list"] },
		},
	},
	{
		displayName: "Additional Options",
		name: "additionalOptions",
		type: "collection",
		placeholder: "Add Option",
		default: {},
		displayOptions: {
			show: { resource: ["user"], operation: ["list"] },
		},
		options: [
			{
				displayName: "Role",
				name: "role",
				type: "string",
				default: "",
				description: "Filter users by role",
			},
			{
				displayName: "Role Filter",
				name: "roleFilter",
				type: "string",
				default: "",
				description: "Additional role filter",
			},
			{
				displayName: "Sort By",
				name: "sortBy",
				type: "string",
				default: "",
				description: "Field to sort by",
			},
			{
				displayName: "Sort Order",
				name: "sortOrder",
				type: "options",
				default: "asc",
				options: [
					{ name: "Ascending", value: "asc" },
					{ name: "Descending", value: "desc" },
				],
			},
		],
	},
];
