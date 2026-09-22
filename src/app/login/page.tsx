import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-secondary p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
