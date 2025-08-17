import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, notesTable, tagsTable, noteTagsTable } from '../db/schema';
import { type DeleteNoteInput } from '../schema';
import { deleteNote } from '../handlers/delete_note';
import { eq, and } from 'drizzle-orm';

describe('deleteNote', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully delete a note', async () => {
    // Create test user
    await db.insert(usersTable).values({
      id: 'user1',
      email: 'test@example.com',
      username: 'testuser',
      password_hash: 'hashedpassword',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create test note
    await db.insert(notesTable).values({
      id: 'note1',
      title: 'Test Note',
      content: 'Test content',
      user_id: 'user1',
      is_favorite: false,
      created_at: new Date(),
      updated_at: new Date()
    });

    const input: DeleteNoteInput = {
      id: 'note1',
      user_id: 'user1'
    };

    const result = await deleteNote(input);

    expect(result.success).toBe(true);

    // Verify note was deleted
    const remainingNotes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, 'note1'))
      .execute();

    expect(remainingNotes).toHaveLength(0);
  });

  it('should delete note-tag relationships when deleting a note', async () => {
    // Create test user
    await db.insert(usersTable).values({
      id: 'user1',
      email: 'test@example.com',
      username: 'testuser',
      password_hash: 'hashedpassword',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create test tag
    await db.insert(tagsTable).values({
      id: 'tag1',
      name: 'Test Tag',
      user_id: 'user1',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create test note
    await db.insert(notesTable).values({
      id: 'note1',
      title: 'Test Note',
      content: 'Test content',
      user_id: 'user1',
      is_favorite: false,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create note-tag relationship
    await db.insert(noteTagsTable).values({
      note_id: 'note1',
      tag_id: 'tag1',
      created_at: new Date()
    });

    const input: DeleteNoteInput = {
      id: 'note1',
      user_id: 'user1'
    };

    const result = await deleteNote(input);

    expect(result.success).toBe(true);

    // Verify note was deleted
    const remainingNotes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, 'note1'))
      .execute();

    expect(remainingNotes).toHaveLength(0);

    // Verify note-tag relationship was deleted
    const remainingNoteTags = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.note_id, 'note1'))
      .execute();

    expect(remainingNoteTags).toHaveLength(0);

    // Verify tag still exists (should not be deleted)
    const remainingTags = await db.select()
      .from(tagsTable)
      .where(eq(tagsTable.id, 'tag1'))
      .execute();

    expect(remainingTags).toHaveLength(1);
  });

  it('should fail when note does not exist', async () => {
    // Create test user
    await db.insert(usersTable).values({
      id: 'user1',
      email: 'test@example.com',
      username: 'testuser',
      password_hash: 'hashedpassword',
      created_at: new Date(),
      updated_at: new Date()
    });

    const input: DeleteNoteInput = {
      id: 'nonexistent-note',
      user_id: 'user1'
    };

    await expect(deleteNote(input)).rejects.toThrow(/Note not found or access denied/i);
  });

  it('should fail when user does not own the note', async () => {
    // Create test users
    await db.insert(usersTable).values([
      {
        id: 'user1',
        email: 'user1@example.com',
        username: 'user1',
        password_hash: 'hashedpassword',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'user2',
        email: 'user2@example.com',
        username: 'user2',
        password_hash: 'hashedpassword',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Create note owned by user1
    await db.insert(notesTable).values({
      id: 'note1',
      title: 'Test Note',
      content: 'Test content',
      user_id: 'user1',
      is_favorite: false,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Try to delete as user2
    const input: DeleteNoteInput = {
      id: 'note1',
      user_id: 'user2'
    };

    await expect(deleteNote(input)).rejects.toThrow(/Note not found or access denied/i);

    // Verify note still exists
    const remainingNotes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, 'note1'))
      .execute();

    expect(remainingNotes).toHaveLength(1);
  });

  it('should handle deletion of note with multiple tag relationships', async () => {
    // Create test user
    await db.insert(usersTable).values({
      id: 'user1',
      email: 'test@example.com',
      username: 'testuser',
      password_hash: 'hashedpassword',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create multiple test tags
    await db.insert(tagsTable).values([
      {
        id: 'tag1',
        name: 'Tag 1',
        user_id: 'user1',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'tag2',
        name: 'Tag 2',
        user_id: 'user1',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'tag3',
        name: 'Tag 3',
        user_id: 'user1',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Create test note
    await db.insert(notesTable).values({
      id: 'note1',
      title: 'Test Note',
      content: 'Test content',
      user_id: 'user1',
      is_favorite: false,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create multiple note-tag relationships
    await db.insert(noteTagsTable).values([
      {
        note_id: 'note1',
        tag_id: 'tag1',
        created_at: new Date()
      },
      {
        note_id: 'note1',
        tag_id: 'tag2',
        created_at: new Date()
      },
      {
        note_id: 'note1',
        tag_id: 'tag3',
        created_at: new Date()
      }
    ]);

    const input: DeleteNoteInput = {
      id: 'note1',
      user_id: 'user1'
    };

    const result = await deleteNote(input);

    expect(result.success).toBe(true);

    // Verify note was deleted
    const remainingNotes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, 'note1'))
      .execute();

    expect(remainingNotes).toHaveLength(0);

    // Verify all note-tag relationships were deleted
    const remainingNoteTags = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.note_id, 'note1'))
      .execute();

    expect(remainingNoteTags).toHaveLength(0);

    // Verify all tags still exist
    const remainingTags = await db.select()
      .from(tagsTable)
      .execute();

    expect(remainingTags).toHaveLength(3);
  });

  it('should not affect other notes when deleting one note', async () => {
    // Create test user
    await db.insert(usersTable).values({
      id: 'user1',
      email: 'test@example.com',
      username: 'testuser',
      password_hash: 'hashedpassword',
      created_at: new Date(),
      updated_at: new Date()
    });

    // Create multiple test notes
    await db.insert(notesTable).values([
      {
        id: 'note1',
        title: 'Test Note 1',
        content: 'Test content 1',
        user_id: 'user1',
        is_favorite: false,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 'note2',
        title: 'Test Note 2',
        content: 'Test content 2',
        user_id: 'user1',
        is_favorite: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    const input: DeleteNoteInput = {
      id: 'note1',
      user_id: 'user1'
    };

    const result = await deleteNote(input);

    expect(result.success).toBe(true);

    // Verify only the specified note was deleted
    const remainingNotes = await db.select()
      .from(notesTable)
      .execute();

    expect(remainingNotes).toHaveLength(1);
    expect(remainingNotes[0].id).toBe('note2');
    expect(remainingNotes[0].title).toBe('Test Note 2');
  });
});