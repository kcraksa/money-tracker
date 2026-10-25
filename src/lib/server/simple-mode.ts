import { cookies } from "next/headers";
import { SIMPLE_COOKIE, isSimpleValue } from "@/lib/simple-mode";

export async function readSimpleMode(): Promise<boolean> {
  return isSimpleValue((await cookies()).get(SIMPLE_COOKIE)?.value);
}
