import { z } from 'zod';
import { Backlog } from 'backlog-js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { ProjectMetadataSchema } from '../types/zod/backlogOutputDefinition.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const getProjectMetadataSchema = buildToolSchema((t) => ({
  projectId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_GET_PROJECT_METADATA_PROJECT_ID',
        'The numeric ID of the project (e.g., 12345)'
      )
    ),
  projectKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_PROJECT_METADATA_PROJECT_KEY',
        "The key of the project (e.g., 'PROJECT')"
      )
    ),
  outputPath: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_GET_PROJECT_METADATA_OUTPUT_PATH',
        'Absolute file path to save the metadata JSON to disk. When provided, the metadata is written to this file. Recommended: absolute path to <project-root>/backlog/.backlog-metadata.json (for example: /path/to/project/backlog/.backlog-metadata.json).'
      )
    ),
}));

export const getProjectMetadataTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof getProjectMetadataSchema>,
  (typeof ProjectMetadataSchema)['shape']
> => {
  return {
    name: 'get_project_metadata',
    description: t(
      'TOOL_GET_PROJECT_METADATA_DESCRIPTION',
      'Generates a comprehensive metadata snapshot for a project by aggregating project info, issue types, categories, custom fields, priorities, and members into a single JSON. Use this to cache project metadata locally and avoid repeated API calls. Optionally saves the result to a file.'
    ),
    schema: z.object(getProjectMetadataSchema(t)),
    outputSchema: ProjectMetadataSchema,
    handler: async ({ projectId, projectKey, outputPath }) => {
      const result = resolveIdOrKey(
        'project',
        { id: projectId, key: projectKey },
        t
      );
      if (!result.ok) {
        throw result.error;
      }

      if (outputPath && !path.isAbsolute(outputPath)) {
        throw new Error(
          t(
            'TOOL_GET_PROJECT_METADATA_OUTPUT_PATH_ABSOLUTE',
            'outputPath must be an absolute path'
          )
        );
      }

      const projectIdOrKey = result.value;

      const [project, users, issueTypes, priorities, categories, customFields] =
        await Promise.all([
          backlog.getProject(projectIdOrKey),
          backlog.getProjectUsers(projectIdOrKey),
          backlog.getIssueTypes(projectIdOrKey),
          backlog.getPriorities(),
          backlog.getCategories(projectIdOrKey),
          backlog.getCustomFields(projectIdOrKey),
        ]);

      const toMap = <T extends { id: number; name: string }>(items: T[]) =>
        Object.fromEntries(items.map((i) => [i.name, i.id]));

      const metadata = {
        lastUpdated: new Date().toISOString(),
        projectId: project.id,
        projectKey: project.projectKey,
        issueTypes: toMap(issueTypes),
        categories: toMap(categories),
        customFields: Object.fromEntries(
          customFields.map((cf) => [
            cf.name,
            {
              id: cf.id,
              typeId: cf.typeId,
              required: cf.required,
              applicableIssueTypes: cf.applicableIssueTypes,
              ...('items' in cf && Array.isArray(cf.items)
                ? {
                    items: Object.fromEntries(
                      cf.items.map((item: { id: number; name: string }) => [
                        item.name,
                        item.id,
                      ])
                    ),
                  }
                : {}),
            },
          ])
        ),
        priorities: toMap(priorities),
        users: Object.fromEntries(users.map((u: { id: number; userId: string }) => [u.userId, u.id])),
      };

      if (outputPath) {
        const dir = path.dirname(outputPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(outputPath, JSON.stringify(metadata, null, 2));
        return { ...metadata, savedTo: outputPath };
      }

      return metadata;
    },
  };
};
