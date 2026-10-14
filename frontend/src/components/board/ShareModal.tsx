import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Link2, RotateCcw, Send, X } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../stores/auth";
import { toast } from "../../stores/toast";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { Avatar } from "../ui/Avatar";
import { Dropdown, DropdownItem } from "../ui/Dropdown";
import { EmptyState } from "../ui/EmptyState";
import { cn } from "../../lib/utils";
import type { BoardDetail } from "../../lib/types";

type Tab = "members" | "invite" | "public";

export function ShareModal({
  board,
  open,
  onClose,
}: {
  board: BoardDetail;
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("members");
  const user = useAuth((s) => s.user);

  // ShareModal is owner-only; the owner is always the current user
  const ownerName = user?.name ?? "Board owner";

  return (
    <Modal open={open} onClose={onClose} title="Share board" wide>
      <div className="mb-4 flex gap-1 border-b border-border">
        {(
          [
            ["members", "Members"],
            ["invite", "Invite"],
            ["public", "Public link"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "-mb-px border-b-2 border-transparent px-3 pb-2 text-[13px] font-medium text-text-muted hover:text-text",
              tab === key && "border-text/70 text-text"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "members" && <MembersTab board={board} ownerName={ownerName} />}
      {tab === "invite" && <InviteTab boardId={board.id} />}
      {tab === "public" && <PublicTab board={board} />}
    </Modal>
  );
}

function MembersTab({ board, ownerName }: { board: BoardDetail; ownerName: string }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["board", board.id] });

  const pending = useQuery({
    queryKey: ["boardInvites", board.id],
    queryFn: () => api.boardPendingInvites(board.id),
  });

  const changeRole = useMutation({
    mutationFn: (p: { userId: string; role: "EDITOR" | "VIEWER" }) =>
      api.updateMemberRole(board.id, p.userId, p.role),
    onSuccess: () => {
      invalidate();
      toast.success("Role updated");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to update role"),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => api.removeMember(board.id, userId),
    onSuccess: () => {
      invalidate();
      toast.success("Member removed");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to remove member"),
  });

  const revoke = useMutation({
    mutationFn: (invitationId: string) => api.revokeInvite(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardInvites", board.id] });
      toast.success("Invitation revoked");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to revoke invite"),
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between rounded-lg px-2 py-2">
        <div className="flex items-center gap-2.5">
          <Avatar name={ownerName} />
          <div>
            <p className="text-[13.5px] font-medium">{ownerName}</p>
            <p className="text-xs text-text-faint">Board owner</p>
          </div>
        </div>
        <Badge color="yellow">Owner</Badge>
      </div>

      {board.members.map((m) => (
        <div
          key={m.id}
          className="flex items-center justify-between rounded-lg px-2 py-2"
        >
          <div className="flex items-center gap-2.5">
            <Avatar name={m.user.name} />
            <div>
              <p className="text-[13.5px] font-medium">{m.user.name}</p>
              <p className="text-xs text-text-faint">{m.user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dropdown
              align="right"
              trigger={
                <Button size="sm" variant="secondary">
                  {m.role.toLowerCase()}
                </Button>
              }
            >
              {(["EDITOR", "VIEWER"] as const)
                .filter((r) => r !== m.role)
                .map((r) => (
                  <DropdownItem
                    key={r}
                    onClick={() => changeRole.mutate({ userId: m.userId, role: r })}
                  >
                    Make {r.toLowerCase()}
                  </DropdownItem>
                ))}
            </Dropdown>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => remove.mutate(m.userId)}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}

      {board.members.length === 0 && (
        <p className="px-2 py-3 text-[13px] text-text-faint">
          No collaborators yet — invite someone from the Invite tab.
        </p>
      )}

      {(pending.data?.pendingInvitations.length ?? 0) > 0 && (
        <>
          <p className="mt-3 mb-1 text-xs font-medium text-text-faint">
            Pending invitations
          </p>
          {pending.data!.pendingInvitations.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between rounded-lg px-2 py-1.5"
            >
              <p className="text-[13px] text-text-muted">{inv.email}</p>
              <div className="flex items-center gap-2">
                <Badge color="muted">{inv.role}</Badge>
                <button
                  onClick={() => revoke.mutate(inv.id)}
                  className="rounded-md p-1 text-text-faint hover:bg-white/5 hover:text-danger"
                  title="Revoke invitation"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function InviteTab({ boardId }: { boardId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"EDITOR" | "VIEWER">("EDITOR");
  const queryClient = useQueryClient();

  const send = useMutation({
    mutationFn: () => api.sendInvite(boardId, { email: email.trim(), role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boardInvites", boardId] });
      toast.success(`Invitation sent to ${email.trim()}`);
      setEmail("");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to send invite"),
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!email.trim()) return;
        send.mutate();
      }}
    >
      <Input
        label="Email"
        id="invite-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="teammate@company.com"
      />
      <div>
        <p className="mb-1.5 block text-[13px] font-medium text-text-muted">
          Role
        </p>
        <div className="flex gap-2">
          {(["EDITOR", "VIEWER"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                "flex-1 rounded-lg border px-3 py-2.5 text-left text-[13px] transition-colors",
                role === r
                  ? "border-border-strong bg-white/[0.07]"
                  : "border-border bg-surface-2 hover:border-border-strong"
              )}
            >
              <span className="flex items-center justify-between">
                <span className="font-medium capitalize">{r.toLowerCase()}</span>
                {role === r && <Check className="size-3.5 text-text" />}
              </span>
              <span className="block text-xs text-text-faint">
                {r === "EDITOR" ? "Can edit boards and cards" : "Read-only access"}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={send.isPending}>
          <Send className="size-3.5" />
          Send invite
        </Button>
      </div>
    </form>
  );
}

function PublicTab({ board }: { board: BoardDetail }) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["board", board.id] });
  const [copied, setCopied] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const create = useMutation({
    mutationFn: () => api.createPublicLink(board.id),
    onSuccess: () => {
      invalidate();
      toast.success("Public link created");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to create link"),
  });

  const toggle = useMutation({
    mutationFn: (enabled: boolean) => api.togglePublicLink(board.id, enabled),
    onSuccess: () => invalidate(),
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to toggle link"),
  });

  const rotate = useMutation({
    mutationFn: () => api.rotatePublicLink(board.id),
    onSuccess: () => {
      invalidate();
      toast.success("Link rotated — old links no longer work");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to rotate link"),
  });

  const remove = useMutation({
    mutationFn: () => api.deletePublicLink(board.id),
    onSuccess: () => {
      invalidate();
      toast.success("Public link deleted");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to delete link"),
  });

  if (!board.publicLink) {
    return (
      <EmptyState
        icon={<Link2 className="size-8" />}
        title="No public link"
        subtitle="Anyone with the link gets a live read-only view of this board — no account required."
        action={
          <Button loading={create.isPending} onClick={() => create.mutate()}>
            Create link
          </Button>
        }
      />
    );
  }

  const url = `${window.location.origin}/public/${board.publicLink.token}`;
  const enabled = board.publicLink.enabled;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-1.5 block text-[13px] font-medium text-text-muted">
          Share URL
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            className="h-9 w-full rounded-lg border border-border bg-surface-2 px-3 text-[13px] text-text-muted outline-none"
          />
          <Button variant="secondary" onClick={copy}>
            {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
            Copy
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3.5 py-3">
        <div>
          <p className="text-[13px] font-medium">Link enabled</p>
          <p className="text-xs text-text-faint">
            {enabled
              ? "Anyone with the link can view this board live"
              : "The link is disabled — visitors see nothing"}
          </p>
        </div>
        <button
          onClick={() => toggle.mutate(!enabled)}
          disabled={toggle.isPending}
          className={cn(
            "relative h-5 w-9 rounded-full transition-colors",
            enabled ? "bg-signal" : "bg-surface-3 border border-border"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 size-4 rounded-full bg-white transition-transform",
              enabled && "translate-x-4"
            )}
          />
        </button>
      </div>

      <div className="flex justify-between">
        <Button
          variant="secondary"
          loading={rotate.isPending}
          onClick={() => {
            if (!confirmRotate) {
              setConfirmRotate(true);
              setTimeout(() => setConfirmRotate(false), 3000);
              return;
            }
            setConfirmRotate(false);
            rotate.mutate();
          }}
        >
          <RotateCcw className="size-3.5" />
          {confirmRotate ? "Confirm rotate" : "Rotate link"}
        </Button>
        <Button
          variant="danger"
          loading={remove.isPending}
          onClick={() => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              setTimeout(() => setConfirmDelete(false), 3000);
              return;
            }
            setConfirmDelete(false);
            remove.mutate();
          }}
        >
          {confirmDelete ? "Confirm delete" : "Delete link"}
        </Button>
      </div>
    </div>
  );
}
