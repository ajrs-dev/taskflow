/**
 * Shared types for database rows and the authenticated request shape.
 */

export interface UserRow {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
}

export interface BoardRow {
  id: number;
  user_id: number;
  title: string;
  created_at: string;
}

export interface ListRow {
  id: number;
  board_id: number;
  title: string;
  position: number;
}

export interface CardRow {
  id: number;
  list_id: number;
  title: string;
  description: string;
  position: number;
  created_at: string;
}

/** The user payload we encode into the JWT and attach to requests. */
export interface AuthUser {
  id: number;
  email: string;
}

// Make `req.user` available and typed across the app.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
