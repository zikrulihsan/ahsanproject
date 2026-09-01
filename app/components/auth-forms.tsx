"use client";

import Link from "@/app/components/responsive-link";
import { useActionState, useState } from "react";
import {
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
  type AuthState,
} from "../auth-actions";
import { useLanguage } from "./language-provider";

const EMPTY: AuthState = { values: {} };

export function SignInForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, EMPTY);
  const { tx } = useLanguage();

  return (
    <form className="auth-form signin-form" action={formAction}>
      <Message state={state} />
      <input type="hidden" name="next" value={next} />

      <GoogleButton next={next} />
      <AuthDivider />

      <div className="auth-field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="nama@email.com"
          required
          defaultValue={state.values.email}
        />
      </div>

      <div className="auth-field">
        <div className="auth-label-row">
          <label htmlFor="password">{tx("Kata sandi", "Password")}</label>
          <Link href="/forgot-password">{tx("Lupa kata sandi?", "Forgot password?")}</Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder={tx("Masukkan kata sandi", "Enter your password")}
          required
        />
      </div>

      <button className="primary-button auth-submit" type="submit" disabled={pending} aria-busy={pending || undefined}>
        <span>{pending ? tx("Mohon tunggu…", "Please wait…") : tx("Masuk dengan email", "Sign in with email")}</span>
        {!pending ? <span aria-hidden="true">→</span> : null}
      </button>
    </form>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signUp, EMPTY);
  const { tx } = useLanguage();

  return (
    <form className="auth-form" action={formAction}>
      <Message state={state} />
      <input type="hidden" name="next" value={next} />

      <GoogleButton next={next} />
      <AuthDivider />

      <label htmlFor="name">{tx("Nama", "Name")}</label>
      <input id="name" name="name" type="text" autoComplete="name" required defaultValue={state.values.name} />
      <p className="hint">{tx("Nama ini ditampilkan pada proyek dan profilmu.", "This name appears on your projects and profile.")}</p>

      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.values.email} />

      <label htmlFor="password">{tx("Kata sandi", "Password")}</label>
      <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      <p className="hint">{tx("Minimal 8 karakter.", "At least 8 characters.")}</p>

      <label htmlFor="confirm">{tx("Ulangi kata sandi", "Repeat password")}</label>
      <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />

      <button className="primary-button" type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? tx("Mohon tunggu…", "Please wait…") : tx("Buat akun", "Create account")}
      </button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, EMPTY);
  const { tx } = useLanguage();

  return (
    <form className="auth-form" action={formAction}>
      <Message state={state} />

      <label htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values.email}
      />
      <p className="hint">{tx("Gunakan alamat yang terhubung dengan akunmu.", "Use the address associated with your account.")}</p>

      <button className="primary-button" type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? tx("Mengirim…", "Sending…") : tx("Kirim tautan pengaturan ulang", "Send reset link")}
      </button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, EMPTY);
  const { tx } = useLanguage();

  return (
    <form className="auth-form" action={formAction}>
      <Message state={state} />

      <label htmlFor="password">{tx("Kata sandi baru", "New password")}</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
      />
      <p className="hint">{tx("Minimal 8 karakter.", "At least 8 characters.")}</p>

      <label htmlFor="confirm">{tx("Ulangi kata sandi baru", "Repeat new password")}</label>
      <input
        id="confirm"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
      />

      <button className="primary-button" type="submit" disabled={pending} aria-busy={pending || undefined}>
        {pending ? tx("Menyimpan…", "Saving…") : tx("Simpan kata sandi", "Save password")}
      </button>
    </form>
  );
}

/**
 * A link, not a submit button.
 *
 * Starting the sign-in has to hand the browser a cookie — the PKCE verifier —
 * on the same response that sends it to Google. That is what `/auth/google`
 * does. Going through a form action meant the verifier had to survive an action
 * response and a client-side navigation off-site first, which is where it was
 * being lost. A link also works with JavaScript switched off.
 */
function GoogleButton({ next }: { next: string }) {
  const { tx } = useLanguage();
  const [pending, setPending] = useState(false);
  const href = next === "/" ? "/auth/google" : `/auth/google?next=${encodeURIComponent(next)}`;

  return (
    <a
      className="google-auth-button"
      href={href}
      aria-busy={pending || undefined}
      aria-disabled={pending || undefined}
      onClick={(event) => {
        const plainClick = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
        if (!plainClick) return;
        if (pending) {
          event.preventDefault();
          return;
        }
        setPending(true);
      }}
    >
      {pending ? <span className="action-spinner" aria-hidden="true" /> : <GoogleMark />}
      <span>{pending ? tx("Menghubungkan…", "Connecting…") : tx("Lanjutkan dengan Google", "Continue with Google")}</span>
    </a>
  );
}

function AuthDivider() {
  const { tx } = useLanguage();
  return (
    <div className="auth-divider" aria-hidden="true">
      <span>{tx("atau gunakan email", "or use email")}</span>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19">
      <path
        fill="#4285f4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.01v2.53h3.24c1.9-1.75 2.98-4.33 2.98-7.38Z"
      />
      <path
        fill="#34a853"
        d="M12 22c2.7 0 4.98-.9 6.63-2.4l-3.24-2.52c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.6A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#fbbc05"
        d="M6.39 13.91A6.01 6.01 0 0 1 6.07 12c0-.66.11-1.3.32-1.91v-2.6H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.51l3.35-2.6Z"
      />
      <path
        fill="#ea4335"
        d="M12 5.96c1.47 0 2.78.5 3.81 1.49l2.88-2.88A9.65 9.65 0 0 0 12 2a10 10 0 0 0-8.96 5.49l3.35 2.6C7.18 7.72 9.39 5.96 12 5.96Z"
      />
    </svg>
  );
}

function Message({ state }: { state: AuthState }) {
  if (state.error) {
    return (
      <p className="form-error" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.notice) {
    return (
      <p className="form-notice" role="status">
        {state.notice}
      </p>
    );
  }
  return null;
}
