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
			name: "Activity",
			value: "activity",
			description: "Create notes and list call or email activities",
		},
		{
			name: "API Call",
			value: "apiCall",
			description: "Make a custom API call to the SalesSuite API",
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
			name: "Form",
			value: "form",
			description: "List forms and retrieve form submissions",
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
