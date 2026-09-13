import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      role: "ADMIN" | "VENDOR";
      name?: string | null;
      email?: string | null;
    };
  }
  interface User {
    role: "ADMIN" | "VENDOR";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "ADMIN" | "VENDOR";
    uid?: number;
  }
}
