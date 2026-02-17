import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import { type CallActivityResultType, type OpeningCallResultNew, closingCallResultSchema, openingCallResultSchema, settingCallResultSchema } from '@poc/common/call-activity';

import { getApiClient } from '../../helpers/apiclient';

type CallTypePayload = { id: string; name: string; category?: string };

function generateOpeningCallResults(): CallActivityResultType[] {
  const options = openingCallResultSchema.options.flatMap((opt) => {
    if ('viaGatekeeper' in opt._def.shape()) {
      return [true, false].map((viaGatekeeper) => ({
        result: opt._def.shape().result.value,
        viaGatekeeper,
      }));
    }
    return {
      result: opt._def.shape().result.value,
    };
  });

  return options.map(
    (opt) =>
      ({
        type: 'opening',
        openingResult: opt as OpeningCallResultNew,
      }) satisfies CallActivityResultType
  );
}

function buildCallResultOptions(callTypes: CallTypePayload[], selectedCallTypeId?: string): CallActivityResultType[] {
  const selected = selectedCallTypeId ? callTypes.find((ct) => String(ct.id) === String(selectedCallTypeId)) : undefined;
  const optionsByCategory = {
    setting: settingCallResultSchema.options.map((opt) => ({ type: 'setting', settingResult: opt }) satisfies CallActivityResultType),
    closing: closingCallResultSchema.options.map((opt) => ({ type: 'closing', closingResult: opt }) satisfies CallActivityResultType),
    opening: generateOpeningCallResults(),
  };

  if (selected?.category && optionsByCategory[selected.category as keyof typeof optionsByCategory]) {
    return optionsByCategory[selected.category as keyof typeof optionsByCategory];
  }

  return [...optionsByCategory.closing, ...optionsByCategory.opening, ...optionsByCategory.setting];
}

function toCallResultOption(option: CallActivityResultType): INodePropertyOptions {
  const type = option.type;
  switch (type) {
    case 'opening': {
      const viaGatekeeper = (option.openingResult as any).viaGatekeeper;
      const suffix = viaGatekeeper !== undefined ? ` (${viaGatekeeper ? 'via gatekeeper' : 'direct'})` : '';
      return {
        name: `${option.openingResult.result}${suffix}`,
        value: JSON.stringify(option),
      };
    }
    case 'setting':
      return {
        name: option.settingResult ?? '',
        value: JSON.stringify(option),
      };
    case 'closing':
      return {
        name: option.closingResult ?? '',
        value: JSON.stringify(option),
      };
    default:
      throw new Error(`Unsupported call activity result type: ${type}`);
    // assertUnreachable(type);
  }
}

/** Load phone call activity types from API */
export async function loadPhoneCallActivityTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  const client = getApiClient(this);
  const list = (await client.GET('/call-types')) satisfies CallTypePayload[];
  return [
    { name: 'Any Call Type', value: 'any' },
    ...(list ?? []).map((t) => ({
      name: t.category ? `${t.name} (${t.category})` : t.name,
      value: String(t.id),
    })),
  ];
}

/** Load call result types depending on selected call type (or any) */
export async function loadCallResultTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  let callTypeId = '';
  try {
    callTypeId = (this.getNodeParameter('callTypeId', 0) as string) || '';
  } catch {}
  if (!callTypeId) {
    try {
      callTypeId = (this.getNodeParameter('phoneCallActivityTypeId', 0) as string) || '';
    } catch {}
  }

  const client = getApiClient(this);
  const list = (await client.GET('/call-types')) satisfies CallTypePayload[];
  const selectedCallTypeId = callTypeId && callTypeId !== 'any' ? callTypeId : undefined;
  const options = buildCallResultOptions(list ?? [], selectedCallTypeId);
  return [{ name: 'Any Call Result', value: 'any' }, ...options.map(toCallResultOption)];
}
