import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    papel?: string;
  }
  interface Session {
    user: {
      id: string;
      papel: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    papel?: string;
  }
}
