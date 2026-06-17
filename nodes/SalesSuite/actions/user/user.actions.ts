import { ApplicationError, IDataObject, IExecuteFunctions } from "n8n-workflow";

import { ssRequest } from "../../helpers/apiclient";

export async function handleUser(
	this: IExecuteFunctions,
	i: number,
	operation: string,
): Promise<unknown> {
	switch (operation) {
		case "list": {
			const page = this.getNodeParameter("page", i, 0) as number;
			const pageSize = this.getNodeParameter("pageSize", i, 25) as number;
			const additionalOptions = this.getNodeParameter(
				"additionalOptions",
				i,
				{},
			) as IDataObject;

			const data = await ssRequest(this, "GET", "/v1/user", {
				qs: {
					page,
					pageSize,
					role: additionalOptions.role,
					roleFilter: additionalOptions.roleFilter,
					sortBy: additionalOptions.sortBy,
					sortOrder: additionalOptions.sortOrder,
				},
			});

			return { page, pageSize, users: data ?? [] };
		}

		case "getByEmail": {
			const email = (this.getNodeParameter("email", i) as string)?.trim();
			if (!email) {
				throw new ApplicationError("Email is required.");
			}

			const data = await ssRequest<IDataObject>(
				this,
				"GET",
				"/v1/user/by-email",
				{ qs: { email } },
			);

			return [{ email, ...(data ?? {}) }];
		}

		case "getById": {
			const userId = (this.getNodeParameter("userId", i) as string)?.trim();
			if (!userId) {
				throw new ApplicationError("userId is required.");
			}

			const data = await ssRequest<IDataObject>(
				this,
				"GET",
				`/v1/user/${userId}`,
			);

			return [{ userId, ...(data ?? {}) }];
		}

		default:
			throw new ApplicationError(`Unsupported user operation: ${operation}`);
	}
}
