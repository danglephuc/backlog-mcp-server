import { getProjectMetadataTool } from './generateProjectMetadata.js';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Backlog } from 'backlog-js';
import { createTranslationHelper } from '../createTranslationHelper.js';
import * as fs from 'node:fs/promises';

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

const mockProject = {
  id: 100,
  projectKey: 'TEST',
  name: 'Test Project',
  chartEnabled: true,
  subtaskingEnabled: true,
  projectLeaderCanEditProjectLeader: false,
  textFormattingRule: 'backlog',
  archived: false,
  displayOrder: 0,
};

const mockUsers = [
  {
    id: 1,
    userId: 'user1',
    name: 'User One',
    mailAddress: 'user1@example.com',
    roleType: 1,
    lang: 'ja',
    lastLoginTime: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    userId: 'user2',
    name: 'User Two',
    mailAddress: 'user2@example.com',
    roleType: 2,
    lang: 'en',
    lastLoginTime: '2026-01-02T00:00:00Z',
  },
];

const mockIssueTypes = [
  {
    id: 10,
    projectId: 100,
    name: 'Bug',
    color: '#990000',
    displayOrder: 0,
  },
  {
    id: 11,
    projectId: 100,
    name: 'Task',
    color: '#7ea800',
    displayOrder: 1,
  },
];

const mockPriorities = [
  { id: 2, name: 'High' },
  { id: 3, name: 'Normal' },
  { id: 4, name: 'Low' },
];

const mockCategories = [
  { id: 20, projectId: 100, name: 'Frontend', displayOrder: 0 },
  { id: 21, projectId: 100, name: 'Backend', displayOrder: 1 },
];

const mockCustomFields = [
  {
    id: 30,
    projectId: 100,
    typeId: 1,
    name: 'TextField',
    description: 'A text field',
    required: false,
    applicableIssueTypes: [],
  },
  {
    id: 31,
    projectId: 100,
    typeId: 6,
    name: 'ListField',
    description: 'A list field',
    required: true,
    applicableIssueTypes: [10],
    items: [
      { id: 1, name: 'Option A' },
      { id: 2, name: 'Option B' },
    ],
  },
];

describe('getProjectMetadataTool', () => {
  const mockTranslationHelper = createTranslationHelper();

  const createMockBacklog = (): Partial<Backlog> => ({
    getProject: vi.fn<() => Promise<any>>().mockResolvedValue(mockProject),
    getProjectUsers: vi.fn<() => Promise<any>>().mockResolvedValue(mockUsers),
    getIssueTypes: vi
      .fn<() => Promise<any>>()
      .mockResolvedValue(mockIssueTypes),
    getPriorities: vi
      .fn<() => Promise<any>>()
      .mockResolvedValue(mockPriorities),
    getCategories: vi
      .fn<() => Promise<any>>()
      .mockResolvedValue(mockCategories),
    getCustomFields: vi
      .fn<() => Promise<any>>()
      .mockResolvedValue(mockCustomFields),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('JSON return mode (no outputPath)', () => {
    it('returns metadata JSON with all aggregated project data', async () => {
      const mockBacklog = createMockBacklog();
      const tool = getProjectMetadataTool(
        mockBacklog as Backlog,
        mockTranslationHelper
      );

      const result = await tool.handler({ projectKey: 'TEST' });

      if (Array.isArray(result)) {
        throw new Error('Unexpected array result');
      }

      expect(result.last_updated).toBeDefined();
      expect(result.projectId).toBe(100);
      expect(result.projectKey).toBe('TEST');
      expect(result.issueTypes).toEqual({ Bug: 10, Task: 11 });
      expect(result.categories).toEqual({ Frontend: 20, Backend: 21 });
      expect(result.customFields).toEqual({
        TextField: {
          id: 30,
          typeId: 1,
          required: false,
          applicableIssueTypes: [],
        },
        ListField: {
          id: 31,
          typeId: 6,
          required: true,
          applicableIssueTypes: [10],
          items: { 'Option A': 1, 'Option B': 2 },
        },
      });
      expect(result.priorities).toEqual({ High: 2, Normal: 3, Low: 4 });
      expect(result.users).toEqual({ 'User One': 1, 'User Two': 2 });
      expect(result.savedTo).toBeUndefined();
    });

    it('calls all Backlog APIs with the resolved project key', async () => {
      const mockBacklog = createMockBacklog();
      const tool = getProjectMetadataTool(
        mockBacklog as Backlog,
        mockTranslationHelper
      );

      await tool.handler({ projectKey: 'TEST' });

      expect(mockBacklog.getProject).toHaveBeenCalledWith('TEST');
      expect(mockBacklog.getProjectUsers).toHaveBeenCalledWith('TEST');
      expect(mockBacklog.getIssueTypes).toHaveBeenCalledWith('TEST');
      expect(mockBacklog.getPriorities).toHaveBeenCalled();
      expect(mockBacklog.getCategories).toHaveBeenCalledWith('TEST');
      expect(mockBacklog.getCustomFields).toHaveBeenCalledWith('TEST');
    });

    it('calls Backlog APIs with project ID when provided', async () => {
      const mockBacklog = createMockBacklog();
      const tool = getProjectMetadataTool(
        mockBacklog as Backlog,
        mockTranslationHelper
      );

      await tool.handler({ projectId: 100 });

      expect(mockBacklog.getProject).toHaveBeenCalledWith(100);
      expect(mockBacklog.getProjectUsers).toHaveBeenCalledWith(100);
      expect(mockBacklog.getIssueTypes).toHaveBeenCalledWith(100);
      expect(mockBacklog.getCategories).toHaveBeenCalledWith(100);
      expect(mockBacklog.getCustomFields).toHaveBeenCalledWith(100);
    });
  });

  describe('file save mode (with outputPath)', () => {
    it('writes metadata to file and returns savedTo', async () => {
      const mockBacklog = createMockBacklog();
      const tool = getProjectMetadataTool(
        mockBacklog as Backlog,
        mockTranslationHelper
      );

      const result = await tool.handler({
        projectKey: 'TEST',
        outputPath: '/tmp/backlog/.backlog-metadata.json',
      });

      if (Array.isArray(result)) {
        throw new Error('Unexpected array result');
      }

      expect(result.savedTo).toBe('/tmp/backlog/.backlog-metadata.json');
      expect(result.projectId).toBe(100);
      expect(fs.mkdir).toHaveBeenCalledWith('/tmp/backlog', {
        recursive: true,
      });
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/tmp/backlog/.backlog-metadata.json',
        expect.stringContaining('"last_updated"')
      );
    });
  });

  it('throws an error if outputPath is not absolute', async () => {
    const mockBacklog = createMockBacklog();
    const tool = getProjectMetadataTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    await expect(
      tool.handler({
        projectKey: 'TEST',
        outputPath: 'relative/path.json',
      })
    ).rejects.toThrow('outputPath must be an absolute path');
  });

  it('throws an error if neither projectId nor projectKey is provided', async () => {
    const mockBacklog = createMockBacklog();
    const tool = getProjectMetadataTool(
      mockBacklog as Backlog,
      mockTranslationHelper
    );

    await expect(tool.handler({} as any)).rejects.toThrow(Error);
  });
});
