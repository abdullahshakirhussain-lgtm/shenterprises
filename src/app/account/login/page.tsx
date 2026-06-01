import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = { title: "Log in", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <div className="container-x py-12">
      <Suspense fallback={<div className="text-center text-brand-700">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
