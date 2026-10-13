import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { api } from "../../lib/api";
import { toast } from "../../stores/toast";
import { Dropdown, DropdownItem } from "../ui/Dropdown";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import type { BoardDetail } from "../../lib/types";

export function BoardMenu({ board }: { board: BoardDetail }) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description ?? "");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const update = useMutation({
    mutationFn: () =>
      api.updateBoard(board.id, {
        name: name.trim(),
        description: description.trim(),
      }),
    onSuccess: (res) => {
      queryClient.setQueryData(["board", board.id], (old: any) =>
        old
          ? {
              ...old,
              name: res.updatedBoard.name,
              description: res.updatedBoard.description,
            }
          : old
      );
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Board updated");
      setRenameOpen(false);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to update board"),
  });

  const remove = useMutation({
    mutationFn: () => api.deleteBoard(board.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Board deleted");
      navigate("/boards");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to delete board"),
  });

  return (
    <>
      <Dropdown
        align="right"
        trigger={
          <button className="rounded-md p-1.5 text-text-muted hover:bg-white/5 hover:text-text">
            <MoreHorizontal className="size-4" />
          </button>
        }
      >
        <DropdownItem onClick={() => setRenameOpen(true)}>
          <Pencil className="size-3.5" />
          Rename board
        </DropdownItem>
        <DropdownItem danger onClick={() => setDeleteOpen(true)}>
          <Trash2 className="size-3.5" />
          Delete board
        </DropdownItem>
      </Dropdown>

      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="Edit board">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            update.mutate();
          }}
        >
          <Input
            label="Name"
            id="edit-board-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Textarea
            label="Description"
            id="edit-board-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this board for?"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={update.isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete board?">
        <p className="text-sm text-text-muted">
          This will permanently delete{" "}
          <span className="font-medium text-text">{board.name}</span>, its
          columns, cards, and member access. This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>
            Delete board
          </Button>
        </div>
      </Modal>
    </>
  );
}
