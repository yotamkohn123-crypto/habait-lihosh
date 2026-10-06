"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Member } from "@/lib/types";
import { MEMBER_COLOR_PALETTE } from "@/lib/members";

export type Identity = string;

const STORAGE_KEY = "habait-lihosh-identity";

const IdentityContext = createContext<{
  identity: Identity | null;
  setIdentity: (identity: Identity) => void;
  members: Member[];
}>({ identity: null, setIdentity: () => {}, members: [] });

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentityState] = useState<Identity | null>(null);
  const [ready, setReady] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");

  async function loadMembers() {
    const { data } = await supabase
      .from("members")
      .select("*")
      .order("created_at", { ascending: true });
    if (data) setMembers(data as Member[]);
    setMembersLoading(false);
  }

  useEffect(() => {
    loadMembers();

    const channel = supabase
      .channel("members-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, loadMembers)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setIdentityState(stored);
    setReady(true);
  }, []);

  function setIdentity(value: Identity) {
    localStorage.setItem(STORAGE_KEY, value);
    setIdentityState(value);
  }

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    const color = MEMBER_COLOR_PALETTE[members.length % MEMBER_COLOR_PALETTE.length];
    const { data } = await supabase
      .from("members")
      .insert({ name, color })
      .select()
      .single();

    setNewName("");
    setAddingNew(false);
    if (data) setIdentity((data as Member).name);
  }

  if (!ready || membersLoading) return null;

  const identityIsValid = Boolean(identity) && members.some((m) => m.name === identity);

  if (!identityIsValid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="text-xl font-bold">מי אתה/את? 👋</h1>

        {members.length > 0 && (
          <div className="flex flex-wrap gap-3 w-full max-w-xs justify-center">
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => setIdentity(m.name)}
                className="min-w-[100px] flex-1 text-white rounded-2xl py-5 font-semibold text-lg shadow-sm active:scale-95 transition-transform"
                style={{ backgroundColor: m.color }}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}

        {!addingNew ? (
          <button
            onClick={() => setAddingNew(true)}
            className="text-sm font-semibold text-primary underline"
          >
            + הוסף איש/אשת בית חדש/ה
          </button>
        ) : (
          <form onSubmit={addMember} className="w-full max-w-xs flex flex-col gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="שם"
              className="w-full h-12 rounded-2xl border border-stone-300 bg-white px-4 text-center text-sm focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              className="w-full bg-primary text-white rounded-2xl py-3 font-semibold active:scale-95 transition-transform"
            >
              הוספה
            </button>
          </form>
        )}

        <p className="text-xs text-foreground/40">
          נשמר רק במכשיר הזה, אפשר לשנות בהגדרות בהמשך
        </p>
      </div>
    );
  }

  return (
    <IdentityContext.Provider value={{ identity, setIdentity, members }}>
      {children}
    </IdentityContext.Provider>
  );
}

export function useIdentity() {
  return useContext(IdentityContext);
}
