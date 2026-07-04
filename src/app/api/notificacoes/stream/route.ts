import { prisma } from "@/lib/prisma";
import { currentUser } from "@/lib/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return new Response("Não autenticado", { status: 401 });

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = async () => {
        try {
          const naoLidas = await prisma.notificacao.count({
            where: { userId: user.id, lida: false },
          });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ naoLidas })}\n\n`));
        } catch {
          // ponytail: tolera erro de query pontual; próximo tick tenta de novo
        }
      };
      void send(); // evento inicial imediato
      timer = setInterval(send, 15000);
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
