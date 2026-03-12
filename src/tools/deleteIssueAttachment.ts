import { z } from 'zod';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { IssueFileInfoSchema } from '../types/zod/backlogOutputDefinition.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const deleteIssueAttachmentSchema = buildToolSchema((t) => ({
  issueId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_DELETE_ISSUE_ATTACHMENT_ISSUE_ID',
        'The numeric ID of the issue (e.g., 12345)'
      )
    ),
  issueKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_DELETE_ISSUE_ATTACHMENT_ISSUE_KEY',
        "The key of the issue (e.g., 'PROJ-123')"
      )
    ),
  attachmentId: z
    .number()
    .describe(
      t(
        'TOOL_DELETE_ISSUE_ATTACHMENT_ATTACHMENT_ID',
        'The ID of the attachment to delete. Use get_issue_attachments to obtain the ID.'
      )
    ),
}));

export const deleteIssueAttachmentTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof deleteIssueAttachmentSchema>,
  (typeof IssueFileInfoSchema)['shape']
> => {
  return {
    name: 'delete_issue_attachment',
    description: t(
      'TOOL_DELETE_ISSUE_ATTACHMENT_DESCRIPTION',
      'Deletes an attachment of an issue'
    ),
    schema: z.object(deleteIssueAttachmentSchema(t)),
    outputSchema: IssueFileInfoSchema,
    handler: async ({ issueId, issueKey, attachmentId }) => {
      const result = resolveIdOrKey('issue', { id: issueId, key: issueKey }, t);
      if (!result.ok) {
        throw result.error;
      }
      // backlog-js types attachmentId as string, but the API accepts number
      return backlog.deleteIssueAttachment(result.value, String(attachmentId));
    },
  };
};
