import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from "n8n-workflow";

export type ApiContext =
	| IExecuteFunctions
	| ILoadOptionsFunctions
	| IHookFunctions
	| IWebhookFunctions;

export async function ssRequest(
	ctx: ApiContext,
	method: IHttpRequestOptions["method"],
	path: string,
	opts: {
		qs?: IDataObject;
		body?: IDataObject | string;
		json?: boolean;
		headers?: Record<string, string>;
	} = {},
): Promise<any> {
	const credentials = await ctx.getCredentials("salesSuiteApi");
	const apiKey = String(credentials.apiKey || "").trim();
	const baseUrl = String(credentials.baseUrl || "")
		.trim()
		.replace(/\/+$/, "");

	const json = opts.json ?? typeof opts.body !== "string";

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${path}`,
		json,
		headers: {
			"x-api-key": apiKey,
			...opts.headers,
		} as IDataObject,
	};

	if (opts.qs) {
		const filteredQs: IDataObject = {};
		for (const [key, val] of Object.entries(opts.qs)) {
			if (val !== undefined && val !== null && val !== "") {
				filteredQs[key] = val;
			}
		}
		if (Object.keys(filteredQs).length) {
			options.qs = filteredQs;
		}
	}

	if (opts.body !== undefined) {
		options.body = opts.body as any;
	}

	return await ctx.helpers.httpRequestWithAuthentication.call(
		ctx,
		"salesSuiteApi",
		options,
	);
}
