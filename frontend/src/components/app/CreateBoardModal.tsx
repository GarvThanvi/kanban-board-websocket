import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { toast } from "../../stores/toast";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";

export function CreateBoardModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const create = useMutation({
    mutationFn: () =>
      api.createBoard({
        name: name.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Board created");
      onClose();
      setName("");
      setDescription("");
      navigate(`/boards/${res.data.board.id}`);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Failed to create board"),
  });

  return (
    <Modal open={open} onClose={onClose} title="Create board">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          create.mutate();
        }}
      >
        <Input
          label="Name"
          id="board-name"
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sprint 24"
        />
        <Textarea
          label="Description"
          id="board-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this board for?"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending}>
            Create board
          </Button>
        </div>
      </form>
    </Modal>
  );
}
