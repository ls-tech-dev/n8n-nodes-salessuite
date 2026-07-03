import { ApplicationError, IDataObject, IExecuteFunctions } from "n8n-workflow";

import { ssRequest } from "../../helpers/apiclient";

type ActionButtonExecution = IDataObject & {
	executedAt?: string;
};

type ActionButtonExecutionRecord = IDataObject & {
	latestExecutedAt?: string;
	totalExecutionCount?: number;
	executions?: ActionButtonExecution[];
	contact?: IDataObject;
	contactPerson?: IDataObject;
	mainContactPerson?: IDataObject;
	deal?: IDataObject;
};

type ActionButtonExecutionsResponse = IDataObject & {
	dynamicDbTableName?: string;
	cursor?: string | null;
	property?: {
		propertyId?: string;
		fullPropertyIdentifier?: string;
	};
	records?: ActionButtonExecutionRecord[];
};

function toPreviewRecords(
	data: ActionButtonExecutionsResponse | null | undefined,
	fallbackPropertyDefinitionId: string,
): IDataObject[] {
	const records = data?.records ?? [];

	return records
		.filter((record) => (record.executions?.length ?? 0) > 0)
		.map((record) => {
			const previewRecord: IDataObject = {
				propertyDefinitionId:
					data?.property?.propertyId ?? fallbackPropertyDefinitionId,
				propertyIdentifier: data?.property?.fullPropertyIdentifier,
				updatedAt:
					record.latestExecutedAt ?? record.executions?.[0]?.executedAt,
				execution: record.executions?.[0],
				executions: record.executions,
				totalExecutionCount: record.totalExecutionCount,
				dynamicDbTableName: data?.dynamicDbTableName,
				cursor: data?.cursor ?? null,
			};

			if (record.contact) previewRecord.contact = record.contact;
			if (record.contactPerson ?? record.mainContactPerson) {
				previewRecord.contactPerson =
					record.contactPerson ?? record.mainContactPerson;
			}
			if (record.deal) previewRecord.deal = record.deal;

			return previewRecord;
		});
}

export async function handleActionButton(
	this: IExecuteFunctions,
	i: number,
	operation: string,
): Promise<unknown> {
	switch (operation) {
		case "listTriggerActionButtons": {
			const dynamicDbTableName = (
				this.getNodeParameter("dynamicDbTableName", i, "") as string
			).trim();

			return await ssRequest(this, "GET", "/v1/action-button/trigger", {
				qs: { dynamicDbTableName },
			});
		}

		case "getTriggerActionButtonPreviewData": {
			const propertyDefinitionId = (
				this.getNodeParameter("propertyDefinitionId", i) as string
			).trim();
			const limit = this.getNodeParameter("limit", i, 1) as number;
			const cursor = (this.getNodeParameter("cursor", i, "") as string).trim();
			const executionsPerRecord = this.getNodeParameter(
				"executionsPerRecord",
				i,
				1,
			) as number;

			if (!propertyDefinitionId) {
				throw new ApplicationError("propertyDefinitionId is required.");
			}

			const data = await ssRequest(
				this,
				"GET",
				"/v1/action-button/executions",
				{
					qs: {
						propertyIdentification: propertyDefinitionId,
						limit,
						cursor,
						executionsPerRecord,
					},
				},
			);

			return toPreviewRecords(
				data as ActionButtonExecutionsResponse | null | undefined,
				propertyDefinitionId,
			);
		}

		default:
			throw new ApplicationError(
				`Unsupported action button operation: ${operation}`,
			);
	}
}
