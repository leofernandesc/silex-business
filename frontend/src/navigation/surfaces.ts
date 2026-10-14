import { getRoute } from "./routes";

/** Public fragments are section anchors; only known legacy module IDs enter the ERP. */
export function isPublicAddress(address: Pick<Location, "pathname" | "hash">) {
  return address.pathname === "/" && !getRoute(address.hash.slice(1));
}
