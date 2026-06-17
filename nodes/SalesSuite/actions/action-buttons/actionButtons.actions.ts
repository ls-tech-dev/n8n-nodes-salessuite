import { ApplicationError, IExecuteFunctions } from "n8n-workflow";

import { ssRequest } from "../../helpers/apiclient";

export async function handleActionButton(
	this: IExecuteFunctions,
	i: number,
	operation: string,
): Promise<unknown> {
	switch (operation) {
		case "getTriggerActionButtonPreviewData": {
			const propertyDefinitionId = (
				this.getNodeParameter("propertyDefinitionId", i) as string
			).trim();
			const limit = this.getNodeParameter("limit", i, 1) as number;

			if (!propertyDefinitionId) {
				throw new ApplicationError("propertyDefinitionId is required.");
			}

			const data = await ssRequest(
				this,
				"GET",
				"/v1/action-button/trigger/preview",
				{
					qs: { propertyDefinitionId, limit },
				},
			);

			return data ?? [];
		}

		default:
			throw new ApplicationError(
				`Unsupported action button operation: ${operation}`,
			);
	}
}
