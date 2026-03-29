import type { INodeProperties } from "n8n-workflow";

export const contactPersonOperations: INodeProperties[] = [
	{
		displayName: "Operation",
		name: "operation",
		type: "options",
		noDataExpression: true,
		displayOptions: { show: { resource: ["contactPerson"] } },
		options: [
			{
				name: "Get ContactPerson by ID",
				value: "getContactPersonById",
				description:
					"Retrieves a single Contact Person with the related Contact",
				action: "Get contact person by ID",
			},
		],
		default: "getContactPersonById",
	},
];

export const contactPersonFields: INodeProperties[] = [
	{
		displayName: "Contact Person ID",
		name: "contactPersonId",
		type: "string",
		default: "",
		required: true,
		displayOptions: {
			show: {
				resource: ["contactPerson"],
				operation: ["getContactPersonById"],
			},
		},
		description: "ID der Kontaktperson",
	},
];
