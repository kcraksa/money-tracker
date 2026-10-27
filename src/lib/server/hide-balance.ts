import { cookies } from "next/headers";
import { HIDE_COOKIE, isHiddenValue } from "@/lib/hide-balance";

export async function readHideBalance(): Promise<boolean> {
  return isHiddenValue((await cookies()).get(HIDE_COOKIE)?.value);
}
