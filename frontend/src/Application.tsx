import { lazy, Suspense, useEffect, useState } from "react";
import { Brand } from "./brand/Brand";
import { isPublicAddress } from "./navigation/surfaces";

const PublicPage = lazy(() => import("./public/PublicPage"));
const OperationalApp = lazy(() => import("./App"));

/** Surface boundary only: authentication and operational navigation stay in App. */
export default function Application() {
  const [publicPage, setPublicPage] = useState(() => isPublicAddress(location));
  useEffect(() => {
    const changed = () => setPublicPage(isPublicAddress(location));
    window.addEventListener("popstate", changed);
    window.addEventListener("hashchange", changed);
    return () => {
      window.removeEventListener("popstate", changed);
      window.removeEventListener("hashchange", changed);
    };
  }, []);
  return (
    <Suspense
      fallback={
        <div className="loading-screen">
          <Brand width={220} appearance="dark" />
          <p>Carregando...</p>
        </div>
      }
    >
      {publicPage ? <PublicPage /> : <OperationalApp />}
    </Suspense>
  );
}
