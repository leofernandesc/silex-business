import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, resetSessionRequests } from "../api";
import type { User } from "../types";
import { isPublicAddress } from "./surfaces";
import {
  appUrl,
  canAccessRoute,
  decodeReturn,
  DEFAULT_ROUTE,
  encodeReturn,
  LOGOUT_PENDING_KEY,
  readAddress,
  RETURN_KEY,
} from "./routes";

function stored(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    /* in-memory fallback below */
  }
}
function address(url: string, replace = true) {
  if (location.pathname + location.search + location.hash !== url)
    history[replace ? "replaceState" : "pushState"]({}, "", url);
}

export function useAppNavigation() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState(readAddress(location).route);
  const [error, setError] = useState("");
  const [logoutPending, setLogoutPending] = useState(
    Boolean(stored(LOGOUT_PENDING_KEY)),
  );
  const currentUser = useRef<User | null>(null);
  const logoutInFlight = useRef(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const pending = useRef(decodeReturn(stored(RETURN_KEY)));
  const authVersion = useRef(0);
  const focusRequested = useRef(false);
  const handledAddress = useRef("");
  const currentAddress = () =>
    location.pathname + location.search + location.hash;

  const remember = useCallback((id: string | null) => {
    pending.current = id ? decodeReturn(encodeReturn(id)) : null;
    save(RETURN_KEY, id ? encodeReturn(id) : null);
  }, []);
  const resolveAddress = useCallback(
    (active: User | null) => {
      if (isPublicAddress(location)) return;
      const request = readAddress(location);
      if (!active) {
        if (request.requested) remember(request.route);
        address("/entrar");
        handledAddress.current = currentAddress();
        setPage("dashboard");
        if (request.message) setError(request.message);
        return;
      }
      const target = request.login
        ? pending.current || DEFAULT_ROUTE
        : request.route;
      const allowed = canAccessRoute(active, target);
      const destination = allowed ? target : "dashboard";
      setError(
        allowed
          ? request.message
          : "Seu perfil não tem permissão para acessar este módulo.",
      );
      address(appUrl(destination));
      handledAddress.current = currentAddress();
      setPage(destination);
      remember(null);
    },
    [remember],
  );

  useEffect(() => {
    let alive = true;
    const version = ++authVersion.current;
    if (stored(LOGOUT_PENDING_KEY)) {
      resolveAddress(null);
      setReady(true);
      setError(
        "A interface foi encerrada, mas a saída no servidor não foi confirmada. Tente concluir a saída.",
      );
    } else {
      api<User>("/auth/me")
        .then((active) => {
          if (!alive || version !== authVersion.current) return;
          currentUser.current = active;
          setUser(active);
          resolveAddress(active);
        })
        .catch((failure: unknown) => {
          if (!alive || version !== authVersion.current) return;
          resolveAddress(null);
          if (!(failure instanceof ApiError && failure.status === 401))
            setError(
              "Não foi possível verificar sua sessão. Tente entrar novamente.",
            );
        })
        .finally(() => {
          if (alive) setReady(true);
        });
    }
    const expire = () => {
      if (!currentUser.current || isPublicAddress(location)) return;
      const request = readAddress(location);
      remember(request.route);
      ++authVersion.current;
      resetSessionRequests();
      currentUser.current = null;
      setUser(null);
      setPage("dashboard");
      address("/entrar");
      handledAddress.current = currentAddress();
      setError("Sua sessão terminou. Entre novamente.");
    };
    // A fragment history traversal may dispatch both popstate and hashchange.
    const changed = () => {
      if (
        isPublicAddress(location) ||
        currentAddress() === handledAddress.current
      )
        return;
      focusRequested.current = true;
      resolveAddress(currentUser.current);
    };
    window.addEventListener("session-expired", expire);
    window.addEventListener("hashchange", changed);
    window.addEventListener("popstate", changed);
    return () => {
      alive = false;
      window.removeEventListener("session-expired", expire);
      window.removeEventListener("hashchange", changed);
      window.removeEventListener("popstate", changed);
    };
  }, [remember, resolveAddress]);

  useEffect(() => {
    if (user && focusRequested.current) {
      document.getElementById("main-content")?.focus({ preventScroll: true });
      focusRequested.current = false;
    }
  }, [page, user]);

  const navigate = (id: string) => {
    if (!currentUser.current) return;
    if (!canAccessRoute(currentUser.current, id)) {
      setError("Seu perfil não tem permissão para acessar este módulo.");
      return;
    }
    const route = readAddress({ pathname: "/app", hash: `#${id}` }).route;
    address(appUrl(route), false);
    handledAddress.current = currentAddress();
    focusRequested.current = true;
    setPage(route);
    setError("");
    window.scrollTo(0, 0);
  };
  const onLogin = (active: User) => {
    ++authVersion.current;
    resetSessionRequests();
    currentUser.current = active;
    setUser(active);
    setLogoutPending(false);
    save(LOGOUT_PENDING_KEY, null);
    focusRequested.current = true;
    resolveAddress(active);
  };
  const logout = async () => {
    if (logoutInFlight.current) return;
    logoutInFlight.current = true;
    setLogoutBusy(true);
    ++authVersion.current;
    resetSessionRequests();
    currentUser.current = null;
    setUser(null);
    setPage("dashboard");
    remember(null);
    save(LOGOUT_PENDING_KEY, "1");
    setLogoutPending(true);
    address("/entrar");
    handledAddress.current = currentAddress();
    setError("Concluindo a saída...");
    try {
      await api("/auth/logout", "POST");
    } catch (failure) {
      if (!(failure instanceof ApiError && failure.status === 401)) {
        setError(
          "A interface foi encerrada, mas a saída no servidor não foi confirmada. Tente concluir a saída.",
        );
        logoutInFlight.current = false;
        setLogoutBusy(false);
        return;
      }
    }
    logoutInFlight.current = false;
    setLogoutBusy(false);
    save(LOGOUT_PENDING_KEY, null);
    setLogoutPending(false);
    setError("");
  };
  return {
    user,
    ready,
    page,
    error,
    logoutPending,
    logoutBusy,
    navigate,
    onLogin,
    logout,
  };
}
