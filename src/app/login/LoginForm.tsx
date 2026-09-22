"use client";

import { useActionState } from "react";
import { AlertCircle, Lock01, Mail01, ShoppingBag02 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { APP_NAME } from "@/lib/brand";
import { loginAction, type LoginState } from "./action";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    null,
  );

  return (
    <div className="w-full max-w-100 rounded-2xl bg-primary p-6 shadow-lg ring-1 ring-secondary sm:p-8">
      <div className="mb-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-brand-solid text-white shadow-xs">
          <ShoppingBag02 className="size-6" />
        </span>
        <h1 className="mt-3 text-display-xs font-semibold text-primary">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-tertiary">
          Wholesale ordering for retailers, hotels &amp; vendors
        </p>
      </div>

      {state?.error && (
        <p
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg bg-error-primary p-3 text-sm font-medium text-error-primary ring-1 ring-error_subtle ring-inset"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      )}

      <form action={formAction} noValidate className="flex flex-col gap-4">
        <Input
          size="lg"
          label="Email"
          name="email"
          type="email"
          isRequired
          autoComplete="email"
          icon={Mail01}
          placeholder="you@shop.com"
        />
        <Input
          size="lg"
          label="Password"
          name="password"
          type="password"
          isRequired
          autoComplete="current-password"
          icon={Lock01}
          placeholder="••••••••"
        />
        <Button size="lg" color="primary" type="submit" isLoading={pending} showTextWhileLoading className="w-full">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
