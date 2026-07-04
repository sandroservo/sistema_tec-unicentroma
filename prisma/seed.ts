import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@escola.com";
  const senha = "admin123";
  const senhaHash = await bcrypt.hash(senha, 10);

  await prisma.user.upsert({
    where: { email },
    update: { papel: "super_admin", ativo: true },
    create: { nome: "Administrador", email, senhaHash, papel: "super_admin" },
  });

  console.log(`Usuário admin pronto:\n  email: ${email}\n  senha: ${senha}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
