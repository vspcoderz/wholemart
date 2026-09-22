"use client";

import { useEffect, useState, useTransition } from "react";
import { Lock01, LogOut01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Toggle } from "@/components/base/toggle/toggle";
import { Modal, ModalOverlay } from "@/components/application/modals/modal";
import { useColorMode } from "@/components/AppProviders";
import { useLang, type Lang } from "@/lib/i18n";
import { changeMyPassword } from "@/lib/actions/account";
import { cx } from "@/utils/cx";

export default function ProfileClient({
  businessName,
  contactPerson,
  phone,
  address,
  email,
  signOutAction,
}: {
  businessName: string;
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
  email: string;
  signOutAction: () => Promise<void>;
}) {
  const { t, lang, setLang } = useLang();
  const { mode, toggle } = useColorMode();
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const tt = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(tt);
  }, [toast]);

  function submitPassword() {
    if (next !== confirm) {
      setToast({ msg: t("passwordMismatch"), ok: false });
      return;
    }
    if (next.length < 6) {
      setToast({ msg: t("passwordTooShort"), ok: false });
      return;
    }
    startTransition(async () => {
      const res = await changeMyPassword(current, next);
      if (res.ok) {
        setToast({ msg: t("passwordChanged"), ok: true });
        setDialog(false);
        setCurrent("");
        setNext("");
        setConfirm("");
      } else {
        setToast({
          msg: res.error === "WRONG_CURRENT" ? t("wrongPassword") : t("passwordTooShort"),
          ok: false,
        });
      }
    });
  }

  const rows: [string, string | null][] = [
    [t("contactPerson"), contactPerson],
    [t("phone"), phone],
    [t("deliveryAddress"), address],
    [t("email"), email],
  ];

  return (
    <div className="pb-2">
      <h1 className="mb-2 text-md font-semibold text-primary">{t("profile")}</h1>
      <section className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary sm:p-6">
        <h2 className="text-md font-semibold text-primary">{businessName}</h2>
        <p className="mt-0.5 text-sm text-tertiary">{t("profileInfo")}</p>
        <hr className="my-3 border-none bg-border-secondary" style={{ height: 1 }} />
        {rows.map(([label, value]) => (
          <div key={label} className="mb-3">
            <p className="text-xs text-quaternary">{label}</p>
            <p className="text-sm text-primary">{value || "—"}</p>
          </div>
        ))}
        <hr className="my-3 border-none bg-border-secondary" style={{ height: 1 }} />
        <div className="flex items-center justify-between">
          <p className="text-sm text-tertiary">भाषा / Language</p>
          <div className="flex gap-1.5">
            {(["mr", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className="cursor-pointer outline-focus-ring focus-visible:outline-2"
              >
                <Badge size="sm" type="pill-color" color={lang === l ? "brand" : "gray"}>
                  {l === "mr" ? "मराठी" : "English"}
                </Badge>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-tertiary">Dark mode</p>
          <Toggle
            size="sm"
            aria-label="Dark mode"
            isSelected={mode === "dark"}
            onChange={toggle}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" color="secondary" iconLeading={Lock01} onClick={() => setDialog(true)}>
            {t("changePassword")}
          </Button>
        </div>
        <form action={signOutAction}>
          <Button size="sm" color="secondary-destructive" iconLeading={LogOut01} type="submit" className="mt-2">
            {t("signOut")}
          </Button>
        </form>
      </section>

      <ModalOverlay isOpen={dialog} onOpenChange={(o) => !o && setDialog(false)} isDismissable>
        <Modal className="sm:max-w-sm">
          <div className="p-6">
            <h2 className="text-md font-semibold text-primary">{t("changePassword")}</h2>
            <div className="mt-4 flex flex-col gap-3">
              <Input
                size="md"
                label={t("currentPassword")}
                type="password"
                value={current}
                onChange={(v: string) => setCurrent(v)}
                autoComplete="current-password"
              />
              <Input
                size="md"
                label={t("newPassword")}
                type="password"
                value={next}
                onChange={(v: string) => setNext(v)}
                autoComplete="new-password"
                hint={t("passwordTooShort")}
              />
              <Input
                size="md"
                label={t("confirmPassword")}
                type="password"
                value={confirm}
                onChange={(v: string) => setConfirm(v)}
                autoComplete="new-password"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button size="md" color="secondary" onClick={() => setDialog(false)}>
                {t("cancel")}
              </Button>
              <Button size="md" color="primary" isLoading={pending} onClick={submitPassword}>
                {t("changePassword")}
              </Button>
            </div>
          </div>
        </Modal>
      </ModalOverlay>

      {toast && (
        <div
          role="status"
          className={cx(
            "fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl p-3.5 text-sm font-medium shadow-lg ring-1 ring-inset",
            toast.ok
              ? "bg-success-solid text-white ring-transparent"
              : "bg-error-solid text-white ring-transparent",
          )}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
