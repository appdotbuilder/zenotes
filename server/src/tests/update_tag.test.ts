import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tagsTable } from '../db/schema';
import { type UpdateTagInput } from '../schema';
import { updateTag } from '../handlers/update_tag';
import { eq } from 'drizzle-orm';

describe('updateTag', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: string;
  let testTagId: string;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        id: 'test-user-1',
        email: 'test@example.com',
        username: 'testuser',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    testUserId = userResult[0].id;

    // Create test tag
    const tagResult = await db.insert(tagsTable)
      .values({
        id: 'test-tag-1',
        name: 'Original Tag',
        color: '#ff0000',
        user_id: testUserId
      })
      .returning()
      .execute();

    testTagId = tagResult[0].id;
  });

  it('should update tag name successfully', async () => {
    const input: UpdateTagInput = {
      id: testTagId,
      name: 'Updated Tag Name'
    };

    const result = await updateTag(input);

    expect(result.id).toEqual(testTagId);
    expect(result.name).toEqual('Updated Tag Name');
    expect(result.color).toEqual('#ff0000'); // Should remain unchanged
    expect(result.user_id).toEqual(testUserId);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update tag color successfully', async () => {
    const input: UpdateTagInput = {
      id: testTagId,
      color: '#00ff00'
    };

    const result = await updateTag(input);

    expect(result.id).toEqual(testTagId);
    expect(result.name).toEqual('Original Tag'); // Should remain unchanged
    expect(result.color).toEqual('#00ff00');
    expect(result.user_id).toEqual(testUserId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update both name and color successfully', async () => {
    const input: UpdateTagInput = {
      id: testTagId,
      name: 'New Tag Name',
      color: '#0000ff'
    };

    const result = await updateTag(input);

    expect(result.id).toEqual(testTagId);
    expect(result.name).toEqual('New Tag Name');
    expect(result.color).toEqual('#0000ff');
    expect(result.user_id).toEqual(testUserId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set color to null', async () => {
    const input: UpdateTagInput = {
      id: testTagId,
      color: null
    };

    const result = await updateTag(input);

    expect(result.id).toEqual(testTagId);
    expect(result.name).toEqual('Original Tag'); // Should remain unchanged
    expect(result.color).toBeNull();
    expect(result.user_id).toEqual(testUserId);
  });

  it('should save changes to database', async () => {
    const input: UpdateTagInput = {
      id: testTagId,
      name: 'Database Updated Tag',
      color: '#purple'
    };

    await updateTag(input);

    // Verify changes were persisted to database
    const dbTags = await db.select()
      .from(tagsTable)
      .where(eq(tagsTable.id, testTagId))
      .execute();

    expect(dbTags).toHaveLength(1);
    expect(dbTags[0].name).toEqual('Database Updated Tag');
    expect(dbTags[0].color).toEqual('#purple');
    expect(dbTags[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when tag does not exist', async () => {
    const input: UpdateTagInput = {
      id: 'non-existent-tag-id',
      name: 'Should Fail'
    };

    expect(updateTag(input)).rejects.toThrow(/tag not found/i);
  });

  it('should throw error when updating name to duplicate within same user', async () => {
    // Create another tag for the same user
    await db.insert(tagsTable)
      .values({
        id: 'test-tag-2',
        name: 'Existing Tag Name',
        user_id: testUserId
      })
      .execute();

    const input: UpdateTagInput = {
      id: testTagId,
      name: 'Existing Tag Name'
    };

    expect(updateTag(input)).rejects.toThrow(/tag with this name already exists/i);
  });

  it('should allow duplicate tag names across different users', async () => {
    // Create another user and tag
    const anotherUserResult = await db.insert(usersTable)
      .values({
        id: 'test-user-2',
        email: 'another@example.com',
        username: 'anotheruser',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const anotherUserId = anotherUserResult[0].id;

    await db.insert(tagsTable)
      .values({
        id: 'test-tag-2',
        name: 'Shared Tag Name',
        user_id: anotherUserId
      })
      .execute();

    // This should succeed because the other tag belongs to a different user
    const input: UpdateTagInput = {
      id: testTagId,
      name: 'Shared Tag Name'
    };

    const result = await updateTag(input);

    expect(result.name).toEqual('Shared Tag Name');
    expect(result.user_id).toEqual(testUserId);
  });

  it('should allow updating tag to keep the same name', async () => {
    const input: UpdateTagInput = {
      id: testTagId,
      name: 'Original Tag', // Same as existing name
      color: '#new-color'
    };

    const result = await updateTag(input);

    expect(result.name).toEqual('Original Tag');
    expect(result.color).toEqual('#new-color');
  });

  it('should handle partial updates with only some fields', async () => {
    // Update only name
    const nameOnlyInput: UpdateTagInput = {
      id: testTagId,
      name: 'Name Only Update'
    };

    let result = await updateTag(nameOnlyInput);
    expect(result.name).toEqual('Name Only Update');
    expect(result.color).toEqual('#ff0000'); // Should remain unchanged

    // Update only color
    const colorOnlyInput: UpdateTagInput = {
      id: testTagId,
      color: '#color-only'
    };

    result = await updateTag(colorOnlyInput);
    expect(result.name).toEqual('Name Only Update'); // Should remain unchanged
    expect(result.color).toEqual('#color-only');
  });
});