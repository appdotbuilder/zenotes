import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { tagsTable, usersTable } from '../db/schema';
import { type CreateTagInput } from '../schema';
import { createTag } from '../handlers/create_tag';
import { eq, and } from 'drizzle-orm';

// Test user data
const testUser = {
  id: crypto.randomUUID(),
  email: 'test@example.com',
  username: 'testuser',
  password_hash: 'hashedpassword'
};

// Simple test input
const testInput: CreateTagInput = {
  name: 'Important',
  color: '#ff0000',
  user_id: testUser.id
};

describe('createTag', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Create test user before each test
    await db.insert(usersTable)
      .values(testUser)
      .execute();
  });

  it('should create a tag with color', async () => {
    const result = await createTag(testInput);

    // Basic field validation
    expect(result.name).toEqual('Important');
    expect(result.color).toEqual('#ff0000');
    expect(result.user_id).toEqual(testUser.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a tag without color (defaults to null)', async () => {
    const inputWithoutColor: CreateTagInput = {
      name: 'Work Notes',
      user_id: testUser.id
    };

    const result = await createTag(inputWithoutColor);

    expect(result.name).toEqual('Work Notes');
    expect(result.color).toBeNull();
    expect(result.user_id).toEqual(testUser.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save tag to database', async () => {
    const result = await createTag(testInput);

    // Query using proper drizzle syntax
    const tags = await db.select()
      .from(tagsTable)
      .where(eq(tagsTable.id, result.id))
      .execute();

    expect(tags).toHaveLength(1);
    expect(tags[0].name).toEqual('Important');
    expect(tags[0].color).toEqual('#ff0000');
    expect(tags[0].user_id).toEqual(testUser.id);
    expect(tags[0].created_at).toBeInstanceOf(Date);
    expect(tags[0].updated_at).toBeInstanceOf(Date);
  });

  it('should prevent duplicate tag names for same user', async () => {
    // Create first tag
    await createTag(testInput);

    // Try to create tag with same name for same user
    const duplicateInput: CreateTagInput = {
      name: 'Important',
      color: '#00ff00', // Different color, but same name
      user_id: testUser.id
    };

    await expect(createTag(duplicateInput))
      .rejects.toThrow(/already exists for this user/i);
  });

  it('should allow same tag name for different users', async () => {
    // Create second user
    const secondUser = {
      id: crypto.randomUUID(),
      email: 'user2@example.com',
      username: 'user2',
      password_hash: 'hashedpassword2'
    };

    await db.insert(usersTable)
      .values(secondUser)
      .execute();

    // Create tag for first user
    const result1 = await createTag(testInput);

    // Create tag with same name for second user
    const inputForSecondUser: CreateTagInput = {
      name: 'Important',
      color: '#00ff00',
      user_id: secondUser.id
    };

    const result2 = await createTag(inputForSecondUser);

    // Both should be created successfully
    expect(result1.name).toEqual('Important');
    expect(result1.user_id).toEqual(testUser.id);
    expect(result2.name).toEqual('Important');
    expect(result2.user_id).toEqual(secondUser.id);
    expect(result1.id).not.toEqual(result2.id);

    // Verify both exist in database
    const allTags = await db.select()
      .from(tagsTable)
      .execute();

    expect(allTags).toHaveLength(2);
  });

  it('should reject creation for non-existent user', async () => {
    const invalidInput: CreateTagInput = {
      name: 'Test Tag',
      user_id: 'non-existent-user-id'
    };

    await expect(createTag(invalidInput))
      .rejects.toThrow(/User with ID .* not found/i);
  });

  it('should handle special characters in tag names', async () => {
    const specialInput: CreateTagInput = {
      name: 'Work & Personal 2024 #priority',
      color: '#123456',
      user_id: testUser.id
    };

    const result = await createTag(specialInput);

    expect(result.name).toEqual('Work & Personal 2024 #priority');
    expect(result.color).toEqual('#123456');

    // Verify in database
    const tag = await db.select()
      .from(tagsTable)
      .where(eq(tagsTable.id, result.id))
      .execute();

    expect(tag[0].name).toEqual('Work & Personal 2024 #priority');
  });

  it('should validate tag uniqueness case-sensitively', async () => {
    // Create first tag
    await createTag(testInput);

    // Create tag with different case - should be allowed
    const differentCaseInput: CreateTagInput = {
      name: 'important', // lowercase
      user_id: testUser.id
    };

    const result = await createTag(differentCaseInput);
    expect(result.name).toEqual('important');

    // Verify both tags exist
    const userTags = await db.select()
      .from(tagsTable)
      .where(eq(tagsTable.user_id, testUser.id))
      .execute();

    expect(userTags).toHaveLength(2);
    const tagNames = userTags.map(tag => tag.name).sort();
    expect(tagNames).toEqual(['Important', 'important']);
  });
});