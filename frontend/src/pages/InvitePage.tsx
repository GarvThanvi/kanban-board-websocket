import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CircleAlert, Mail } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../stores/auth";
import { toast } from "../stores/toast";
import { AuthLayout } from "../components/auth/AuthLayout";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const authed = useAuth((s) => s.token);
  const [done, setDone] = useState<"accepted" | "rejected" | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["invitePreview", token],
    queryFn: () => api.invitePreview(token!),
    enabled: !!token,
  });

  const accept = useMutation({
    mutationFn: () => api.acceptInvite(token!),
    onSuccess: () => {
      toast.success("Invitation accepted");
      navigate("/boards");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to accept"),
  });

  const reject = useMutation({
    mutationFn: () => api.rejectInvite(token!),
    onSuccess: () => {
      toast.success("Invitation declined");
      setDone("rejected");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to decline"),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <AuthLayout>
        <div className="text-center">
          <CircleAlert className="mx-auto size-8 text-danger" />
          <h1 className="mt-3 text-xl font-semibold">Invitation not found</h1>
          <p className="mt-1 text-sm text-text-muted">
            This link is invalid or the invitation no longer exists.
          </p>
        </div>
      </AuthLayout>
    );
  }

  const inv = data.invitation;

  if (done === "rejected" || inv.status !== "PENDING") {
    return (
      <AuthLayout>
        <div className="text-center">
          <CircleAlert className="mx-auto size-8 text-text-faint" />
          <h1 className="mt-3 text-xl font-semibold">
            {done === "rejected"
              ? "Invitation declined"
              : `Invitation already ${inv.status.toLowerCase()}`}
          </h1>
          <Link
            to={authed ? "/boards" : "/signin"}
            className="mt-6 inline-block text-[13px] text-accent hover:text-accent-hover"
          >
            {authed ? "Back to boards" : "Sign in"}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  const respond = (action: "accept" | "decline") => {
    if (!authed) {
      navigate("/signin", { state: { from: `/invite/${token}` } });
      return;
    }
    if (action === "accept") accept.mutate();
    else reject.mutate();
  };

  return (
    <AuthLayout>
      <div className="text-center">
        <span className="mx-auto flex size-10 items-center justify-center rounded-xl bg-accent/15">
          <Mail className="size-5 text-accent" />
        </span>
        <h1 className="mt-4 text-xl font-semibold">
          {inv.inviter.name} invited you
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          to collaborate on{" "}
          <span className="font-medium text-text">{inv.boardName}</span>
        </p>
        <div className="mt-3">
          <Badge color="accent">{inv.role}</Badge>
        </div>

        {inv.expired && (
          <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
            This invitation has expired. Ask the sender to resend it.
          </p>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <Button
            disabled={inv.expired}
            loading={accept.isPending}
            onClick={() => respond("accept")}
          >
            Accept
          </Button>
          <Button
            variant="ghost"
            disabled={inv.expired}
            loading={reject.isPending}
            onClick={() => respond("decline")}
          >
            Decline
          </Button>
        </div>

        {!authed && (
          <p className="mt-4 text-[13px] text-text-faint">
            You'll be asked to sign in first.
          </p>
        )}
      </div>
    </AuthLayout>
  );
}
