import { Buffer } from 'node:buffer';
import { postSpaceAttachmentTool } from './postSpaceAttachment.js';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';
import * as fs from 'node:fs';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
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

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      Buffer.from('file content')
    );

    const tool = postSpaceAttachmentTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    const result = await tool.handler({
      filePath: '/tmp/test.txt',
    });

    expect(result).toEqual(mockResponse);
    expect(fs.existsSync).toHaveBeenCalledWith('/tmp/test.txt');
    expect(fs.readFileSync).toHaveBeenCalledWith('/tmp/test.txt');
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
    vi.mocked(fs.existsSync).mockReturnValue(false);

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
