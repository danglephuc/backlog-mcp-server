import { Buffer } from 'node:buffer';
import { postSpaceAttachmentTool } from './postSpaceAttachment.js';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';
import * as fs from 'node:fs';

vi.mock('node:fs', () => ({
  promises: {
    access: vi.fn(),
    readFile: vi.fn(),
  },
}));

describe('postSpaceAttachmentTool', () => {
  const mockTranslationHelper = createTranslationHelper();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads a file and returns file info', async () => {
    const mockResponse = {
      id: 1,
      name: 'test.txt',
      size: 8857,
    };

    const mockBacklog: Partial<Backlog> = {
      postSpaceAttachment: vi
        .fn<() => Promise<any>>()
        .mockResolvedValue(mockResponse),
    };

    vi.mocked(fs.promises.access).mockResolvedValue(undefined);
    vi.mocked(fs.promises.readFile).mockResolvedValue(
      Buffer.from('file content') as any
    );

    const tool = postSpaceAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({
      filePath: '/tmp/test.txt',
    });

    expect(result).toEqual(mockResponse);
    expect(fs.promises.access).toHaveBeenCalledWith('/tmp/test.txt');
    expect(fs.promises.readFile).toHaveBeenCalledWith('/tmp/test.txt');
    expect(mockBacklog.postSpaceAttachment).toHaveBeenCalledWith(
      expect.any(FormData)
    );
  });

  it('throws an error if filePath is not absolute', async () => {
    const mockBacklog: Partial<Backlog> = {
      postSpaceAttachment: vi.fn<() => Promise<any>>(),
    };

    const tool = postSpaceAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    await expect(
      tool.handler({ filePath: 'relative/path.txt' })
    ).rejects.toThrow('filePath must be an absolute path');
  });

  it('throws an error if file does not exist', async () => {
    vi.mocked(fs.promises.access).mockRejectedValue(new Error('ENOENT'));

    const mockBacklog: Partial<Backlog> = {
      postSpaceAttachment: vi.fn<() => Promise<any>>(),
    };

    const tool = postSpaceAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    await expect(
      tool.handler({ filePath: '/tmp/nonexistent.txt' })
    ).rejects.toThrow('File not found');
  });
});
