import { z } from 'zod';
import { Buffer } from 'node:buffer';
import { Backlog } from 'backlog-js';
import * as fs from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable, Writable } from 'node:stream';
import { buildToolSchema, ToolDefinition } from '../types/tool.js';
import { TranslationHelper } from '../createTranslationHelper.js';
import { DownloadedAttachmentSchema } from '../types/zod/backlogOutputDefinition.js';
import { resolveIdOrKey } from '../utils/resolveIdOrKey.js';

const downloadIssueAttachmentSchema = buildToolSchema((t) => ({
  issueId: z
    .number()
    .optional()
    .describe(
      t(
        'TOOL_DOWNLOAD_ISSUE_ATTACHMENT_ISSUE_ID',
        'The numeric ID of the issue (e.g., 12345)'
      )
    ),
  issueKey: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_DOWNLOAD_ISSUE_ATTACHMENT_ISSUE_KEY',
        "The key of the issue (e.g., 'PROJ-123')"
      )
    ),
  attachmentId: z
    .number()
    .describe(
      t(
        'TOOL_DOWNLOAD_ISSUE_ATTACHMENT_ATTACHMENT_ID',
        'The ID of the attachment to download. Use get_issue_attachments to obtain the ID.'
      )
    ),
  outputPath: z
    .string()
    .optional()
    .describe(
      t(
        'TOOL_DOWNLOAD_ISSUE_ATTACHMENT_OUTPUT_PATH',
        'Absolute file path to save the attachment directly to disk. When provided, the file is streamed to disk instead of being returned as base64. Recommended for large files.'
      )
    ),
}));

/**
 * Collects a ReadableStream or Node Readable into a Buffer.
 */
async function streamToBuffer(
  body: ReadableStream<Uint8Array> | NodeJS.ReadableStream
): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  if ('getReader' in body) {
    // Web ReadableStream
    const reader = body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
  } else {
    // Node Readable stream
    for await (const chunk of body) {
      chunks.push(
        typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Uint8Array)
      );
    }
  }
  return Buffer.concat(chunks);
}

/**
 * Pipes a ReadableStream or Node Readable to a file write stream.
 */
async function streamToFile(
  body: ReadableStream<Uint8Array> | NodeJS.ReadableStream,
  outputPath: string
): Promise<void> {
  const writeStream = fs.createWriteStream(outputPath);
  if ('getReader' in body) {
    // Convert Web ReadableStream to Node Readable
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodeReadable = Readable.fromWeb(body as any);
    await pipeline(nodeReadable, writeStream as unknown as Writable);
  } else {
    // Node Readable stream
    await pipeline(body as NodeJS.ReadableStream, writeStream);
  }
}

export const downloadIssueAttachmentTool = (
  backlog: Backlog,
  { t }: TranslationHelper
): ToolDefinition<
  ReturnType<typeof downloadIssueAttachmentSchema>,
  (typeof DownloadedAttachmentSchema)['shape']
> => {
  return {
    name: 'download_issue_attachment',
    description: t(
      'TOOL_DOWNLOAD_ISSUE_ATTACHMENT_DESCRIPTION',
      'Downloads an attachment file from an issue. Use get_issue_attachments first to obtain the attachment ID. By default returns the file as base64-encoded content. If outputPath is provided, streams the file directly to disk (recommended for large files) and returns a success confirmation instead.'
    ),
    schema: z.object(downloadIssueAttachmentSchema(t)),
    outputSchema: DownloadedAttachmentSchema,
    handler: async ({ issueId, issueKey, attachmentId, outputPath }) => {
      const result = resolveIdOrKey('issue', { id: issueId, key: issueKey }, t);
      if (!result.ok) {
        throw result.error;
      }

      if (outputPath && !outputPath.startsWith('/')) {
        throw new Error(
          t(
            'TOOL_DOWNLOAD_ISSUE_ATTACHMENT_OUTPUT_PATH_ABSOLUTE',
            'outputPath must be an absolute path'
          )
        );
      }

      const fileData = await backlog.getIssueAttachment(
        result.value,
        attachmentId
      );

      const filename = ('filename' in fileData ? fileData.filename : '') as string;
      const body = fileData.body as
        | ReadableStream<Uint8Array>
        | NodeJS.ReadableStream;

      if (outputPath) {
        await streamToFile(body, outputPath);
        return {
          filename,
          savedTo: outputPath,
        };
      }

      const buffer = await streamToBuffer(body);
      return {
        filename,
        size: buffer.length,
        base64Content: buffer.toString('base64'),
      };
    },
  };
};
