import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { getDbConnection } from "../db/connection";

export type AuthUserRecord = {
  id: string;
  first_name: string;
  last_name: string;
  gender: "Male" | "Female";
  login_id: string;
  password_hash: string;
  is_active: number;
  password_changed_at: string;
};

export function findUserByLoginId(loginId: string): AuthUserRecord | undefined {
  return getDbConnection()
    .prepare(
      `SELECT id, first_name, last_name, gender, login_id, password_hash,
              is_active, password_changed_at
       FROM users
       WHERE login_id = ? COLLATE NOCASE
       LIMIT 1`,
    )
    .get(loginId.trim()) as AuthUserRecord | undefined;
}

export function findUserById(id: string): AuthUserRecord | undefined {
  return getDbConnection()
    .prepare(
      `SELECT id, first_name, last_name, gender, login_id, password_hash,
              is_active, password_changed_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
    )
    .get(id) as AuthUserRecord | undefined;
}

export function createUser(input: {
  firstName: string;
  lastName: string;
  gender: "Male" | "Female";
  loginId: string;
  passwordHash: string;
}) {
  const now = new Date().toISOString();
  const id = randomUUID();
  getDbConnection()
    .prepare(
      `INSERT INTO users
        (id, first_name, last_name, gender, login_id, password_hash,
         is_active, created_at, updated_at, password_changed_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
    )
    .run(
      id,
      input.firstName.trim(),
      input.lastName.trim(),
      input.gender,
      input.loginId.trim(),
      input.passwordHash,
      now,
      now,
      now,
    );
  return id;
}

export function updateUserPassword(id: string, passwordHash: string) {
  const now = new Date().toISOString();
  return getDbConnection()
    .prepare(
      `UPDATE users
       SET password_hash = ?, updated_at = ?, password_changed_at = ?
       WHERE id = ? AND is_active = 1`,
    )
    .run(passwordHash, now, now, id);
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = findUserByLoginId(credentials.username);

        if (!user || !user.is_active) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password_hash,
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          name: `${user.first_name} ${user.last_name}`.trim(),
          loginId: user.login_id,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.loginId = user.loginId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId;
        session.user.loginId = token.loginId ?? "";
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      return baseUrl + "/dashboard";
    },
  },
};