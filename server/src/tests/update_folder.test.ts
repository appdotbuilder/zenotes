import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, foldersTable } from '../db/schema';
import { type UpdateFolderInput } from '../schema';
import { updateFolder } from '../handlers/update_folder';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  id: 'user-1',
  email: 'test@example.com',
  username: 'testuser',
  password_hash: 'hashed_password'
};

const testFolder = {
  id: 'folder-1',
  name: 'Original Folder',
  user_id: testUser.id,
  parent_folder_id: null
};

const testParentFolder = {
  id: 'parent-folder-1',
  name: 'Parent Folder',
  user_id: testUser.id,
  parent_folder_id: null
};

const testChildFolder = {
  id: 'child-folder-1',
  name: 'Child Folder',
  user_id: testUser.id,
  parent_folder_id: testFolder.id
};

describe('updateFolder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();
  });

  it('should update folder name', async () => {
    // Create test folder
    await db.insert(foldersTable).values(testFolder).execute();

    const input: UpdateFolderInput = {
      id: testFolder.id,
      name: 'Updated Folder Name'
    };

    const result = await updateFolder(input);

    expect(result.id).toEqual(testFolder.id);
    expect(result.name).toEqual('Updated Folder Name');
    expect(result.user_id).toEqual(testUser.id);
    expect(result.parent_folder_id).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify in database
    const folders = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, testFolder.id))
      .execute();

    expect(folders).toHaveLength(1);
    expect(folders[0].name).toEqual('Updated Folder Name');
  });

  it('should update folder parent', async () => {
    // Create test folders
    await db.insert(foldersTable).values([testFolder, testParentFolder]).execute();

    const input: UpdateFolderInput = {
      id: testFolder.id,
      parent_folder_id: testParentFolder.id
    };

    const result = await updateFolder(input);

    expect(result.id).toEqual(testFolder.id);
    expect(result.name).toEqual(testFolder.name);
    expect(result.parent_folder_id).toEqual(testParentFolder.id);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify in database
    const folders = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, testFolder.id))
      .execute();

    expect(folders).toHaveLength(1);
    expect(folders[0].parent_folder_id).toEqual(testParentFolder.id);
  });

  it('should update both name and parent', async () => {
    // Create test folders
    await db.insert(foldersTable).values([testFolder, testParentFolder]).execute();

    const input: UpdateFolderInput = {
      id: testFolder.id,
      name: 'New Name',
      parent_folder_id: testParentFolder.id
    };

    const result = await updateFolder(input);

    expect(result.name).toEqual('New Name');
    expect(result.parent_folder_id).toEqual(testParentFolder.id);
  });

  it('should set parent to null', async () => {
    // Create test folders with initial parent relationship
    await db.insert(foldersTable).values([testParentFolder]).execute();
    await db.insert(foldersTable).values([{
      ...testFolder,
      parent_folder_id: testParentFolder.id
    }]).execute();

    const input: UpdateFolderInput = {
      id: testFolder.id,
      parent_folder_id: null
    };

    const result = await updateFolder(input);

    expect(result.parent_folder_id).toBeNull();

    // Verify in database
    const folders = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, testFolder.id))
      .execute();

    expect(folders[0].parent_folder_id).toBeNull();
  });

  it('should throw error when folder not found', async () => {
    const input: UpdateFolderInput = {
      id: 'non-existent-folder',
      name: 'New Name'
    };

    await expect(updateFolder(input)).rejects.toThrow(/folder not found/i);
  });

  it('should prevent direct circular reference (self-parent)', async () => {
    // Create test folder
    await db.insert(foldersTable).values(testFolder).execute();

    const input: UpdateFolderInput = {
      id: testFolder.id,
      parent_folder_id: testFolder.id
    };

    await expect(updateFolder(input)).rejects.toThrow(/cannot set folder as its own parent/i);
  });

  it('should prevent indirect circular reference', async () => {
    // Create folder hierarchy: parent -> child -> grandchild
    const grandchildFolder = {
      id: 'grandchild-folder-1',
      name: 'Grandchild Folder',
      user_id: testUser.id,
      parent_folder_id: testChildFolder.id
    };

    await db.insert(foldersTable).values([
      testParentFolder,
      { ...testChildFolder, parent_folder_id: testParentFolder.id },
      grandchildFolder
    ]).execute();

    // Try to make parent folder a child of grandchild (would create cycle)
    const input: UpdateFolderInput = {
      id: testParentFolder.id,
      parent_folder_id: grandchildFolder.id
    };

    await expect(updateFolder(input)).rejects.toThrow(/circular reference/i);
  });

  it('should throw error when parent folder does not exist', async () => {
    // Create test folder
    await db.insert(foldersTable).values(testFolder).execute();

    const input: UpdateFolderInput = {
      id: testFolder.id,
      parent_folder_id: 'non-existent-parent'
    };

    await expect(updateFolder(input)).rejects.toThrow(/parent folder not found/i);
  });

  it('should update timestamps correctly', async () => {
    // Create test folder
    await db.insert(foldersTable).values(testFolder).execute();

    // Get original timestamp
    const originalFolders = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, testFolder.id))
      .execute();
    const originalUpdatedAt = originalFolders[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateFolderInput = {
      id: testFolder.id,
      name: 'Updated Name'
    };

    const result = await updateFolder(input);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should handle complex folder hierarchy without issues', async () => {
    // Create a complex hierarchy
    const folder1 = { id: 'f1', name: 'Folder 1', user_id: testUser.id, parent_folder_id: null };
    const folder2 = { id: 'f2', name: 'Folder 2', user_id: testUser.id, parent_folder_id: 'f1' };
    const folder3 = { id: 'f3', name: 'Folder 3', user_id: testUser.id, parent_folder_id: 'f2' };
    const folder4 = { id: 'f4', name: 'Folder 4', user_id: testUser.id, parent_folder_id: null };

    await db.insert(foldersTable).values([folder1, folder2, folder3, folder4]).execute();

    // Move folder3 to be under folder4 (valid operation)
    const input: UpdateFolderInput = {
      id: 'f3',
      parent_folder_id: 'f4'
    };

    const result = await updateFolder(input);

    expect(result.parent_folder_id).toEqual('f4');

    // Verify the hierarchy is correct
    const folders = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, 'f3'))
      .execute();

    expect(folders[0].parent_folder_id).toEqual('f4');
  });
});