import { Buffer } from 'node:buffer';
import { downloadIssueAttachmentTool } from './downloadIssueAttachment.js';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';
import { PassThrough } from 'node:stream';
import * as fs from 'node:fs';

vi.mock('node:fs', () => ({
  createWriteStream: vi.fn(),
}));

describe('downloadIssueAttachmentTool', () => {
  const mockTranslationHelper = createTranslationHelper();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('base64 mode (no outputPath)', () => {
    it('returns base64-encoded content when no outputPath is provided', async () => {
      const stream = new PassThrough();
      const testContent = 'Hello, World!';
      stream.end(Buffer.from(testContent));

      const mockBacklog: Partial<Backlog> = {
        getIssueAttachment: vi
          .fn<() => Promise<any>>()
          .mockResolvedValue({
            body: stream,
            url: 'https://example.com/attachment',
            filename: 'test.txt',
          }),
      };

      const tool = downloadIssueAttachmentTool(
        mockBacklog as Backlog,
        mockTranslationHelper
      );

      const result = await tool.handler({
        issueKey: 'TEST-1',
        attachmentId: 8,
      });

      expect(result).toEqual({
        filename: 'test.txt',
        size: testContent.length,
        base64Content: Buffer.from(testContent).toString('base64'),
      });
      expect(mockBacklog.getIssueAttachment).toHaveBeenCalledWith('TEST-1', 8);
    });
  });

  describe('file save mode (with outputPath)', () => {
    it('streams content to disk when outputPath is provided', async () => {
      const stream = new PassThrough();
      const testContent = 'File content to save';
      stream.end(Buffer.from(testContent));

      const mockWriteStream = new PassThrough();
      vi.mocked(fs.createWriteStream).mockReturnValue(
        mockWriteStream as any
      );

      const mockBacklog: Partial<Backlog> = {
        getIssueAttachment: vi
          .fn<() => Promise<any>>()
          .mockResolvedValue({
            body: stream,
            url: 'https://example.com/attachment',
            filename: 'report.pdf',
          }),
      };

      const tool = downloadIssueAttachmentTool(
        mockBacklog as Backlog,
        mockTranslationHelper
      );

      const result = await tool.handler({
        issueId: 12345,
        attachmentId: 10,
        outputPath: '/tmp/report.pdf',
      });

      expect(result).toEqual({
        filename: 'report.pdf',
        savedTo: '/tmp/report.pdf',
      });
      expect(fs.createWriteStream).toHaveBeenCalledWith('/tmp/report.pdf');
    });
  });

  it('throws an error if outputPath is not absolute', async () => {
    const mockBacklog: Partial<Backlog> = {
      getIssueAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        body: new PassThrough(),
        url: '',
        filename: '',
      }),
    };

    const tool = downloadIssueAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    await expect(
      tool.handler({
        issueKey: 'TEST-1',
        attachmentId: 8,
        outputPath: 'relative/path.txt',
      })
    ).rejects.toThrow('outputPath must be an absolute path');
  });

  it('throws an error if neither issueId nor issueKey is provided', async () => {
    const mockBacklog: Partial<Backlog> = {
      getIssueAttachment: vi.fn<() => Promise<any>>().mockResolvedValue({
        body: new PassThrough(),
        url: '',
        filename: '',
      }),
    };

    const tool = downloadIssueAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    await expect(
      tool.handler({ attachmentId: 8 })
    ).rejects.toThrow(Error);
  });
});
