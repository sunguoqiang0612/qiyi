"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { RELATIONS, relationLabel } from "@/lib/constants";
import type { ProfileDTO } from "@/lib/types";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FamilyManager({ profiles }: { profiles: ProfileDTO[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("other");
  const [pending, setPending] = useState(false);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await api("/api/profiles", { method: "POST", body: JSON.stringify({ name, relation }) });
      setName("");
      toast.success(t("saved"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("loadFailed"));
    } finally {
      setPending(false);
    }
  }

  async function activate(id: string) {
    try {
      await api(`/api/profiles/${id}/activate`, { method: "POST" });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("loadFailed"));
    }
  }

  async function remove(profile: ProfileDTO) {
    if (profiles.length <= 1) {
      toast.error(t("lastMember"));
      return;
    }
    if (!window.confirm(t("confirmDeleteMember", { name: profile.name, n: profile.itemCount }))) return;
    try {
      await api(`/api/profiles/${profile.id}`, { method: "DELETE" });
      toast.success(t("deleted"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("loadFailed"));
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">{t("familyTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("familySubtitle")}</p>
      <ul className="mt-5 space-y-3">
        {profiles.map((profile) => (
          <li key={profile.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
            <div>
              <div className="font-medium">
                {profile.name}{" "}
                {profile.active ? <span className="ml-2 rounded-full bg-foreground px-2 py-0.5 text-[11px] text-background">{t("active")}</span> : null}
              </div>
              <div className="text-sm text-muted-foreground">
                {relationLabel(locale, profile.relation)} · {t("pieceCount", { n: profile.itemCount })}
              </div>
            </div>
            <div className="flex gap-2">
              {!profile.active ? (
                <Button size="sm" variant="outline" onClick={() => void activate(profile.id)}>
                  {t("activate")}
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={() => void remove(profile)}>
                {t("deleteMember")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-6 grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-[1fr_160px_auto]">
        <div className="grid gap-1.5">
          <Label htmlFor="member-name">{t("memberName")}</Label>
          <Input id="member-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={40} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="member-relation">{t("relation")}</Label>
          <select id="member-relation" value={relation} onChange={(event) => setRelation(event.target.value)} className="h-8 rounded-lg border bg-background px-2 text-sm">
            {RELATIONS.map((id) => (
              <option key={id} value={id}>
                {relationLabel(locale, id)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={pending}>
            {t("addMember")}
          </Button>
        </div>
      </form>
    </div>
  );
}
