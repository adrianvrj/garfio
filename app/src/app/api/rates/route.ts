import { getRates } from "@/lib/rates";

export async function GET() {
  try {
    return Response.json(await getRates());
  } catch {
    return Response.json({ error: "Etherfuse no respondió" }, { status: 502 });
  }
}
