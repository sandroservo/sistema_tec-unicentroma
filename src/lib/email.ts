import "server-only";
import nodemailer from "nodemailer";

// Env-gated: sem SMTP_HOST, cai em modo log (dev) — não quebra fluxos.
function smtpConfigurado(): boolean {
  return !!process.env.SMTP_HOST;
}

let _transport: nodemailer.Transporter | null = null;
function transport(): nodemailer.Transporter {
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return _transport;
}

export function emailConfigurado(): boolean {
  return smtpConfigurado();
}

/** Envia e-mail. Se SMTP não configurado, loga no console (dev) e retorna ok:false. Nunca lança. */
export async function enviarEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean; erro?: string }> {
  if (!smtpConfigurado()) {
    console.log(`[email:dev] para=${params.to} assunto="${params.subject}"`);
    return { ok: false, erro: "SMTP não configurado" };
  }
  try {
    const from = process.env.SMTP_FROM ?? "no-reply@escola.local";
    await transport().sendMail({ from, ...params });
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}
