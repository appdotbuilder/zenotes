import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, foldersTable, notesTable } from '../db/schema';
import { type DeleteFolderInput } from '../schema';
import { deleteFolder } from '../handlers/delete_folder';
import { eq, and } from 'drizzle-orm';

// Test data
const testUser = {
  id: 'user-1',
  email: 'test@example.com',
  username: 'testuser',
  password_hash: 'hashed_password'
};

const testInput: DeleteFolderInput = {
  id: 'folder-1',
  user_id: 'user-1'
};

describe('deleteFolder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a folder successfully', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    // Create test folder
    await db.insert(foldersTable).values({
      id: 'folder-1',
      name: 'Test Folder',
      user_id: 'user-1',
      parent_folder_id: null
    }).execute();

    const result = await deleteFolder(testInput);

    expect(result.success).toBe(true);

    // Verify folder is deleted
    const folders = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, 'folder-1'))
      .execute();

    expect(folders).toHaveLength(0);
  });

  it('should move notes to parent folder when deleting folder', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    // Create parent folder
    await db.insert(foldersTable).values({
      id: 'parent-folder',
      name: 'Parent Folder',
      user_id: 'user-1',
      parent_folder_id: null
    }).execute();

    // Create folder to delete
    await db.insert(foldersTable).values({
      id: 'folder-1',
      name: 'Test Folder',
      user_id: 'user-1',
      parent_folder_id: 'parent-folder'
    }).execute();

    // Create note in the folder to be deleted
    await db.insert(notesTable).values({
      id: 'note-1',
      title: 'Test Note',
      content: 'Test content',
      user_id: 'user-1',
      folder_id: 'folder-1',
      is_favorite: false
    }).execute();

    const result = await deleteFolder(testInput);

    expect(result.success).toBe(true);

    // Verify note is moved to parent folder
    const notes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, 'note-1'))
      .execute();

    expect(notes).toHaveLength(1);
    expect(notes[0].folder_id).toBe('parent-folder');
  });

  it('should move notes to null when deleting root folder', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    // Create root folder to delete
    await db.insert(foldersTable).values({
      id: 'folder-1',
      name: 'Root Folder',
      user_id: 'user-1',
      parent_folder_id: null
    }).execute();

    // Create note in the folder to be deleted
    await db.insert(notesTable).values({
      id: 'note-1',
      title: 'Test Note',
      content: 'Test content',
      user_id: 'user-1',
      folder_id: 'folder-1',
      is_favorite: false
    }).execute();

    const result = await deleteFolder(testInput);

    expect(result.success).toBe(true);

    // Verify note is moved to null (no folder)
    const notes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, 'note-1'))
      .execute();

    expect(notes).toHaveLength(1);
    expect(notes[0].folder_id).toBe(null);
  });

  it('should move subfolders to parent folder when deleting folder', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    // Create parent folder
    await db.insert(foldersTable).values({
      id: 'parent-folder',
      name: 'Parent Folder',
      user_id: 'user-1',
      parent_folder_id: null
    }).execute();

    // Create folder to delete
    await db.insert(foldersTable).values({
      id: 'folder-1',
      name: 'Test Folder',
      user_id: 'user-1',
      parent_folder_id: 'parent-folder'
    }).execute();

    // Create subfolder
    await db.insert(foldersTable).values({
      id: 'subfolder-1',
      name: 'Sub Folder',
      user_id: 'user-1',
      parent_folder_id: 'folder-1'
    }).execute();

    const result = await deleteFolder(testInput);

    expect(result.success).toBe(true);

    // Verify subfolder is moved to parent
    const subfolders = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, 'subfolder-1'))
      .execute();

    expect(subfolders).toHaveLength(1);
    expect(subfolders[0].parent_folder_id).toBe('parent-folder');
  });

  it('should move subfolders to null when deleting root folder', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    // Create root folder to delete
    await db.insert(foldersTable).values({
      id: 'folder-1',
      name: 'Root Folder',
      user_id: 'user-1',
      parent_folder_id: null
    }).execute();

    // Create subfolder
    await db.insert(foldersTable).values({
      id: 'subfolder-1',
      name: 'Sub Folder',
      user_id: 'user-1',
      parent_folder_id: 'folder-1'
    }).execute();

    const result = await deleteFolder(testInput);

    expect(result.success).toBe(true);

    // Verify subfolder becomes root folder
    const subfolders = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, 'subfolder-1'))
      .execute();

    expect(subfolders).toHaveLength(1);
    expect(subfolders[0].parent_folder_id).toBe(null);
  });

  it('should handle folder with both notes and subfolders', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    // Create parent folder
    await db.insert(foldersTable).values({
      id: 'parent-folder',
      name: 'Parent Folder',
      user_id: 'user-1',
      parent_folder_id: null
    }).execute();

    // Create folder to delete
    await db.insert(foldersTable).values({
      id: 'folder-1',
      name: 'Test Folder',
      user_id: 'user-1',
      parent_folder_id: 'parent-folder'
    }).execute();

    // Create note and subfolder
    await db.insert(notesTable).values({
      id: 'note-1',
      title: 'Test Note',
      content: 'Test content',
      user_id: 'user-1',
      folder_id: 'folder-1',
      is_favorite: false
    }).execute();

    await db.insert(foldersTable).values({
      id: 'subfolder-1',
      name: 'Sub Folder',
      user_id: 'user-1',
      parent_folder_id: 'folder-1'
    }).execute();

    const result = await deleteFolder(testInput);

    expect(result.success).toBe(true);

    // Verify both note and subfolder are moved to parent
    const notes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, 'note-1'))
      .execute();
    
    const subfolders = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, 'subfolder-1'))
      .execute();

    expect(notes[0].folder_id).toBe('parent-folder');
    expect(subfolders[0].parent_folder_id).toBe('parent-folder');
  });

  it('should throw error when folder does not exist', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    const input: DeleteFolderInput = {
      id: 'non-existent-folder',
      user_id: 'user-1'
    };

    await expect(deleteFolder(input)).rejects.toThrow(/folder not found or access denied/i);
  });

  it('should throw error when user does not own folder', async () => {
    // Create test users
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(usersTable).values({
      id: 'user-2',
      email: 'other@example.com',
      username: 'otheruser',
      password_hash: 'hashed_password'
    }).execute();

    // Create folder owned by user-2
    await db.insert(foldersTable).values({
      id: 'folder-1',
      name: 'Other User Folder',
      user_id: 'user-2',
      parent_folder_id: null
    }).execute();

    // Try to delete as user-1
    const input: DeleteFolderInput = {
      id: 'folder-1',
      user_id: 'user-1'
    };

    await expect(deleteFolder(input)).rejects.toThrow(/folder not found or access denied/i);

    // Verify folder still exists
    const folders = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, 'folder-1'))
      .execute();

    expect(folders).toHaveLength(1);
  });

  it('should handle empty folder deletion', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    // Create empty folder
    await db.insert(foldersTable).values({
      id: 'folder-1',
      name: 'Empty Folder',
      user_id: 'user-1',
      parent_folder_id: null
    }).execute();

    const result = await deleteFolder(testInput);

    expect(result.success).toBe(true);

    // Verify folder is deleted
    const folders = await db.select()
      .from(foldersTable)
      .where(eq(foldersTable.id, 'folder-1'))
      .execute();

    expect(folders).toHaveLength(0);
  });
});