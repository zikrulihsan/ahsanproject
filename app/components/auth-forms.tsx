"use client";

import { useActionState } from "react";
import {
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
  type AuthState,
} from "../auth-actions";

const EMPTY: AuthState = { values: {} };

export function SignInForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signIn, EMPTY);

  return (
    <form className="auth-form" action={formAction}>
      <Message state={state} />
      <input type="hidden" name="next" value={next} />

      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.values.email} />

      <label htmlFor="password">Kata sandi</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required />

      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Sebentar…" : "Masuk"}
      </button>
    </form>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signUp, EMPTY);

  return (
    <form className="auth-form" action={formAction}>
      <Message state={state} />
      <input type="hidden" name="next" value={next} />

      <label htmlFor="name">Nama</label>
      <input id="name" name="name" type="text" autoComplete="name" required defaultValue={state.values.name} />
      <p className="hint">Nama ini yang muncul di halaman project dan di profilmu.</p>

      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.values.email} />

      <label htmlFor="password">Kata sandi</label>
      <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      <p className="hint">Minimal 8 karakter.</p>

      <label htmlFor="confirm">Ulangi kata sandi</label>
      <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />

      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Sebentar…" : "Daftar"}
      </button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, EMPTY);

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
      <p className="hint">Pakai alamat yang kamu pakai waktu daftar.</p>

      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Mengirim…" : "Kirim tautannya"}
      </button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, EMPTY);

  return (
    <form className="auth-form" action={formAction}>
      <Message state={state} />

      <label htmlFor="password">Kata sandi baru</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
      />
      <p className="hint">Minimal 8 karakter.</p>

      <label htmlFor="confirm">Ulangi kata sandi baru</label>
      <input
        id="confirm"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
      />

      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan kata sandi"}
      </button>
    </form>
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
