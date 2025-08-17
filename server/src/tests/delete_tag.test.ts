import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tagsTable, notesTable, noteTagsTable } from '../db/schema';
import { type DeleteTagInput } from '../schema';
import { deleteTag } from '../handlers/delete_tag';
import { eq, and } from 'drizzle-orm';

describe('deleteTag', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const testUser = {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    password_hash: 'hashed_password'
  };

  const anotherUser = {
    id: 'user-2',
    email: 'other@example.com',
    username: 'otheruser',
    password_hash: 'hashed_password'
  };

  const testTag = {
    id: 'tag-1',
    name: 'Test Tag',
    color: '#ff0000',
    user_id: 'user-1'
  };

  const testNote = {
    id: 'note-1',
    title: 'Test Note',
    content: 'Test content',
    markdown_content: null,
    user_id: 'user-1',
    folder_id: null,
    is_favorite: false
  };

  it('should delete a tag successfully', async () => {
    // Create test user and tag
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(tagsTable).values(testTag).execute();

    const input: DeleteTagInput = {
      id: 'tag-1',
      user_id: 'user-1'
    };

    const result = await deleteTag(input);

    // Verify success response
    expect(result.success).toBe(true);

    // Verify tag is deleted from database
    const tags = await db.select()
      .from(tagsTable)
      .where(eq(tagsTable.id, 'tag-1'))
      .execute();

    expect(tags).toHaveLength(0);
  });

  it('should delete tag and remove all note associations', async () => {
    // Create test user, tag, and note
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(tagsTable).values(testTag).execute();
    await db.insert(notesTable).values(testNote).execute();

    // Create note-tag association
    await db.insert(noteTagsTable).values({
      note_id: 'note-1',
      tag_id: 'tag-1'
    }).execute();

    // Verify association exists before deletion
    const beforeAssociations = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.tag_id, 'tag-1'))
      .execute();
    expect(beforeAssociations).toHaveLength(1);

    const input: DeleteTagInput = {
      id: 'tag-1',
      user_id: 'user-1'
    };

    const result = await deleteTag(input);

    // Verify success
    expect(result.success).toBe(true);

    // Verify tag is deleted
    const tags = await db.select()
      .from(tagsTable)
      .where(eq(tagsTable.id, 'tag-1'))
      .execute();
    expect(tags).toHaveLength(0);

    // Verify all note-tag associations are removed
    const afterAssociations = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.tag_id, 'tag-1'))
      .execute();
    expect(afterAssociations).toHaveLength(0);

    // Verify note still exists (only association was removed)
    const notes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.id, 'note-1'))
      .execute();
    expect(notes).toHaveLength(1);
  });

  it('should delete tag with multiple note associations', async () => {
    // Create test user and tag
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(tagsTable).values(testTag).execute();

    // Create multiple notes
    const notes = [
      { ...testNote, id: 'note-1' },
      { ...testNote, id: 'note-2', title: 'Second Note' },
      { ...testNote, id: 'note-3', title: 'Third Note' }
    ];

    await db.insert(notesTable).values(notes).execute();

    // Create multiple note-tag associations
    const associations = [
      { note_id: 'note-1', tag_id: 'tag-1' },
      { note_id: 'note-2', tag_id: 'tag-1' },
      { note_id: 'note-3', tag_id: 'tag-1' }
    ];

    await db.insert(noteTagsTable).values(associations).execute();

    // Verify associations exist
    const beforeAssociations = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.tag_id, 'tag-1'))
      .execute();
    expect(beforeAssociations).toHaveLength(3);

    const input: DeleteTagInput = {
      id: 'tag-1',
      user_id: 'user-1'
    };

    const result = await deleteTag(input);

    // Verify success
    expect(result.success).toBe(true);

    // Verify all associations are removed
    const afterAssociations = await db.select()
      .from(noteTagsTable)
      .where(eq(noteTagsTable.tag_id, 'tag-1'))
      .execute();
    expect(afterAssociations).toHaveLength(0);

    // Verify all notes still exist
    const remainingNotes = await db.select()
      .from(notesTable)
      .where(eq(notesTable.user_id, 'user-1'))
      .execute();
    expect(remainingNotes).toHaveLength(3);
  });

  it('should reject deletion of non-existent tag', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    const input: DeleteTagInput = {
      id: 'non-existent-tag',
      user_id: 'user-1'
    };

    await expect(deleteTag(input)).rejects.toThrow(/tag not found/i);
  });

  it('should reject deletion of tag belonging to another user', async () => {
    // Create both users
    await db.insert(usersTable).values([testUser, anotherUser]).execute();

    // Create tag for user-1
    await db.insert(tagsTable).values(testTag).execute();

    // Try to delete as user-2
    const input: DeleteTagInput = {
      id: 'tag-1',
      user_id: 'user-2'
    };

    await expect(deleteTag(input)).rejects.toThrow(/tag not found/i);

    // Verify tag still exists
    const tags = await db.select()
      .from(tagsTable)
      .where(eq(tagsTable.id, 'tag-1'))
      .execute();
    expect(tags).toHaveLength(1);
  });

  it('should handle tag without associations', async () => {
    // Create test user and tag
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(tagsTable).values(testTag).execute();

    const input: DeleteTagInput = {
      id: 'tag-1',
      user_id: 'user-1'
    };

    const result = await deleteTag(input);

    // Verify success
    expect(result.success).toBe(true);

    // Verify tag is deleted
    const tags = await db.select()
      .from(tagsTable)
      .where(eq(tagsTable.id, 'tag-1'))
      .execute();
    expect(tags).toHaveLength(0);
  });

  it('should maintain data integrity with other users tags', async () => {
    // Create both users
    await db.insert(usersTable).values([testUser, anotherUser]).execute();

    // Create tags for both users
    const userTags = [
      { ...testTag, id: 'tag-1' },
      { ...testTag, id: 'tag-2', name: 'User 2 Tag', user_id: 'user-2' }
    ];

    await db.insert(tagsTable).values(userTags).execute();

    const input: DeleteTagInput = {
      id: 'tag-1',
      user_id: 'user-1'
    };

    const result = await deleteTag(input);

    // Verify success
    expect(result.success).toBe(true);

    // Verify only user-1's tag is deleted
    const remainingTags = await db.select()
      .from(tagsTable)
      .execute();
    expect(remainingTags).toHaveLength(1);
    expect(remainingTags[0].id).toBe('tag-2');
    expect(remainingTags[0].user_id).toBe('user-2');
  });
});