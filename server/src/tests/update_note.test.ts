import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, foldersTable, tagsTable, notesTable, noteTagsTable } from '../db/schema';
import { type UpdateNoteInput } from '../schema';
import { updateNote } from '../handlers/update_note';
import { eq } from 'drizzle-orm';

describe('updateNote', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  const testUser = {
    id: 'test-user-1',
    email: 'test@example.com',
    username: 'testuser',
    password_hash: 'hashed_password'
  };

  const testFolder = {
    id: 'test-folder-1',
    name: 'Test Folder',
    user_id: testUser.id,
    parent_folder_id: null
  };

  const anotherUserFolder = {
    id: 'test-folder-2',
    name: 'Another User Folder',
    user_id: 'another-user',
    parent_folder_id: null
  };

  const testTag1 = {
    id: 'test-tag-1',
    name: 'Important',
    color: '#ff0000',
    user_id: testUser.id
  };

  const testTag2 = {
    id: 'test-tag-2',
    name: 'Work',
    color: '#0000ff',
    user_id: testUser.id
  };

  const anotherUserTag = {
    id: 'test-tag-3',
    name: 'Another User Tag',
    color: '#00ff00',
    user_id: 'another-user'
  };

  const testNote = {
    id: 'test-note-1',
    title: 'Original Title',
    content: 'Original content',
    markdown_content: '# Original Title\nOriginal content',
    user_id: testUser.id,
    folder_id: testFolder.id,
    is_favorite: false
  };

  const setupTestData = async () => {
    // Create users
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(usersTable).values({
      id: 'another-user',
      email: 'another@example.com',
      username: 'anotheruser',
      password_hash: 'hashed_password'
    }).execute();

    // Create folders
    await db.insert(foldersTable).values(testFolder).execute();
    await db.insert(foldersTable).values(anotherUserFolder).execute();

    // Create tags
    await db.insert(tagsTable).values([testTag1, testTag2, anotherUserTag]).execute();

    // Create note
    await db.insert(notesTable).values(testNote).execute();

    // Create initial tag relationship
    await db.insert(noteTagsTable).values({
      note_id: testNote.id,
      tag_id: testTag1.id
    }).execute();
  };

  it('should update note title', async () => {
    await setupTestData();

    const input: UpdateNoteInput = {
      id: testNote.id,
      title: 'Updated Title'
    };

    const result = await updateNote(input);

    expect(result.id).toEqual(testNote.id);
    expect(result.title).toEqual('Updated Title');
    expect(result.content).toEqual('Original content'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update note content', async () => {
    await setupTestData();

    const input: UpdateNoteInput = {
      id: testNote.id,
      content: 'Updated content'
    };

    const result = await updateNote(input);

    expect(result.content).toEqual('Updated content');
    expect(result.title).toEqual('Original Title'); // Should remain unchanged
  });

  it('should update markdown content', async () => {
    await setupTestData();

    const input: UpdateNoteInput = {
      id: testNote.id,
      markdown_content: '# Updated Title\nUpdated content'
    };

    const result = await updateNote(input);

    expect(result.markdown_content).toEqual('# Updated Title\nUpdated content');
  });

  it('should set markdown content to null', async () => {
    await setupTestData();

    const input: UpdateNoteInput = {
      id: testNote.id,
      markdown_content: null
    };

    const result = await updateNote(input);

    expect(result.markdown_content).toBeNull();
  });

  it('should update folder assignment', async () => {
    await setupTestData();

    const input: UpdateNoteInput = {
      id: testNote.id,
      folder_id: null
    };

    const result = await updateNote(input);

    expect(result.folder_id).toBeNull();
  });

  it('should update favorite status', async () => {
    await setupTestData();

    const input: UpdateNoteInput = {
      id: testNote.id,
      is_favorite: true
    };

    const result = await updateNote(input);

    expect(result.is_favorite).toEqual(true);
  });

  it('should update multiple fields at once', async () => {
    await setupTestData();

    const input: UpdateNoteInput = {
      id: testNote.id,
      title: 'New Title',
      content: 'New content',
      is_favorite: true,
      folder_id: null
    };

    const result = await updateNote(input);

    expect(result.title).toEqual('New Title');
    expect(result.content).toEqual('New content');
    expect(result.is_favorite).toEqual(true);
    expect(result.folder_id).toBeNull();
  });

  it('should update tag relationships', async () => {
    await setupTestData();

    const input: UpdateNoteInput = {
      id: testNote.id,
      tag_ids: [testTag2.id] // Replace testTag1 with testTag2
    };

    await updateNote(input);

    // Verify tag relationships in database
    const tagRelations = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.note_id, testNote.id))
      .execute();

    expect(tagRelations).toHaveLength(1);
    expect(tagRelations[0].tag_id).toEqual(testTag2.id);
  });

  it('should add multiple tags', async () => {
    await setupTestData();

    const input: UpdateNoteInput = {
      id: testNote.id,
      tag_ids: [testTag1.id, testTag2.id]
    };

    await updateNote(input);

    const tagRelations = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.note_id, testNote.id))
      .execute();

    expect(tagRelations).toHaveLength(2);
    const tagIds = tagRelations.map(rel => rel.tag_id).sort();
    expect(tagIds).toEqual([testTag1.id, testTag2.id].sort());
  });

  it('should remove all tags when empty array provided', async () => {
    await setupTestData();

    const input: UpdateNoteInput = {
      id: testNote.id,
      tag_ids: []
    };

    await updateNote(input);

    const tagRelations = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.note_id, testNote.id))
      .execute();

    expect(tagRelations).toHaveLength(0);
  });

  it('should persist changes in database', async () => {
    await setupTestData();

    const input: UpdateNoteInput = {
      id: testNote.id,
      title: 'Persisted Title',
      content: 'Persisted content'
    };

    await updateNote(input);

    // Query database directly to verify persistence
    const notes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, testNote.id))
      .execute();

    expect(notes).toHaveLength(1);
    expect(notes[0].title).toEqual('Persisted Title');
    expect(notes[0].content).toEqual('Persisted content');
    expect(notes[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when note not found', async () => {
    await setupTestData();

    const input: UpdateNoteInput = {
      id: 'non-existent-note',
      title: 'Updated Title'
    };

    expect(updateNote(input)).rejects.toThrow(/note not found/i);
  });

  it('should throw error when folder does not belong to user', async () => {
    await setupTestData();

    const input: UpdateNoteInput = {
      id: testNote.id,
      folder_id: anotherUserFolder.id // Folder belongs to different user
    };

    expect(updateNote(input)).rejects.toThrow(/folder not found or does not belong to user/i);
  });

  it('should throw error when tag does not belong to user', async () => {
    await setupTestData();

    const input: UpdateNoteInput = {
      id: testNote.id,
      tag_ids: [anotherUserTag.id] // Tag belongs to different user
    };

    expect(updateNote(input)).rejects.toThrow(/one or more tags do not belong to user/i);
  });

  it('should throw error when mixing valid and invalid tags', async () => {
    await setupTestData();

    const input: UpdateNoteInput = {
      id: testNote.id,
      tag_ids: [testTag1.id, anotherUserTag.id] // Mix of valid and invalid tags
    };

    expect(updateNote(input)).rejects.toThrow(/one or more tags do not belong to user/i);
  });

  it('should allow updating to non-existent folder when set to null', async () => {
    await setupTestData();

    const input: UpdateNoteInput = {
      id: testNote.id,
      folder_id: null
    };

    const result = await updateNote(input);

    expect(result.folder_id).toBeNull();
  });

  it('should not modify tags when tag_ids not provided', async () => {
    await setupTestData();

    const input: UpdateNoteInput = {
      id: testNote.id,
      title: 'New Title'
      // tag_ids not provided
    };

    await updateNote(input);

    // Verify existing tag relationships remain unchanged
    const tagRelations = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.note_id, testNote.id))
      .execute();

    expect(tagRelations).toHaveLength(1);
    expect(tagRelations[0].tag_id).toEqual(testTag1.id);
  });
});