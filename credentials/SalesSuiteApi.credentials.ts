import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class SalesSuiteApi implements ICredentialType {
  name = 'salesSuiteApi';
  displayName = 'SalesSuite API';
  documentationUrl = 'https://api.salessuite.com';

  properties: INodeProperties[] = [
    {
      displayName: 'API Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://api.salessuite.com/api/v1',
      placeholder: 'https://api.salessuite.com/api/v1',
      description: 'Base URL of the SalesSuite Public API',
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description: 'SalesSuite API Key',
    },
  ];

  test = {
    request: {
      method: 'GET' as const,
      url: '={{$credentials.baseUrl}}/pipelines',
      headers: {
        'x-api-key': '={{$credentials.apiKey}}',
      },
    },
  };
}
