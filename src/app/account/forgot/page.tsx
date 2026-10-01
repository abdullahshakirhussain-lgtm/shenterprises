import ForgotForm from "./ForgotForm";

export const metadata = { title: "Reset password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <div className="container-x py-12">
      <ForgotForm />
    </div>
  );
}
