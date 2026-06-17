import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from "n8n-workflow";

export class SalesSuiteApi implements ICredentialType {
	name = "salesSuiteApi";
	displayName = "SalesSuite API";
	documentationUrl =
		"https://github.com/rjsebening/n8n-nodes-salessuite/blob/main/CREDENTIALS.md";
	icon: Icon = {
		light: "file:salessuite-light-icon.svg",
		dark: "file:salessuite-dark-icon.svg",
	};

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
			default: "https://api.salessuite.com/api",
			placeholder: "https://api.salessuite.com/api",
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

	test: ICredentialTestRequest = {
		request: {
			baseURL:
				"={{String($credentials.baseUrl).replace(/\\/+$/, '').replace(/\\/v\\d+$/i, '')}}",
			url: "/v1/auth",
			method: "GET",
		},
	};
}
