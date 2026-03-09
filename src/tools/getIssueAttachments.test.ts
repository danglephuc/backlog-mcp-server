import { getIssueAttachmentsTool } from './getIssueAttachments.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('getIssueAttachmentsTool', () => {
  const mockAttachments = [
    {
      id: 8,
      name: 'IMG0088.png',
      size: 5563,
      createdUser: {
        id: 1,
        userId: 'admin',
        name: 'Admin User',
        roleType: 1,
        lang: 'en',
        mailAddress: 'admin@example.com',
        lastLoginTime: '2023-01-01T00:00:00Z',
      },
      created: '2023-01-01T00:00:00Z',
    },
    {
      id: 9,
      name: 'document.pdf',
      size: 102400,
      createdUser: {
        id: 2,
        userId: 'user',
        name: 'Test User',
        roleType: 2,
        lang: 'en',
        mailAddress: 'test@example.com',
        lastLoginTime: '2023-01-02T00:00:00Z',
      },
      created: '2023-01-02T00:00:00Z',
    },
  ];

  const mockBacklog: Partial<Backlog> = {
    getIssueAttachments: vi
      .fn<() => Promise<any>>()
      .mockResolvedValue(mockAttachments),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = getIssueAttachmentsTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('returns issue attachments using issue key', async () => {
    const result = await tool.handler({
      issueKey: 'TEST-1',
    });

    if (!Array.isArray(result)) {
      throw new Error('Unexpected non array result');
    }

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('name', 'IMG0088.png');
    expect(result[1]).toHaveProperty('name', 'document.pdf');
  });

  it('calls backlog.getIssueAttachments with issue key', async () => {
    await tool.handler({
      issueKey: 'TEST-1',
    });

    expect(mockBacklog.getIssueAttachments).toHaveBeenCalledWith('TEST-1');
  });

  it('calls backlog.getIssueAttachments with issue ID', async () => {
    await tool.handler({
      issueId: 12345,
    });

    expect(mockBacklog.getIssueAttachments).toHaveBeenCalledWith(12345);
  });

  it('throws an error if neither issueId nor issueKey is provided', async () => {
    await expect(tool.handler({})).rejects.toThrow(Error);
  });
});
