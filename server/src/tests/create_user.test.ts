import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';
import { pbkdf2Sync } from 'crypto';

// Helper function to verify password
const verifyPassword = (password: string, hashedPassword: string): boolean => {
  const [salt, hash] = hashedPassword.split(':');
  const verifyHash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
};

// Test input with all required fields
const testInput: CreateUserInput = {
  email: 'test@example.com',
  username: 'testuser',
  password: 'password123'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with valid input', async () => {
    const result = await createUser(testInput);

    // Validate all returned fields
    expect(result.email).toEqual('test@example.com');
    expect(result.username).toEqual('testuser');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('string');
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123'); // Should be hashed
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should hash the password using PBKDF2', async () => {
    const result = await createUser(testInput);

    // Verify password was properly hashed
    expect(result.password_hash).not.toEqual(testInput.password);
    expect(typeof result.password_hash).toBe('string');
    expect(result.password_hash.includes(':')).toBe(true); // Should contain salt:hash format
    expect(result.password_hash.length).toBeGreaterThan(100); // PBKDF2 hashes are long

    // Verify the hashed password can be verified against original
    const isValid = verifyPassword(testInput.password, result.password_hash);
    expect(isValid).toBe(true);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].username).toEqual('testuser');
    expect(users[0].password_hash).toEqual(result.password_hash);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error if email already exists', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same email
    const duplicateEmailInput: CreateUserInput = {
      email: 'test@example.com', // Same email
      username: 'differentuser',
      password: 'password456'
    };

    await expect(createUser(duplicateEmailInput))
      .rejects.toThrow(/email already exists/i);
  });

  it('should throw error if username already exists', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same username
    const duplicateUsernameInput: CreateUserInput = {
      email: 'different@example.com',
      username: 'testuser', // Same username
      password: 'password456'
    };

    await expect(createUser(duplicateUsernameInput))
      .rejects.toThrow(/username already exists/i);
  });

  it('should generate unique IDs for different users', async () => {
    const user1Input: CreateUserInput = {
      email: 'user1@example.com',
      username: 'user1',
      password: 'password123'
    };

    const user2Input: CreateUserInput = {
      email: 'user2@example.com',
      username: 'user2',
      password: 'password456'
    };

    const user1 = await createUser(user1Input);
    const user2 = await createUser(user2Input);

    expect(user1.id).not.toEqual(user2.id);
    expect(typeof user1.id).toBe('string');
    expect(typeof user2.id).toBe('string');
    expect(user1.id.length).toBeGreaterThan(0);
    expect(user2.id.length).toBeGreaterThan(0);
  });

  it('should create users with different passwords correctly', async () => {
    const user1Input: CreateUserInput = {
      email: 'user1@example.com',
      username: 'user1',
      password: 'password123'
    };

    const user2Input: CreateUserInput = {
      email: 'user2@example.com',
      username: 'user2',
      password: 'differentpassword'
    };

    const user1 = await createUser(user1Input);
    const user2 = await createUser(user2Input);

    // Passwords should be hashed differently
    expect(user1.password_hash).not.toEqual(user2.password_hash);

    // Each hash should validate against its original password
    const user1Valid = verifyPassword('password123', user1.password_hash);
    const user2Valid = verifyPassword('differentpassword', user2.password_hash);
    
    expect(user1Valid).toBe(true);
    expect(user2Valid).toBe(true);

    // Cross-validation should fail
    const user1CrossValid = verifyPassword('differentpassword', user1.password_hash);
    const user2CrossValid = verifyPassword('password123', user2.password_hash);
    
    expect(user1CrossValid).toBe(false);
    expect(user2CrossValid).toBe(false);
  });

  it('should generate different salt for each password hash', async () => {
    const input1: CreateUserInput = {
      email: 'user1@example.com',
      username: 'user1',
      password: 'samepassword'
    };

    const input2: CreateUserInput = {
      email: 'user2@example.com',
      username: 'user2',
      password: 'samepassword' // Same password
    };

    const user1 = await createUser(input1);
    const user2 = await createUser(input2);

    // Even with same password, hashes should be different due to different salts
    expect(user1.password_hash).not.toEqual(user2.password_hash);

    // Both should still verify correctly
    const user1Valid = verifyPassword('samepassword', user1.password_hash);
    const user2Valid = verifyPassword('samepassword', user2.password_hash);
    
    expect(user1Valid).toBe(true);
    expect(user2Valid).toBe(true);
  });
});