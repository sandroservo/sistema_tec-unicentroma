import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { currentUser } from "@/lib/authz";
import { generateMfaSecret, otpauthUrl } from "@/lib/mfa";

export const runtime = "nodejs";

// Gera um secret candidato + QR. NÃO persiste (só é salvo em /api/mfa/enable após validar o código).
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const secret = generateMfaSecret();
  const url = otpauthUrl(user.email ?? user.id, secret);
  const qr = await QRCode.toDataURL(url);

  return NextResponse.json({ secret, otpauthUrl: url, qr });
}
