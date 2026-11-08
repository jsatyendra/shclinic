import "next-auth";
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    loginId: string;
  }

  interface Session {
    user: {
      id: string;
      loginId: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    loginId?: string;
  }
}