import { ApplicationError, IDataObject, IExecuteFunctions } from "n8n-workflow";

import { ssRequest } from "../../helpers/apiclient";

function addIfSet(qs: IDataObject, key: string, value: unknown): void {
	if (Array.isArray(value)) {
		if (value.length > 0) {
			qs[key] = value;
		}
		return;
	}

	if (value !== undefined && value !== null && value !== "") {
		qs[key] = value as IDataObject[string];
	}
}

export async function handleProperty(
	this: IExecuteFunctions,
	i: number,
	operation: string,
): Promise<unknown> {
	switch (operation) {
		case "listProperties": {
			const qs: IDataObject = {};
			addIfSet(qs, "cardType", this.getNodeParameter("cardType", i, []));
			addIfSet(qs, "dataType", this.getNodeParameter("dataType", i, []));
			addIfSet(
				qs,
				"propertyType",
				this.getNodeParameter("propertyType", i, ""),
			);
			addIfSet(
				qs,
				"visibleInCard",
				this.getNodeParameter("visibleInCard", i, ""),
			);
			addIfSet(qs, "required", this.getNodeParameter("required", i, ""));

			const data = await ssRequest(this, "GET", "/v1/property", { qs });
			return data ?? [];
		}

		case "listCards": {
			const qs: IDataObject = {};
			addIfSet(qs, "cardType", this.getNodeParameter("cardType", i, []));
			addIfSet(
				qs,
				"isPropertyVisibleInCard",
				this.getNodeParameter("isPropertyVisibleInCard", i, ""),
			);
			addIfSet(
				qs,
				"isPropertyRequired",
				this.getNodeParameter("isPropertyRequired", i, ""),
			);

			const data = await ssRequest(this, "GET", "/v1/card", { qs });
			return data ?? [];
		}

		default:
			throw new ApplicationError(
				`Unsupported property operation: ${operation}`,
			);
	}
}
