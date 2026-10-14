import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../stores/auth";
import { toast } from "../stores/toast";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-5 border-t border-border py-7 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-8">
      <div>
        <h2 className="text-[13px] font-medium">{title}</h2>
        <p className="mt-1.5 max-w-[23ch] text-[12px] leading-5 text-text-faint">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const { token, user, setAuth } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  if (!user) return null;

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.updateMe({ name: name.trim(), email: email.trim() });
      if (token) setAuth(token, res.data);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }
    if (newPassword !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      await api.changePassword({
        currentPassword,
        newPassword,
      });
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-[920px] px-5 py-8 sm:px-8 sm:py-10">
      <div className="mb-8">
        <h1 className="text-[25px] font-medium tracking-[-0.05em]">Settings</h1>
        <p className="mt-1.5 text-[13px] text-text-muted">Your account and sign-in details.</p>
      </div>

      <div>
        <SettingsSection title="Profile" description="The name and address teammates see when they share work with you.">
          <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              id="profile-name"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Email"
              id="profile-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="flex justify-end sm:col-span-2">
              <Button type="submit" loading={savingProfile}>
                Save changes
              </Button>
            </div>
          </form>
        </SettingsSection>

        <SettingsSection title="Change password" description="Choose a unique password to protect your Flowline account.">
          <form onSubmit={savePassword} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Current password"
                id="current-password"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Input
              label="New password"
              id="new-password"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
            <Input
              label="Confirm new password"
              id="confirm-password"
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat new password"
            />
            <div className="flex justify-end sm:col-span-2">
              <Button type="submit" loading={savingPassword}>
                Update password
              </Button>
            </div>
          </form>
        </SettingsSection>
      </div>
    </div>
  );
}
