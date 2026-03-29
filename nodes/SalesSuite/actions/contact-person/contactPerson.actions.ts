import { ApplicationError, IDataObject, IExecuteFunctions } from "n8n-workflow";

import { ssRequest } from "../../helpers/apiclient";

export async function handleContactPerson(
	this: IExecuteFunctions,
	i: number,
	operation: string,
): Promise<unknown> {
	switch (operation) {
		case "getContactPersonById": {
			const contactPersonId = (
				this.getNodeParameter("contactPersonId", i) as string
			)?.trim();

			if (!contactPersonId) {
				throw new ApplicationError("contactPersonId is required.");
			}

			const data = await ssRequest<IDataObject>(
				this,
				"GET",
				`/contact-person/${contactPersonId}`,
			);

			return [
				{
					contactPersonId,
					found: true,
					...(data ?? {}),
				},
			];
		}

		default:
			throw new ApplicationError(
				`Unsupported contactPerson operation: ${operation}`,
			);
	}
}
