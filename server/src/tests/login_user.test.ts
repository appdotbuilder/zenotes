import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput } from '../schema';
import { loginUser } from '../handlers/login_user';

// Test user data
const testUser = {
  id: 'test-user-1',
  email: 'test@example.com',
  username: 'testuser',
  password_hash: 'plain_password_123', // In production, this would be hashed
  created_at: new Date(),
  updated_at: new Date()
};

const validLoginInput: LoginUserInput = {
  email: 'test@example.com',
  password: 'plain_password_123'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully login with valid credentials', async () => {
    // Create test user in database
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await loginUser(validLoginInput);

    // Verify returned user data
    expect(result.id).toEqual('test-user-1');
    expect(result.email).toEqual('test@example.com');
    expect(result.username).toEqual('testuser');
    expect(result.password_hash).toEqual('plain_password_123');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent email', async () => {
    const nonExistentEmailInput: LoginUserInput = {
      email: 'nonexistent@example.com',
      password: 'any_password'
    };

    await expect(loginUser(nonExistentEmailInput))
      .rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for incorrect password', async () => {
    // Create test user in database
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const incorrectPasswordInput: LoginUserInput = {
      email: 'test@example.com',
      password: 'wrong_password'
    };

    await expect(loginUser(incorrectPasswordInput))
      .rejects.toThrow(/invalid email or password/i);
  });

  it('should be case sensitive for email', async () => {
    // Create test user in database
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const caseSensitiveEmailInput: LoginUserInput = {
      email: 'TEST@EXAMPLE.COM',
      password: 'plain_password_123'
    };

    await expect(loginUser(caseSensitiveEmailInput))
      .rejects.toThrow(/invalid email or password/i);
  });

  it('should handle empty database gracefully', async () => {
    // No users in database
    await expect(loginUser(validLoginInput))
      .rejects.toThrow(/invalid email or password/i);
  });

  it('should return exact user data from database', async () => {
    const specificDate = new Date('2023-01-01T10:00:00Z');
    const userWithSpecificDates = {
      id: 'user-with-dates',
      email: 'dateuser@example.com',
      username: 'dateuser',
      password_hash: 'test_password',
      created_at: specificDate,
      updated_at: specificDate
    };

    await db.insert(usersTable)
      .values(userWithSpecificDates)
      .execute();

    const loginInput: LoginUserInput = {
      email: 'dateuser@example.com',
      password: 'test_password'
    };

    const result = await loginUser(loginInput);

    expect(result.created_at.getTime()).toEqual(specificDate.getTime());
    expect(result.updated_at.getTime()).toEqual(specificDate.getTime());
    expect(result.username).toEqual('dateuser');
  });

  it('should handle special characters in email and password', async () => {
    const specialUser = {
      id: 'special-user',
      email: 'test+special@example-domain.co.uk',
      username: 'specialuser',
      password_hash: 'password!@#$%^&*()',
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.insert(usersTable)
      .values(specialUser)
      .execute();

    const specialLoginInput: LoginUserInput = {
      email: 'test+special@example-domain.co.uk',
      password: 'password!@#$%^&*()'
    };

    const result = await loginUser(specialLoginInput);

    expect(result.email).toEqual('test+special@example-domain.co.uk');
    expect(result.password_hash).toEqual('password!@#$%^&*()');
  });
});