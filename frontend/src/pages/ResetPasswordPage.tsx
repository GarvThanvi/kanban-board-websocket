import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CircleAlert } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "../stores/toast";
import { AuthLayout } from "../components/auth/AuthLayout";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [invalid, setInvalid] = useState<string | null>(null);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword({ token: token ?? "", password });
      toast.success("Password updated — sign in with your new password");
      navigate("/signin");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Reset failed";
      if (msg.toLowerCase().includes("token")) setInvalid(msg);
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {invalid ? (
        <div className="text-center">
          <CircleAlert className="mx-auto size-8 text-danger" />
          <h1 className="mt-3 text-xl font-semibold">Link invalid or expired</h1>
          <p className="mt-1 text-sm text-text-muted">{invalid}</p>
          <Link
            to="/forgot-password"
            className="mt-6 inline-block text-[13px] text-text-muted hover:text-text"
          >
            Request a new reset link
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-xl font-semibold">Set a new password</h1>
          <p className="mt-1 text-sm text-text-muted">
            Choose a password with at least 8 characters.
          </p>
          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            <Input
              label="New password"
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
            <Input
              label="Confirm password"
              id="confirm"
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
            />
            <Button type="submit" loading={loading} className="w-full">
              Reset password
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
