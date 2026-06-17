import {
	ApplicationError,
	IDataObject,
	IExecuteFunctions,
	IHttpRequestOptions,
} from "n8n-workflow";

import { ssRequest } from "../../helpers/apiclient";

export async function handleApiCall(
	this: IExecuteFunctions,
	i: number,
	operation: string,
): Promise<unknown> {
	switch (operation) {
		case "getAuthenticationData": {
			return await ssRequest(this, "GET", "/v1/auth");
		}

		case "makeRequest": {
			const method = this.getNodeParameter("httpMethod", i) as string;
			const endpoint = this.getNodeParameter("endpoint", i) as string;
			if (!method || !endpoint) {
				throw new ApplicationError("HTTP method and endpoint are required.");
			}

			const queryParams = (
				this.getNodeParameter("queryParameters", i) as IDataObject
			)?.parameter as IDataObject[] | undefined;

			const qs: IDataObject = {};
			for (const param of queryParams ?? []) {
				if (param.name && param.value !== undefined) {
					qs[param.name as string] = param.value;
				}
			}

			let body: IDataObject | undefined;
			if (["POST", "PUT", "PATCH"].includes(method)) {
				const rawBody = this.getNodeParameter("requestBody", i, {});
				body = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
			}

			return ssRequest(
				this,
				method as IHttpRequestOptions["method"],
				endpoint,
				{ qs, body },
			);
		}

		default:
			throw new ApplicationError(`Unsupported operation: ${operation}`);
	}
}
