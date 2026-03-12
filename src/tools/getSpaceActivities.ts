import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { ActivitySchema } from '../types/zod/backlogOutputDefinition.js';

const getSpaceActivitiesSchema = buildToolSchema((t) => ({
  activityTypeId: z
    // NOTE: Antigravity's function-calling schema validation rejects `enum` for non-string items.
    // `z.nativeEnum({ ...numeric })` becomes a numeric enum in JSON schema, so we accept numbers
    // and describe the allowed values in text instead.
    .array(z.number().int())
    .optional()
    .describe(
      t('TOOL_GET_SPACE_ACTIVITIES_ACTIVITY_TYPE_ID', 'Activity type IDs')
    ),
  minId: z
    .number()
    .optional()
    .describe(t('TOOL_GET_SPACE_ACTIVITIES_MIN_ID', 'Minimum activity ID')),
  maxId: z
    .number()
    .optional()
    .describe(t('TOOL_GET_SPACE_ACTIVITIES_MAX_ID', 'Maximum activity ID')),
  count: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe(
      t('TOOL_GET_SPACE_ACTIVITIES_COUNT', 'Number of activities to retrieve')
    ),
  order: z
    .enum(['asc', 'desc'])
    .optional()
    .describe(t('TOOL_GET_SPACE_ACTIVITIES_ORDER', 'Sort order')),
}));

export const getSpaceActivitiesTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getSpaceActivitiesSchema>,
  (typeof ActivitySchema)['shape']
> => {
  return {
    name: 'get_space_activities',
    description: t(
      'TOOL_GET_SPACE_ACTIVITIES_DESCRIPTION',
      'Returns list of space activities'
    ),
    schema: z.object(getSpaceActivitiesSchema(t)),
    outputSchema: ActivitySchema,
    handler: async ({ activityTypeId, minId, maxId, count, order }) =>
      backlog.getSpaceActivities({
        activityTypeId,
        minId,
        maxId,
        count,
        order,
      }),
  };
};
