import type {
	IAuthenticateGeneric,
	ICredentialType,
	Icon,
	INodeProperties,
} from "n8n-workflow";

export class SalesSuiteApi implements ICredentialType {
	name = "salesSuiteApi";
	displayName = "SalesSuite API";
	documentationUrl = "https://github.com/rjsebening/n8n-nodes-salessuite/blob/main/CREDENTIALS.md";
	icon: Icon = "file:salessuite-icon.svg";

	authenticate: IAuthenticateGeneric = {
		type: "generic",
		properties: {
			headers: {
				"x-api-key": "={{$credentials.apiKey}}",
			},
		},
	};

	properties: INodeProperties[] = [
		{
			displayName: "API Base URL",
			name: "baseUrl",
			type: "string",
			default: "https://api.salessuite.com/api/v1",
			placeholder: "https://api.salessuite.com/api/v1",
			description: "Base URL of the SalesSuite Public API",
		},
		{
			displayName: "API Key",
			name: "apiKey",
			type: "string",
			typeOptions: { password: true },
			default: "",
			description: "SalesSuite API Key",
		},
	];

	test = {
		request: {
			method: "GET" as const,
			url: "={{$credentials.baseUrl}}/pipelines",
		},
	};
}
