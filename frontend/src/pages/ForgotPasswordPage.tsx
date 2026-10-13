import { useState } from "react";
import { Link } from "react-router-dom";
import { CircleCheck } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "../stores/toast";
import { AuthLayout } from "../components/auth/AuthLayout";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.forgotPassword({ email });
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {sent ? (
        <div className="text-center">
          <CircleCheck className="mx-auto size-8 text-emerald-400" />
          <h1 className="mt-3 text-xl font-semibold">Check your inbox</h1>
          <p className="mt-1 text-sm text-text-muted">
            If that email is registered, a reset link has been sent.
          </p>
          <Link
            to="/signin"
            className="mt-6 inline-block text-[13px] text-accent hover:text-accent-hover"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-xl font-semibold">Reset your password</h1>
          <p className="mt-1 text-sm text-text-muted">
            Enter your email and we'll send you a reset link.
          </p>
          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            <Input
              label="Email"
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
            <Button type="submit" loading={loading} className="w-full">
              Send reset link
            </Button>
          </form>
          <p className="mt-4 text-center text-[13px] text-text-faint">
            Remembered it?{" "}
            <Link to="/signin" className="text-text hover:underline">
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
