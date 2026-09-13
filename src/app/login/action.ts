"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error: string } | null;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      // Home redirects by role: ADMIN -> /admin, VENDOR -> /vendor
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error; // rethrow NEXT_REDIRECT so the redirect happens
  }
  return null;
}
