import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, foldersTable, tagsTable, notesTable, noteTagsTable } from '../db/schema';
import { type CreateNoteInput } from '../schema';
import { createNote } from '../handlers/create_note';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

describe('createNote', () => {
  let testUser: any;
  let testFolder: any;
  let testTags: any[];

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userId = randomUUID();
    const userResult = await db.insert(usersTable)
      .values({
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashed_password',
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create test folder
    const folderId = randomUUID();
    const folderResult = await db.insert(foldersTable)
      .values({
        id: folderId,
        name: 'Test Folder',
        user_id: testUser.id,
        parent_folder_id: null,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning()
      .execute();
    testFolder = folderResult[0];

    // Create test tags
    const tag1Id = randomUUID();
    const tag2Id = randomUUID();
    const tagResults = await db.insert(tagsTable)
      .values([
        {
          id: tag1Id,
          name: 'Important',
          color: '#ff0000',
          user_id: testUser.id,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: tag2Id,
          name: 'Work',
          color: '#0000ff',
          user_id: testUser.id,
          created_at: new Date(),
          updated_at: new Date()
        }
      ])
      .returning()
      .execute();
    testTags = tagResults;
  });

  afterEach(resetDB);

  it('should create a basic note without folder or tags', async () => {
    const input: CreateNoteInput = {
      title: 'Test Note',
      content: 'This is a test note content',
      markdown_content: '# Test Note\n\nThis is a test note content',
      user_id: testUser.id
    };

    const result = await createNote(input);

    expect(result.id).toBeDefined();
    expect(result.title).toEqual('Test Note');
    expect(result.content).toEqual('This is a test note content');
    expect(result.markdown_content).toEqual('# Test Note\n\nThis is a test note content');
    expect(result.user_id).toEqual(testUser.id);
    expect(result.folder_id).toBeNull();
    expect(result.is_favorite).toBe(false);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a note with folder', async () => {
    const input: CreateNoteInput = {
      title: 'Note in Folder',
      content: 'This note is in a folder',
      user_id: testUser.id,
      folder_id: testFolder.id
    };

    const result = await createNote(input);

    expect(result.folder_id).toEqual(testFolder.id);
    expect(result.title).toEqual('Note in Folder');
    expect(result.content).toEqual('This note is in a folder');
  });

  it('should create a note with tags', async () => {
    const input: CreateNoteInput = {
      title: 'Tagged Note',
      content: 'This note has tags',
      user_id: testUser.id,
      tag_ids: [testTags[0].id, testTags[1].id]
    };

    const result = await createNote(input);

    expect(result.title).toEqual('Tagged Note');

    // Verify note-tag relationships were created
    const noteTags = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.note_id, result.id))
      .execute();

    expect(noteTags).toHaveLength(2);
    expect(noteTags.map(nt => nt.tag_id)).toContain(testTags[0].id);
    expect(noteTags.map(nt => nt.tag_id)).toContain(testTags[1].id);
  });

  it('should create a note with folder and tags', async () => {
    const input: CreateNoteInput = {
      title: 'Complete Note',
      content: 'This note has everything',
      markdown_content: '**This note has everything**',
      user_id: testUser.id,
      folder_id: testFolder.id,
      tag_ids: [testTags[0].id]
    };

    const result = await createNote(input);

    expect(result.title).toEqual('Complete Note');
    expect(result.folder_id).toEqual(testFolder.id);
    expect(result.markdown_content).toEqual('**This note has everything**');

    // Verify note-tag relationship was created
    const noteTags = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.note_id, result.id))
      .execute();

    expect(noteTags).toHaveLength(1);
    expect(noteTags[0].tag_id).toEqual(testTags[0].id);
  });

  it('should save note to database correctly', async () => {
    const input: CreateNoteInput = {
      title: 'Database Test',
      content: 'Testing database save',
      user_id: testUser.id
    };

    const result = await createNote(input);

    // Query database to verify note was saved
    const notes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, result.id))
      .execute();

    expect(notes).toHaveLength(1);
    expect(notes[0].title).toEqual('Database Test');
    expect(notes[0].content).toEqual('Testing database save');
    expect(notes[0].user_id).toEqual(testUser.id);
    expect(notes[0].is_favorite).toBe(false);
  });

  it('should handle note without markdown_content', async () => {
    const input: CreateNoteInput = {
      title: 'Plain Note',
      content: 'Just plain content',
      user_id: testUser.id
    };

    const result = await createNote(input);

    expect(result.markdown_content).toBeNull();
    expect(result.content).toEqual('Just plain content');
  });

  it('should throw error for non-existent folder', async () => {
    const input: CreateNoteInput = {
      title: 'Invalid Folder Note',
      content: 'This should fail',
      user_id: testUser.id,
      folder_id: randomUUID() // Non-existent folder
    };

    await expect(createNote(input)).rejects.toThrow(/folder not found or access denied/i);
  });

  it('should throw error for folder belonging to different user', async () => {
    // Create another user
    const anotherUserId = randomUUID();
    await db.insert(usersTable)
      .values({
        id: anotherUserId,
        email: 'another@example.com',
        username: 'anotheruser',
        password_hash: 'hashed_password',
        created_at: new Date(),
        updated_at: new Date()
      })
      .execute();

    // Create folder for another user
    const anotherFolderId = randomUUID();
    await db.insert(foldersTable)
      .values({
        id: anotherFolderId,
        name: 'Another User Folder',
        user_id: anotherUserId,
        parent_folder_id: null,
        created_at: new Date(),
        updated_at: new Date()
      })
      .execute();

    const input: CreateNoteInput = {
      title: 'Access Denied Note',
      content: 'This should fail',
      user_id: testUser.id,
      folder_id: anotherFolderId // Folder belongs to different user
    };

    await expect(createNote(input)).rejects.toThrow(/folder not found or access denied/i);
  });

  it('should throw error for non-existent tags', async () => {
    const input: CreateNoteInput = {
      title: 'Invalid Tags Note',
      content: 'This should fail',
      user_id: testUser.id,
      tag_ids: [randomUUID(), randomUUID()] // Non-existent tags
    };

    await expect(createNote(input)).rejects.toThrow(/tags not found or access denied/i);
  });

  it('should throw error for tags belonging to different user', async () => {
    // Create another user
    const anotherUserId = randomUUID();
    await db.insert(usersTable)
      .values({
        id: anotherUserId,
        email: 'another@example.com',
        username: 'anotheruser',
        password_hash: 'hashed_password',
        created_at: new Date(),
        updated_at: new Date()
      })
      .execute();

    // Create tag for another user
    const anotherTagId = randomUUID();
    await db.insert(tagsTable)
      .values({
        id: anotherTagId,
        name: 'Another User Tag',
        color: '#00ff00',
        user_id: anotherUserId,
        created_at: new Date(),
        updated_at: new Date()
      })
      .execute();

    const input: CreateNoteInput = {
      title: 'Access Denied Tags Note',
      content: 'This should fail',
      user_id: testUser.id,
      tag_ids: [anotherTagId] // Tag belongs to different user
    };

    await expect(createNote(input)).rejects.toThrow(/tags not found or access denied/i);
  });

  it('should handle mixed valid and invalid tags', async () => {
    const input: CreateNoteInput = {
      title: 'Mixed Tags Note',
      content: 'This should fail',
      user_id: testUser.id,
      tag_ids: [testTags[0].id, randomUUID()] // One valid, one invalid tag
    };

    await expect(createNote(input)).rejects.toThrow(/tags not found or access denied/i);
  });

  it('should handle empty tag_ids array', async () => {
    const input: CreateNoteInput = {
      title: 'Empty Tags Note',
      content: 'This should work',
      user_id: testUser.id,
      tag_ids: []
    };

    const result = await createNote(input);

    expect(result.title).toEqual('Empty Tags Note');

    // Verify no note-tag relationships were created
    const noteTags = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.note_id, result.id))
      .execute();

    expect(noteTags).toHaveLength(0);
  });
});