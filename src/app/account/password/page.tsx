"use client";

import { FormEvent, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function PasswordPage() {
  const router = useRouter();
  const { status } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (status === "loading") {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Unable to update password");
        return;
      }

      setMessage(
        "Password updated. Please sign in again with your new password.",
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await signOut({ callbackUrl: "/login" });
    } catch {
      setError("Unable to update password. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f1f8e9] px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Change password</h1>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Dashboard
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
            {message}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Current password
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            New password
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Confirm new password
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isSaving ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </main>
  );
}
