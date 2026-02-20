import { ApplicationError, IExecuteFunctions } from "n8n-workflow";

import { ssRequest } from "../../helpers/apiclient";

export async function handleForm(
	this: IExecuteFunctions,
	i: number,
	operation: string,
): Promise<unknown> {
	switch (operation) {
		case "listForms": {
			const data = await ssRequest(this, "GET", "/form");
			return data ?? [];
		}

		case "getFormSubmissions": {
			const formId = this.getNodeParameter("formId", i) as string;
			const page = this.getNodeParameter("page", i, 0) as number;
			const pageSize = this.getNodeParameter("pageSize", i, 20) as number;
			const data = await ssRequest(this, "GET", `/form/${formId}/submissions`, {
				qs: { page, pageSize },
			});
			return data ?? [];
		}

		default:
			throw new ApplicationError(`Unsupported form operation: ${operation}`);
	}
}
