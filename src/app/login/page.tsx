import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-secondary p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
