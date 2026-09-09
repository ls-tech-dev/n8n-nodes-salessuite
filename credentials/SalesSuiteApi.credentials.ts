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
		"https://github.com/ls-tech-dev/n8n-nodes-salessuite/blob/main/CREDENTIALS.md";
	icon: Icon = {
		light: "file:salessuite-light-icon.svg",
		dark: "file:salessuite-dark-icon.svg",
	};

	authenticate: IAuthenticateGeneric = {
		type: "generic",
		properties: {
			headers: {
				"x-api-key": "={{$credentials.apiKey}}",
				"x-lang": "={{$credentials.language}}",
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
		{
			displayName: "Response Language",
			name: "language",
			type: "options",
			default: "de",
			options: [
				{
					name: "Deutsch (DE)",
					value: "de",
				},
				{
					name: "English (EN)",
					value: "en",
				},
			],
			description:
				"Language used for translated text in API responses. Sent as the x-lang header with every request. Credentials saved before this option existed send no language and keep using the tenant default locale until they are saved again.",
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
