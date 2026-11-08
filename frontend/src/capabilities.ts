import type { User } from "./types";

export function hasTransport(user: Pick<User, "role" | "capabilities"> | null | undefined): boolean {
  return user?.role === "admin" && user.capabilities?.includes("transport_operations") === true;
}
