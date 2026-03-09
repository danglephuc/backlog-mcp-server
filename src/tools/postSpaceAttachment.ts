import { z } from 'zod';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Backlog } from 'backlog-js';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { SpaceFileInfoSchema } from '../types/zod/backlogOutputDefinition.js';

const postSpaceAttachmentSchema = buildToolSchema((t) => ({
  filePath: z
    .string()
    .describe(
      t(
        'TOOL_POST_SPACE_ATTACHMENT_FILE_PATH',
        'Absolute file path on the server to upload. The file will be read from disk and uploaded to the Backlog space. The returned ID can then be used as attachmentId when creating or updating issues.'
      )
    ),
}));

export const postSpaceAttachmentTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof postSpaceAttachmentSchema>,
  (typeof SpaceFileInfoSchema)['shape']
> => {
  return {
    name: 'post_space_attachment',
    description: t(
      'TOOL_POST_SPACE_ATTACHMENT_DESCRIPTION',
      'Uploads an attachment file for issue or wiki. Returns id of the attachment file. The file will be deleted after it has been attached. If attachment fails, the file will be deleted an hour later. Use the returned id as attachmentId when creating or updating issues.'
    ),
    schema: z.object(postSpaceAttachmentSchema(t)),
    outputSchema: SpaceFileInfoSchema,
    importantFields: ['id', 'name', 'size'],
    handler: async ({ filePath: inputFilePath }) => {
      if (!path.isAbsolute(inputFilePath)) {
        throw new Error(
          t(
            'TOOL_POST_SPACE_ATTACHMENT_FILE_PATH_ABSOLUTE',
            'filePath must be an absolute path'
          )
        );
      }

      if (!fs.existsSync(inputFilePath)) {
        throw new Error(
          t(
            'TOOL_POST_SPACE_ATTACHMENT_FILE_NOT_FOUND',
            `File not found: ${inputFilePath}`
          )
        );
      }

      const fileName = path.basename(inputFilePath);
      const fileBuffer = fs.readFileSync(inputFilePath);
      const blob = new Blob([fileBuffer]);

      const form = new FormData();
      form.append('file', blob, fileName);

      return backlog.postSpaceAttachment(form);
    },
  };
};
