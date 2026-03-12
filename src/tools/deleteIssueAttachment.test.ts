import { deleteIssueAttachmentTool } from './deleteIssueAttachment.js';
import { vi, describe, it, expect } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';

describe('deleteIssueAttachmentTool', () => {
  const mockDeletedAttachment = {
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
  };

  const mockBacklog: Partial<Backlog> = {
    deleteIssueAttachment: vi
      .fn<() => Promise<any>>()
      .mockResolvedValue(mockDeletedAttachment),
  };

  const mockTranslationHelper = createTranslationHelper();
  const tool = deleteIssueAttachmentTool(
    mockBacklog as Backlog,
    mockTranslationHelper
  );

  it('deletes an issue attachment using issue key', async () => {
    const result = await tool.handler({
      issueKey: 'TEST-1',
      attachmentId: 8,
    });

    expect(result).toEqual(mockDeletedAttachment);
    expect(mockBacklog.deleteIssueAttachment).toHaveBeenCalledWith(
      'TEST-1',
      '8'
    );
  });

  it('deletes an issue attachment using issue ID', async () => {
    await tool.handler({
      issueId: 12345,
      attachmentId: 8,
    });

    expect(mockBacklog.deleteIssueAttachment).toHaveBeenCalledWith(12345, '8');
  });

  it('throws an error if neither issueId nor issueKey is provided', async () => {
    await expect(tool.handler({ attachmentId: 8 })).rejects.toThrow(Error);
  });
});
