import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tagsTable } from '../db/schema';
import { type GetUserTagsInput } from '../schema';
import { getUserTags } from '../handlers/get_user_tags';

// Test users
const testUser1 = {
  id: 'user-1',
  email: 'user1@test.com',
  username: 'testuser1',
  password_hash: 'hashedpassword1'
};

const testUser2 = {
  id: 'user-2',
  email: 'user2@test.com',
  username: 'testuser2',
  password_hash: 'hashedpassword2'
};

// Test tags
const testTag1 = {
  id: 'tag-1',
  name: 'Important',
  color: '#ff0000',
  user_id: 'user-1'
};

const testTag2 = {
  id: 'tag-2',
  name: 'Work',
  color: '#0000ff',
  user_id: 'user-1'
};

const testTag3 = {
  id: 'tag-3',
  name: 'Personal',
  color: null,
  user_id: 'user-1'
};

const testTag4 = {
  id: 'tag-4',
  name: 'Archive',
  color: '#00ff00',
  user_id: 'user-2'
};

const testInput: GetUserTagsInput = {
  user_id: 'user-1'
};

describe('getUserTags', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get all tags for a user', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([testUser1, testUser2])
      .execute();

    // Create test tags
    await db.insert(tagsTable)
      .values([testTag1, testTag2, testTag3, testTag4])
      .execute();

    const result = await getUserTags(testInput);

    // Should return 3 tags for user-1 (not the tag for user-2)
    expect(result).toHaveLength(3);
    
    // Should be sorted alphabetically by name
    expect(result[0].name).toEqual('Important');
    expect(result[1].name).toEqual('Personal');
    expect(result[2].name).toEqual('Work');

    // Verify all tags belong to the correct user
    result.forEach(tag => {
      expect(tag.user_id).toEqual('user-1');
    });

    // Verify tag properties
    const importantTag = result.find(tag => tag.name === 'Important');
    expect(importantTag).toBeDefined();
    expect(importantTag!.id).toEqual('tag-1');
    expect(importantTag!.color).toEqual('#ff0000');
    expect(importantTag!.created_at).toBeInstanceOf(Date);
    expect(importantTag!.updated_at).toBeInstanceOf(Date);

    const personalTag = result.find(tag => tag.name === 'Personal');
    expect(personalTag).toBeDefined();
    expect(personalTag!.color).toBeNull();
  });

  it('should return empty array when user has no tags', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([testUser1, testUser2])
      .execute();

    // Create tags only for user-2
    await db.insert(tagsTable)
      .values([testTag4])
      .execute();

    const result = await getUserTags(testInput);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return empty array for non-existent user', async () => {
    const nonExistentUserInput: GetUserTagsInput = {
      user_id: 'non-existent-user'
    };

    const result = await getUserTags(nonExistentUserInput);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should sort tags alphabetically by name', async () => {
    // Create test user
    await db.insert(usersTable)
      .values([testUser1])
      .execute();

    // Create tags with names in non-alphabetical order
    const unsortedTags = [
      { id: 'tag-z', name: 'Zebra', color: null, user_id: 'user-1' },
      { id: 'tag-a', name: 'Apple', color: null, user_id: 'user-1' },
      { id: 'tag-m', name: 'Middle', color: null, user_id: 'user-1' },
      { id: 'tag-b', name: 'Banana', color: null, user_id: 'user-1' }
    ];

    await db.insert(tagsTable)
      .values(unsortedTags)
      .execute();

    const result = await getUserTags(testInput);

    expect(result).toHaveLength(4);
    expect(result[0].name).toEqual('Apple');
    expect(result[1].name).toEqual('Banana');
    expect(result[2].name).toEqual('Middle');
    expect(result[3].name).toEqual('Zebra');
  });

  it('should handle tags with different colors correctly', async () => {
    // Create test user
    await db.insert(usersTable)
      .values([testUser1])
      .execute();

    const colorTags = [
      { id: 'tag-red', name: 'Red Tag', color: '#ff0000', user_id: 'user-1' },
      { id: 'tag-blue', name: 'Blue Tag', color: '#0000ff', user_id: 'user-1' },
      { id: 'tag-null', name: 'No Color Tag', color: null, user_id: 'user-1' }
    ];

    await db.insert(tagsTable)
      .values(colorTags)
      .execute();

    const result = await getUserTags(testInput);

    expect(result).toHaveLength(3);
    
    const redTag = result.find(tag => tag.name === 'Red Tag');
    const blueTag = result.find(tag => tag.name === 'Blue Tag');
    const noColorTag = result.find(tag => tag.name === 'No Color Tag');

    expect(redTag!.color).toEqual('#ff0000');
    expect(blueTag!.color).toEqual('#0000ff');
    expect(noColorTag!.color).toBeNull();
  });
});