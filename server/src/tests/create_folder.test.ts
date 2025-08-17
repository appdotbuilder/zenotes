import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { foldersTable, usersTable } from '../db/schema';
import { type CreateFolderInput } from '../schema';
import { createFolder } from '../handlers/create_folder';
import { eq, and } from 'drizzle-orm';

// Test user data
const testUser = {
  id: crypto.randomUUID(),
  email: 'test@example.com',
  username: 'testuser',
  password_hash: 'hashedpassword123'
};

// Simple test input
const testInput: CreateFolderInput = {
  name: 'Test Folder',
  user_id: testUser.id,
  parent_folder_id: null
};

describe('createFolder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a folder', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await createFolder(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Folder');
    expect(result.user_id).toEqual(testUser.id);
    expect(result.parent_folder_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toEqual('string');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save folder to database', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await createFolder(testInput);

    // Query database to verify folder was saved
    const folders = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, result.id))
      .execute();

    expect(folders).toHaveLength(1);
    expect(folders[0].name).toEqual('Test Folder');
    expect(folders[0].user_id).toEqual(testUser.id);
    expect(folders[0].parent_folder_id).toBeNull();
    expect(folders[0].created_at).toBeInstanceOf(Date);
    expect(folders[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create folder with parent folder', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Create parent folder first
    const parentFolderId = crypto.randomUUID();
    await db.insert(foldersTable)
      .values({
        id: parentFolderId,
        name: 'Parent Folder',
        user_id: testUser.id,
        parent_folder_id: null
      })
      .execute();

    // Create child folder
    const childInput: CreateFolderInput = {
      name: 'Child Folder',
      user_id: testUser.id,
      parent_folder_id: parentFolderId
    };

    const result = await createFolder(childInput);

    expect(result.name).toEqual('Child Folder');
    expect(result.user_id).toEqual(testUser.id);
    expect(result.parent_folder_id).toEqual(parentFolderId);

    // Verify in database
    const folders = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, result.id))
      .execute();

    expect(folders).toHaveLength(1);
    expect(folders[0].parent_folder_id).toEqual(parentFolderId);
  });

  it('should throw error when user does not exist', async () => {
    const invalidInput: CreateFolderInput = {
      name: 'Test Folder',
      user_id: 'nonexistent-user-id',
      parent_folder_id: null
    };

    await expect(createFolder(invalidInput)).rejects.toThrow(/User not found/i);
  });

  it('should throw error when parent folder does not exist', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const invalidInput: CreateFolderInput = {
      name: 'Test Folder',
      user_id: testUser.id,
      parent_folder_id: 'nonexistent-folder-id'
    };

    await expect(createFolder(invalidInput)).rejects.toThrow(/Parent folder not found/i);
  });

  it('should throw error when parent folder belongs to different user', async () => {
    // Create two test users
    const otherUser = {
      id: crypto.randomUUID(),
      email: 'other@example.com',
      username: 'otheruser',
      password_hash: 'hashedpassword456'
    };

    await db.insert(usersTable)
      .values([testUser, otherUser])
      .execute();

    // Create folder owned by other user
    const otherUserFolderId = crypto.randomUUID();
    await db.insert(foldersTable)
      .values({
        id: otherUserFolderId,
        name: 'Other User Folder',
        user_id: otherUser.id,
        parent_folder_id: null
      })
      .execute();

    // Try to create folder with parent owned by different user
    const invalidInput: CreateFolderInput = {
      name: 'Test Folder',
      user_id: testUser.id,
      parent_folder_id: otherUserFolderId
    };

    await expect(createFolder(invalidInput)).rejects.toThrow(/Parent folder not found or does not belong to user/i);
  });

  it('should handle nested folder creation correctly', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Create root folder
    const rootFolder = await createFolder({
      name: 'Root Folder',
      user_id: testUser.id,
      parent_folder_id: null
    });

    // Create level 1 folder
    const level1Folder = await createFolder({
      name: 'Level 1 Folder',
      user_id: testUser.id,
      parent_folder_id: rootFolder.id
    });

    // Create level 2 folder
    const level2Folder = await createFolder({
      name: 'Level 2 Folder',
      user_id: testUser.id,
      parent_folder_id: level1Folder.id
    });

    // Verify hierarchy
    expect(rootFolder.parent_folder_id).toBeNull();
    expect(level1Folder.parent_folder_id).toEqual(rootFolder.id);
    expect(level2Folder.parent_folder_id).toEqual(level1Folder.id);

    // Verify all folders exist in database with correct relationships
    const allFolders = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.user_id, testUser.id))
      .execute();

    expect(allFolders).toHaveLength(3);

    const rootInDb = allFolders.find(f => f.id === rootFolder.id);
    const level1InDb = allFolders.find(f => f.id === level1Folder.id);
    const level2InDb = allFolders.find(f => f.id === level2Folder.id);

    expect(rootInDb?.parent_folder_id).toBeNull();
    expect(level1InDb?.parent_folder_id).toEqual(rootFolder.id);
    expect(level2InDb?.parent_folder_id).toEqual(level1Folder.id);
  });

  it('should create multiple folders with same name for same user', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Create two folders with same name
    const folder1 = await createFolder({
      name: 'Duplicate Name',
      user_id: testUser.id,
      parent_folder_id: null
    });

    const folder2 = await createFolder({
      name: 'Duplicate Name',
      user_id: testUser.id,
      parent_folder_id: null
    });

    // Both should be created successfully with different IDs
    expect(folder1.name).toEqual('Duplicate Name');
    expect(folder2.name).toEqual('Duplicate Name');
    expect(folder1.id).not.toEqual(folder2.id);

    // Verify both exist in database
    const folders = await db.select()
      .from(foldersTable)
      .where(and(
        eq(foldersTable.user_id, testUser.id),
        eq(foldersTable.name, 'Duplicate Name')
      ))
      .execute();

    expect(folders).toHaveLength(2);
  });
});