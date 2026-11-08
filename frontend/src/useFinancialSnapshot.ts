import { useEffect, useState } from "react";
import { apiRequest } from "./api";
type State<T> = {
  key: string;
  loading: boolean;
  data: T | null;
  error: string;
};
/** Local to financial presentation: a response is never displayed under another query key. */
export function useFinancialSnapshot<T>(
  path: string,
  version: number,
  validate: (v: unknown) => v is T,
) {
  const key = JSON.stringify([path, version]);
  const [state, setState] = useState<State<T>>({
    key: "",
    loading: true,
    data: null,
    error: "",
  });
  useEffect(() => {
    let alive = true;
    const abort = new AbortController();
    setState({ key, loading: true, data: null, error: "" });
    apiRequest<unknown>(path, { signal: abort.signal })
      .then((value) => {
        if (alive)
          setState(
            validate(value)
              ? { key, loading: false, data: value, error: "" }
              : {
                  key,
                  loading: false,
                  data: null,
                  error: "Resposta financeira indisponível",
                },
          );
      })
      .catch((error) => {
        if (alive)
          setState({
            key,
            loading: false,
            data: null,
            error:
              error instanceof Error ? error.message : "Consulta indisponível",
          });
      });
    return () => {
      alive = false;
      abort.abort();
    };
  }, [key, path, validate]);
  return state.key === key
    ? state
    : { key, loading: true, data: null, error: "" };
}
