import { Suspense } from "react";
import RegisterForm from "./RegisterForm";

export const metadata = { title: "Create an account", robots: { index: false, follow: false } };

export default function RegisterPage() {
  return (
    <div className="container-x py-12">
      <Suspense fallback={<div className="text-center text-brand-700">Loading…</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
