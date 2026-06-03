import { ApplicationError, IExecuteFunctions } from "n8n-workflow";

import { handleActionButton } from "./action-buttons/actionButtons.actions";
import { handleActivity } from "./activity/activity.actions";
import { handleApiCall } from "./apiCall/apiCall.actions";
import { handleContact } from "./contact/contact.actions";
import { handleContactPerson } from "./contact-person/contactPerson.actions";
import { handleDeal } from "./deal/deal.actions";
import { handleForm } from "./form/form.actions";
import { handleProperty } from "./property/property.actions";
import { handleWebhook } from "./webhook/webhook.actions";

export async function route(
	this: IExecuteFunctions,
	i: number,
	resource: string,
	operation: string,
): Promise<unknown> {
	switch (resource) {
		case "actionButton":
			return await handleActionButton.call(this, i, operation);

		case "activity":
			return await handleActivity.call(this, i, operation);

		case "apiCall":
			return await handleApiCall.call(this, i, operation);

		case "contact":
			return await handleContact.call(this, i, operation);

		case "contactPerson":
			return await handleContactPerson.call(this, i, operation);

		case "deal":
			return await handleDeal.call(this, i, operation);

		case "form":
			return await handleForm.call(this, i, operation);

		case "property":
			return await handleProperty.call(this, i, operation);

		case "webhook":
			return await handleWebhook.call(this, i, operation);

		default:
			throw new ApplicationError(`Unsupported resource: ${resource}`);
	}
}
