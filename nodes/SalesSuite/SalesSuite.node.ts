import { IDataObject, IExecuteFunctions, INodeExecutionData, INodeInputConfiguration, INodeOutputConfiguration, INodeType, INodeTypeDescription } from 'n8n-workflow';

import { activityFields, activityOperations } from './actions/activity';
import { contactFields, contactOperations } from './actions/contact';
import { dealFields, dealOperations } from './actions/deal';
import { resourceSelector } from './actions/resource.selector';
import { route } from './actions/router';
import { webhookFields, webhookOperations } from './actions/webhook';
import * as Loaders from './methods/loadOptions';
import { getContactResourceMapperFields, getContactResourceMapperFieldsForUpdate } from './methods/resourceMappers/contact.resourceMapper';
import { getDealResourceMapperFields, getDealResourceMapperFieldsForUpdate } from './methods/resourceMappers/deal.resourceMapper';

export class SalesSuite implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'SalesSuite',
    name: 'SalesSuite',
    icon: {
      light: 'file:salessuite-light-icon.svg',
      dark: 'file:salessuite-dark-icon.svg',
    },
    group: ['transform'],
    version: 1,
    description: 'Interact with the SalesSuite API',
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    defaults: {
      name: 'SalesSuite',
      // @ts-expect-error free-form description
      description: 'Interact with the SalesSuite API',
    },
    inputs: [{ type: 'main' } as INodeInputConfiguration],
    outputs: [{ type: 'main' } as INodeOutputConfiguration],
    credentials: [{ name: 'salesSuiteApi', required: true }],
    usableAsTool: true,
    properties: [
      resourceSelector,

      // Activity
      ...activityOperations,
      ...activityFields,

      // Contact
      ...contactOperations,
      ...contactFields,

      // Deal
      ...dealOperations,
      ...dealFields,

      // Webhook
      ...webhookOperations,
      ...webhookFields,
    ],
  };

  methods = {
    loadOptions: {
      ...Loaders.commonLoaders,
      ...Loaders.contactLoaders,
      ...Loaders.dealLoaders,
      ...Loaders.webhookLoaders,
      ...Loaders.phoneCallLoaders,
    },
    resourceMapping: {
      getContactResourceMapperFields,
      getContactResourceMapperFieldsForUpdate,
      getDealResourceMapperFields,
      getDealResourceMapperFieldsForUpdate,
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: IDataObject[] = [];

    for (let i = 0; i < items.length; i++) {
      const resource = this.getNodeParameter('resource', i) as string;
      const operation = this.getNodeParameter('operation', i) as string;
      const result = (await route.call(this, i, resource, operation)) as unknown;

      if (Array.isArray(result)) {
        for (const entry of result) {
          returnData.push(entry as IDataObject);
        }
      } else if (result && typeof result === 'object') {
        returnData.push(result as IDataObject);
      } else {
        returnData.push({ result } as IDataObject);
      }
    }

    return [this.helpers.returnJsonArray(returnData)];
  }
}
