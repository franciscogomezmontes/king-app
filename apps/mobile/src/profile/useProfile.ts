import { useEffect, useState } from "react";
import { loadProfile, saveProfile } from "./persistence";
import { DEFAULT_PROFILE, Profile } from "./types";

export interface UseProfileResult {
  /** True until the saved profile (or the defaults, if none were saved) have loaded. */
  loading: boolean;
  profile: Profile;
  setName: (name: string) => void;
  setAvatarIndex: (avatarIndex: number | null) => void;
}

/** Owns the player's own identity (display name, chosen avatar) and its persistence — loads once
 * on mount, saves on every change. Mirrors `useSettings`'s own shape exactly. Callers that create
 * game state from `profile.avatarIndex` (Solo vs Computer's store, to keep the human's own portrait
 * out of that game's bot roster) should wait for `!loading` first, same caveat as `useSettings`. */
export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadProfile().then((loaded) => {
      if (cancelled) return;
      setProfile(loaded);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function setName(name: string) {
    setProfile((prev) => {
      const next: Profile = { ...prev, name };
      saveProfile(next);
      return next;
    });
  }

  function setAvatarIndex(avatarIndex: number | null) {
    setProfile((prev) => {
      const next: Profile = { ...prev, avatarIndex };
      saveProfile(next);
      return next;
    });
  }

  return { loading, profile, setName, setAvatarIndex };
}
