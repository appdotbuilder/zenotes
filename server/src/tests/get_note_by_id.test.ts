import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, notesTable, foldersTable } from '../db/schema';
import { getNoteById } from '../handlers/get_note_by_id';

describe('getNoteById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a note when found with correct user ownership', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning()
      .execute();

    // Create test note
    const note = await db.insert(notesTable)
      .values({
        id: 'note-1',
        title: 'Test Note',
        content: 'This is test content',
        markdown_content: '# Test Note\nThis is test content',
        user_id: 'user-1',
        folder_id: null,
        is_favorite: true,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning()
      .execute();

    const result = await getNoteById('note-1', 'user-1');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual('note-1');
    expect(result!.title).toEqual('Test Note');
    expect(result!.content).toEqual('This is test content');
    expect(result!.markdown_content).toEqual('# Test Note\nThis is test content');
    expect(result!.user_id).toEqual('user-1');
    expect(result!.folder_id).toBeNull();
    expect(result!.is_favorite).toBe(true);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when note does not exist', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        created_at: new Date(),
        updated_at: new Date()
      })
      .execute();

    const result = await getNoteById('nonexistent-note', 'user-1');

    expect(result).toBeNull();
  });

  it('should return null when note belongs to different user', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        {
          id: 'user-1',
          email: 'user1@example.com',
          username: 'user1',
          password_hash: 'hashed_password1',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'user-2',
          email: 'user2@example.com',
          username: 'user2',
          password_hash: 'hashed_password2',
          created_at: new Date(),
          updated_at: new Date()
        }
      ])
      .execute();

    // Create note for user-1
    await db.insert(notesTable)
      .values({
        id: 'note-1',
        title: 'User 1 Note',
        content: 'This belongs to user 1',
        markdown_content: null,
        user_id: 'user-1',
        folder_id: null,
        is_favorite: false,
        created_at: new Date(),
        updated_at: new Date()
      })
      .execute();

    // Try to access with user-2
    const result = await getNoteById('note-1', 'user-2');

    expect(result).toBeNull();
  });

  it('should return note with folder assignment', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        created_at: new Date(),
        updated_at: new Date()
      })
      .execute();

    // Create test folder
    await db.insert(foldersTable)
      .values({
        id: 'folder-1',
        name: 'Test Folder',
        user_id: 'user-1',
        parent_folder_id: null,
        created_at: new Date(),
        updated_at: new Date()
      })
      .execute();

    // Create test note with folder
    await db.insert(notesTable)
      .values({
        id: 'note-1',
        title: 'Note in Folder',
        content: 'This note is in a folder',
        markdown_content: null,
        user_id: 'user-1',
        folder_id: 'folder-1',
        is_favorite: false,
        created_at: new Date(),
        updated_at: new Date()
      })
      .execute();

    const result = await getNoteById('note-1', 'user-1');

    expect(result).not.toBeNull();
    expect(result!.folder_id).toEqual('folder-1');
    expect(result!.title).toEqual('Note in Folder');
    expect(result!.content).toEqual('This note is in a folder');
  });

  it('should handle notes with minimal required fields', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        created_at: new Date(),
        updated_at: new Date()
      })
      .execute();

    // Create minimal note (only required fields)
    await db.insert(notesTable)
      .values({
        id: 'note-minimal',
        title: 'Minimal Note',
        content: 'Just basic content',
        markdown_content: null,
        user_id: 'user-1',
        folder_id: null,
        is_favorite: false,
        created_at: new Date(),
        updated_at: new Date()
      })
      .execute();

    const result = await getNoteById('note-minimal', 'user-1');

    expect(result).not.toBeNull();
    expect(result!.title).toEqual('Minimal Note');
    expect(result!.content).toEqual('Just basic content');
    expect(result!.markdown_content).toBeNull();
    expect(result!.folder_id).toBeNull();
    expect(result!.is_favorite).toBe(false);
  });

  it('should return correct note when multiple notes exist', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        created_at: new Date(),
        updated_at: new Date()
      })
      .execute();

    // Create multiple notes
    await db.insert(notesTable)
      .values([
        {
          id: 'note-1',
          title: 'First Note',
          content: 'First content',
          markdown_content: null,
          user_id: 'user-1',
          folder_id: null,
          is_favorite: false,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'note-2',
          title: 'Second Note',
          content: 'Second content',
          markdown_content: null,
          user_id: 'user-1',
          folder_id: null,
          is_favorite: true,
          created_at: new Date(),
          updated_at: new Date()
        }
      ])
      .execute();

    const result = await getNoteById('note-2', 'user-1');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual('note-2');
    expect(result!.title).toEqual('Second Note');
    expect(result!.content).toEqual('Second content');
    expect(result!.is_favorite).toBe(true);
  });
});