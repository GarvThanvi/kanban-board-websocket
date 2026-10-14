import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../stores/auth";
import { toast } from "../stores/toast";
import { AuthLayout } from "../components/auth/AuthLayout";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const setAuth = useAuth((s) => s.setAuth);
  const navigate = useNavigate();
  const location = useLocation();

  const from =
    (location.state as { from?: string } | null)?.from ?? "/boards";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.signin({ email, password });
      setAuth(res.token, res.data);
      toast.success(`Welcome back, ${res.data.name}`);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-xl font-semibold">Welcome back</h1>
      <p className="mt-1 text-sm text-text-muted">
        Sign in to your workspace
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
        <Input
          label="Password"
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <Button type="submit" loading={loading} className="w-full">
          Sign in
        </Button>
      </form>
      <div className="mt-4 flex items-center justify-between text-[13px]">
        <Link to="/forgot-password" className="text-text-muted hover:text-text">
          Forgot password?
        </Link>
        <span className="text-text-faint">
          No account?{" "}
          <Link to="/signup" className="text-text hover:underline">
            Sign up
          </Link>
        </span>
      </div>
    </AuthLayout>
  );
}
