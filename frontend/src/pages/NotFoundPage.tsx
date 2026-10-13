import { Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { Button } from "../components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg text-center">
      <LayoutGrid className="size-10 text-text-faint" />
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-text-muted">
        The page you're looking for doesn't exist.
      </p>
      <Link to="/" className="mt-3">
        <Button variant="secondary">Back home</Button>
      </Link>
    </div>
  );
}
