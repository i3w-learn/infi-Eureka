import { query, queryOne } from '../../config/db.js';
import type { UserRow } from '../../models/user.js';
import type { CreateUserInput, IUserDao } from '../interfaces/user-dao.interface.js';

export class UserDao implements IUserDao {
  async findById(id: string): Promise<UserRow | null> {
    return queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
  }

  async findByPhone(phone: string): Promise<UserRow | null> {
    return queryOne<UserRow>('SELECT * FROM users WHERE phone = $1', [phone]);
  }

  async create(input: CreateUserInput): Promise<UserRow> {
    const result = await query<UserRow>(
      `INSERT INTO users (phone, date_of_birth, name, class, subjects, goals, learning_preference)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.phone,
        input.dateOfBirth,
        input.username ?? null,
        input.studentClass ?? null,
        input.subjects ?? null,
        input.goals ?? null,
        input.learningPreference ?? null,
      ],
    );
    return result.rows[0]!;
  }

  async isPremium(userId: string): Promise<boolean> {
    const row = await queryOne<{ is_premium: boolean }>(
      'SELECT is_premium FROM users WHERE id = $1',
      [userId],
    );
    return row?.is_premium ?? false;
  }

  async grantPremium(userId: string): Promise<void> {
    await query('UPDATE users SET is_premium = TRUE, updated_at = NOW() WHERE id = $1', [userId]);
  }
}
