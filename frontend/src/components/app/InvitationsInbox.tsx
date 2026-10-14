import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { toast } from "../../stores/toast";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Spinner } from "../ui/Spinner";

export function InvitationsInbox() {
  const { data, isLoading } = useQuery({
    queryKey: ["invites"],
    queryFn: () => api.myPendingInvites(),
  });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const accept = useMutation({
    mutationFn: (token: string) => api.acceptInvite(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Invitation accepted");
      navigate("/boards");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to accept"),
  });

  const reject = useMutation({
    mutationFn: (token: string) => api.rejectInvite(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites"] });
      toast.success("Invitation declined");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to decline"),
  });

  if (isLoading) return <Spinner className="my-6" />;
  const invites = data?.boardInvitations ?? [];
  if (invites.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="mb-3 text-sm font-medium text-text-muted">Invitations</h2>
      <div className="flex flex-col gap-3">
        {invites.map((inv) => (
          <div
            key={inv.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4"
          >
            <div className="flex items-center gap-3">
              <p className="text-sm text-text">
                <span className="font-medium">{inv.sender?.name ?? "Someone"}</span>{" "}
                <span className="text-text-muted">
                  invited you to collaborate on
                </span>{" "}
                <span className="font-medium">{inv.board?.name}</span>
              </p>
              <Badge color="muted">{inv.role}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                loading={accept.isPending}
                onClick={() => accept.mutate(inv.token)}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="ghost"
                loading={reject.isPending}
                onClick={() => reject.mutate(inv.token)}
              >
                Decline
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
