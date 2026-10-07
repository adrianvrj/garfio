import { headers } from "next/headers";
import { DICTS, negotiate } from "./locales";

export async function getLocale() {
  return negotiate((await headers()).get("accept-language"));
}

export async function getDict() {
  return DICTS[await getLocale()];
}
