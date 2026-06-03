import type { INodeProperties } from "n8n-workflow";

export const propertyOperations: INodeProperties[] = [
	{
		displayName: "Operation",
		name: "operation",
		type: "options",
		noDataExpression: true,
		displayOptions: { show: { resource: ["property"] } },
		options: [
			{
				name: "List Cards",
				value: "listCards",
				description: "Retrieve cards with optional filters",
				action: "List cards",
			},
			{
				name: "List Properties",
				value: "listProperties",
				description: "Retrieve property definitions with optional filters",
				action: "List properties",
			},
		],
		default: "listProperties",
	},
];

export const propertyFields: INodeProperties[] = [
	{
		displayName: "Card Types",
		name: "cardType",
		type: "multiOptions",
		options: [
			{ name: "Contact", value: "Contact" },
			{ name: "Contact Person", value: "ContactPerson" },
			{ name: "Deal", value: "Deal" },
		],
		default: [],
		displayOptions: {
			show: {
				resource: ["property"],
				operation: ["listCards", "listProperties"],
			},
		},
		description: "Filter by card type",
	},
	{
		displayName: "Data Types",
		name: "dataType",
		type: "multiOptions",
		options: [
			{ name: "Action", value: "action" },
			{ name: "Boolean", value: "boolean" },
			{ name: "Date Time", value: "dateTime" },
			{ name: "Number", value: "number" },
			{ name: "Select", value: "select" },
			{ name: "String", value: "string" },
		],
		default: [],
		displayOptions: {
			show: { resource: ["property"], operation: ["listProperties"] },
		},
		description: "Filter by property data type",
	},
	{
		displayName: "Property Type",
		name: "propertyType",
		type: "options",
		options: [
			{ name: "Any", value: "" },
			{ name: "Dynamic", value: "dynamic" },
			{ name: "System", value: "system" },
		],
		default: "",
		displayOptions: {
			show: { resource: ["property"], operation: ["listProperties"] },
		},
		description: "Filter by property type",
	},
	{
		displayName: "Visible in Card",
		name: "visibleInCard",
		type: "options",
		options: [
			{ name: "Any", value: "" },
			{ name: "True", value: true },
			{ name: "False", value: false },
		],
		default: "",
		displayOptions: {
			show: { resource: ["property"], operation: ["listProperties"] },
		},
		description: "Filter by card visibility",
	},
	{
		displayName: "Required",
		name: "required",
		type: "options",
		options: [
			{ name: "Any", value: "" },
			{ name: "True", value: true },
			{ name: "False", value: false },
		],
		default: "",
		displayOptions: {
			show: { resource: ["property"], operation: ["listProperties"] },
		},
		description: "Filter by required state",
	},
	{
		displayName: "Property Visible in Card",
		name: "isPropertyVisibleInCard",
		type: "options",
		options: [
			{ name: "Any", value: "" },
			{ name: "True", value: true },
			{ name: "False", value: false },
		],
		default: "",
		displayOptions: {
			show: { resource: ["property"], operation: ["listCards"] },
		},
		description: "Filter nested properties by card visibility",
	},
	{
		displayName: "Property Required",
		name: "isPropertyRequired",
		type: "options",
		options: [
			{ name: "Any", value: "" },
			{ name: "True", value: true },
			{ name: "False", value: false },
		],
		default: "",
		displayOptions: {
			show: { resource: ["property"], operation: ["listCards"] },
		},
		description: "Filter nested properties by required state",
	},
];
