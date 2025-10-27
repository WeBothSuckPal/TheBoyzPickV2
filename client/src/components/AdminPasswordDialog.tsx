import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

interface AdminPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AdminPasswordDialog({
  open,
  onOpenChange,
  onSuccess,
}: AdminPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsChecking(true);

    try {
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setPassword("");
        onSuccess();
        onOpenChange(false);
      } else {
        setError("Incorrect password");
      }
    } catch (err) {
      setError("Failed to verify password");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-admin-password">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Admin Access Required
          </DialogTitle>
          <DialogDescription>
            Enter the admin password to access the admin panel.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              disabled={isChecking}
              data-testid="input-admin-password"
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive" data-testid="text-password-error">
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isChecking}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!password || isChecking}
              data-testid="button-submit"
            >
              {isChecking ? "Verifying..." : "Unlock"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
