import type { INodeProperties } from "n8n-workflow";

export const resourceSelector: INodeProperties = {
	displayName: "Resource",
	name: "resource",
	type: "options",
	noDataExpression: true,
	options: [
		{
			name: "Action Button",
			value: "actionButton",
			description: "Preview trigger action button payloads",
		},
		{
			name: "API Call",
			value: "apiCall",
			description: "Make a custom API call to the SalesSuite API",
		},
		{
			name: "Call Activity",
			value: "callActivity",
			description: "Create, list, fetch, and delete call activities",
		},
		{
			name: "Contact",
			value: "contact",
			description: "Create, update, and manage contacts",
		},
		{
			name: "Contact Person",
			value: "contactPerson",
			description: "Retrieve and manage contact persons",
		},
		{
			name: "Deal",
			value: "deal",
			description:
				"Work with deals – from creation to updates and pipeline management",
		},
		{
			name: "Email Activity",
			value: "emailActivity",
			description: "Log, list, fetch, and delete email activities",
		},
		{
			name: "Form",
			value: "form",
			description: "List forms and retrieve form submissions",
		},
		{
			name: "Note",
			value: "note",
			description: "Create, list, fetch, and delete notes",
		},
		{
			name: "Property",
			value: "property",
			description: "Retrieve properties and cards from SalesSuite",
		},
		{
			name: "User",
			value: "user",
			description: "Retrieve users",
		},
		{
			name: "Webhook",
			value: "webhook",
			description: "Manage webhook subscriptions in SalesSuite",
		},
	],
	default: "contact",
};
