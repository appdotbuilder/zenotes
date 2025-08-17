import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, foldersTable, tagsTable, notesTable, noteTagsTable } from '../db/schema';
import { type GetUserNotesInput } from '../schema';
import { getUserNotes } from '../handlers/get_user_notes';

describe('getUserNotes', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  const testUser = {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    password_hash: 'hashed_password'
  };

  const testFolder = {
    id: 'folder-1',
    name: 'Test Folder',
    user_id: 'user-1',
    parent_folder_id: null
  };

  const testTag = {
    id: 'tag-1',
    name: 'Important',
    color: '#ff0000',
    user_id: 'user-1'
  };

  const testNotes = [
    {
      id: 'note-1',
      title: 'First Note',
      content: 'This is the first note content',
      markdown_content: null,
      user_id: 'user-1',
      folder_id: 'folder-1',
      is_favorite: true
    },
    {
      id: 'note-2',
      title: 'Second Note',
      content: 'This is the second note content',
      markdown_content: null,
      user_id: 'user-1',
      folder_id: null,
      is_favorite: false
    },
    {
      id: 'note-3',
      title: 'Important Task',
      content: 'Remember to complete this task',
      markdown_content: null,
      user_id: 'user-1',
      folder_id: 'folder-1',
      is_favorite: true
    }
  ];

  const setupTestData = async () => {
    // Create user
    await db.insert(usersTable).values(testUser).execute();
    
    // Create folder
    await db.insert(foldersTable).values(testFolder).execute();
    
    // Create tag
    await db.insert(tagsTable).values(testTag).execute();
    
    // Create notes
    await db.insert(notesTable).values(testNotes).execute();
    
    // Create note-tag relationships
    await db.insert(noteTagsTable).values([
      { note_id: 'note-1', tag_id: 'tag-1' },
      { note_id: 'note-3', tag_id: 'tag-1' }
    ]).execute();
  };

  it('should get all notes for a user', async () => {
    await setupTestData();

    const input: GetUserNotesInput = {
      user_id: 'user-1'
    };

    const result = await getUserNotes(input);

    expect(result).toHaveLength(3);
    expect(result.map(n => n.id).sort()).toEqual(['note-1', 'note-2', 'note-3']);
    
    // Verify note structure
    const firstNote = result.find(n => n.id === 'note-1');
    expect(firstNote).toBeDefined();
    expect(firstNote?.title).toBe('First Note');
    expect(firstNote?.content).toBe('This is the first note content');
    expect(firstNote?.user_id).toBe('user-1');
    expect(firstNote?.folder_id).toBe('folder-1');
    expect(firstNote?.is_favorite).toBe(true);
    expect(firstNote?.created_at).toBeInstanceOf(Date);
    expect(firstNote?.updated_at).toBeInstanceOf(Date);
  });

  it('should filter notes by folder_id', async () => {
    await setupTestData();

    const input: GetUserNotesInput = {
      user_id: 'user-1',
      folder_id: 'folder-1'
    };

    const result = await getUserNotes(input);

    expect(result).toHaveLength(2);
    expect(result.every(n => n.folder_id === 'folder-1')).toBe(true);
    expect(result.map(n => n.id).sort()).toEqual(['note-1', 'note-3']);
  });

  it('should filter notes not in any folder', async () => {
    await setupTestData();

    const input: GetUserNotesInput = {
      user_id: 'user-1',
      folder_id: null
    };

    const result = await getUserNotes(input);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('note-2');
    expect(result[0].folder_id).toBeNull();
  });

  it('should filter notes by tag_id', async () => {
    await setupTestData();

    const input: GetUserNotesInput = {
      user_id: 'user-1',
      tag_id: 'tag-1'
    };

    const result = await getUserNotes(input);

    expect(result).toHaveLength(2);
    expect(result.map(n => n.id).sort()).toEqual(['note-1', 'note-3']);
  });

  it('should filter favorite notes', async () => {
    await setupTestData();

    const input: GetUserNotesInput = {
      user_id: 'user-1',
      is_favorite: true
    };

    const result = await getUserNotes(input);

    expect(result).toHaveLength(2);
    expect(result.every(n => n.is_favorite === true)).toBe(true);
    expect(result.map(n => n.id).sort()).toEqual(['note-1', 'note-3']);
  });

  it('should filter non-favorite notes', async () => {
    await setupTestData();

    const input: GetUserNotesInput = {
      user_id: 'user-1',
      is_favorite: false
    };

    const result = await getUserNotes(input);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('note-2');
    expect(result[0].is_favorite).toBe(false);
  });

  it('should search notes by title', async () => {
    await setupTestData();

    const input: GetUserNotesInput = {
      user_id: 'user-1',
      search: 'First'
    };

    const result = await getUserNotes(input);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('note-1');
    expect(result[0].title).toBe('First Note');
  });

  it('should search notes by content', async () => {
    await setupTestData();

    const input: GetUserNotesInput = {
      user_id: 'user-1',
      search: 'task'
    };

    const result = await getUserNotes(input);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('note-3');
  });

  it('should search notes case-insensitively', async () => {
    await setupTestData();

    const input: GetUserNotesInput = {
      user_id: 'user-1',
      search: 'IMPORTANT'
    };

    const result = await getUserNotes(input);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('note-3');
    expect(result[0].title).toBe('Important Task');
  });

  it('should combine multiple filters', async () => {
    await setupTestData();

    const input: GetUserNotesInput = {
      user_id: 'user-1',
      folder_id: 'folder-1',
      is_favorite: true,
      search: 'First'
    };

    const result = await getUserNotes(input);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('note-1');
    expect(result[0].folder_id).toBe('folder-1');
    expect(result[0].is_favorite).toBe(true);
    expect(result[0].title).toBe('First Note');
  });

  it('should combine tag filter with other filters', async () => {
    await setupTestData();

    const input: GetUserNotesInput = {
      user_id: 'user-1',
      tag_id: 'tag-1',
      is_favorite: true
    };

    const result = await getUserNotes(input);

    expect(result).toHaveLength(2);
    expect(result.every(n => n.is_favorite === true)).toBe(true);
    expect(result.map(n => n.id).sort()).toEqual(['note-1', 'note-3']);
  });

  it('should return empty array for user with no notes', async () => {
    // Create user without notes
    await db.insert(usersTable).values({
      id: 'user-2',
      email: 'user2@example.com',
      username: 'user2',
      password_hash: 'hashed_password'
    }).execute();

    const input: GetUserNotesInput = {
      user_id: 'user-2'
    };

    const result = await getUserNotes(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for non-matching filters', async () => {
    await setupTestData();

    const input: GetUserNotesInput = {
      user_id: 'user-1',
      search: 'nonexistent'
    };

    const result = await getUserNotes(input);

    expect(result).toHaveLength(0);
  });

  it('should handle non-existent tag_id gracefully', async () => {
    await setupTestData();

    const input: GetUserNotesInput = {
      user_id: 'user-1',
      tag_id: 'nonexistent-tag'
    };

    const result = await getUserNotes(input);

    expect(result).toHaveLength(0);
  });

  it('should handle non-existent folder_id gracefully', async () => {
    await setupTestData();

    const input: GetUserNotesInput = {
      user_id: 'user-1',
      folder_id: 'nonexistent-folder'
    };

    const result = await getUserNotes(input);

    expect(result).toHaveLength(0);
  });
});