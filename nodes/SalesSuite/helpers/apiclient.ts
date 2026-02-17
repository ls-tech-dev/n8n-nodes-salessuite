/* eslint-disable @typescript-eslint/no-empty-object-type */
import { ApplicationError, IDataObject, IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions, IWebhookFunctions } from 'n8n-workflow';
import type { MaybeOptionalInit, ParseAsResponse } from 'openapi-fetch';
import type { HttpMethod, MediaType, PathsWithMethod, RequiredKeysOf, ResponseObjectMap, SuccessResponse } from 'openapi-typescript-helpers';

import type { paths } from './schema';

export const HTTP_HEADER_X_API_KEY = 'x-api-key';

type InitParam<Init> = RequiredKeysOf<Init> extends never ? [(Init & { [key: string]: unknown })?] : [Init & { [key: string]: unknown }];

export type ClientMethod<Paths extends Record<string, Record<HttpMethod, {}>>, Method extends HttpMethod, Media extends MediaType> = <
  Path extends PathsWithMethod<Paths, Method>,
  Init extends MaybeOptionalInit<Paths[Path], Method>,
>(
  url: Path,
  ...init: InitParam<Init>
) => Promise<ParseAsResponse<SuccessResponse<ResponseObjectMap<Paths[Path][Method]>, Media>, Init>>;

interface Client<Paths extends {}, Media extends MediaType = MediaType> {
  /** Call a GET endpoint */
  GET: ClientMethod<Paths, 'get', Media>;
  /** Call a PUT endpoint */
  PUT: ClientMethod<Paths, 'put', Media>;
  /** Call a POST endpoint */
  POST: ClientMethod<Paths, 'post', Media>;
  /** Call a DELETE endpoint */
  DELETE: ClientMethod<Paths, 'delete', Media>;
  /** Call a OPTIONS endpoint */
  OPTIONS: ClientMethod<Paths, 'options', Media>;
  /** Call a HEAD endpoint */
  HEAD: ClientMethod<Paths, 'head', Media>;
  /** Call a PATCH endpoint */
  PATCH: ClientMethod<Paths, 'patch', Media>;
  /** Call a TRACE endpoint */
  TRACE: ClientMethod<Paths, 'trace', Media>;
}

type method = 'get' | 'post' | 'put' | 'delete' | 'options' | 'head' | 'patch' | 'trace';

export type BodyParams<Path extends keyof paths, Method extends method> = paths[Path][Method] extends { requestBody: infer RequestBody }
  ? RequestBody extends { content: infer Content }
    ? Content extends { 'application/json': infer JsonContent }
      ? JsonContent
      : never
    : never
  : never;

export type PublicRestApiClient = Client<paths, 'application/json'>;

// This is return type check: paths['/bundles']["get"]["responses"]["200"]["content"]["application/json"]
// generate a generic type for the response of an endpoint, with generic path and the method defined in the schema
// @ts-expect-error ironically, this is not a valid type, but it is used to generate the correct type below... TODO: fix this
export type PublicRestApiResponse<T extends keyof paths, M extends keyof paths[T]> = paths[T][M]['responses']['200']['content']['application/json'];
const DEFAULT_BASE_URL = 'https://api.salessuite.com/api/v1';

function normalizeBaseUrl(value: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return DEFAULT_BASE_URL;
  return trimmed.replace(/\/+$/, '');
}

type ApiContext = IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions;

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
export function getApiClient(ctx: ApiContext): PublicRestApiClient {
  const makeRequestWithAuth = async (method: string, path: string, params: any = {}) => {
    const credentials = (await ctx.getCredentials('salesSuiteApi')) as IDataObject | undefined;
    const apiKey = ((credentials?.apiKey as string) || '').trim();
    const baseUrl = normalizeBaseUrl((credentials?.baseUrl as string) || DEFAULT_BASE_URL);

    let pathname = path;
    if (params.params?.path) {
      for (const [key, value] of Object.entries(params.params.path)) {
        pathname = pathname.replace(`{${key}}`, encodeURIComponent(String(value)));
      }
    }
    const url = new URL(baseUrl + pathname);
    if (params.params?.query) {
      for (const [key, value] of Object.entries(params.params.query)) {
        if (value) url.searchParams.append(key, String(value));
      }
    }
    try {
      const response = await ctx.helpers.httpRequest({
        headers: {
          [HTTP_HEADER_X_API_KEY]: apiKey,
        },
        method,
        url: url.toString(),
        ...params,
      });
      if (typeof response === 'string') {
        try {
          return JSON.parse(response);
        } catch {
          return response;
        }
      }

      return response;
    } catch (error: any) {
      const status = error?.statusCode ?? error?.response?.statusCode;
      const body = error?.response?.body;
      const message = body ? safeStringify(body) : error?.message || 'SalesSuite API request failed.';

      throw new ApplicationError(message, {
        extra: {
          status,
          url,
          method: method,
        },
      });
    }
  };

  return {
    GET: (path, params: any) => makeRequestWithAuth('GET', path, params) as any,
    POST: (path, params: any) => makeRequestWithAuth('POST', path, params) as any,
    PUT: (path, params: any) => makeRequestWithAuth('PUT', path, params) as any,
    DELETE: (path, params: any) => makeRequestWithAuth('DELETE', path, params) as any,
    HEAD: (path, params: any) => makeRequestWithAuth('HEAD', path, params) as any,
    PATCH: (path, params: any) => makeRequestWithAuth('PATCH', path, params) as any,
    OPTIONS: (path, params: any) => makeRequestWithAuth('OPTIONS', path, params) as any,
    TRACE: (path, params: any) => makeRequestWithAuth('TRACE', path, params) as any,
  } as PublicRestApiClient;
}

export class PublicRestApiRequestError extends Error {
  public status: number;
  public body: unknown;

  constructor(response: Response, body: unknown, opts?: ErrorOptions) {
    super(`Public rest api request failed, status: ${response.status} ${response.statusText}, message: ${(body as any)?.message}`, opts);
    this.name = 'PublicRestApiRequestError';
    this.status = response.status;
    this.body = body;
  }
}

async function tryGetResponseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
