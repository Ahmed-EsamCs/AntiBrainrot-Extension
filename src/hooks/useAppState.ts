import { useEffect, useState } from "react";
import { AppState } from "../types";
import { getState, subscribeState } from "../storage/store";

export function useAppState() {
  const [state, setState] = useState<AppState>();

  useEffect(() => {
    let mounted = true;
    getState().then((next) => {
      if (mounted) setState(next);
    });
    const unsubscribe = subscribeState(setState);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return state;
}
