import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Carrega .env.local manualmente
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2];
}

const [, , email, password, fullName = "Matheus", role = "admin"] = process.argv;

if (!email || !password) {
  console.error("Uso: npx tsx scripts/create-admin.ts <email> <senha> [nome] [admin|operator]");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (error) {
    console.error("❌ Erro:", error.message);
    process.exit(1);
  }

  const userId = data.user!.id;

  // Garante o profile com role correto (o trigger cria como 'operator' por default)
  await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        organization_id: "00000000-0000-0000-0000-000000000001",
        full_name: fullName,
        role,
        email,
      },
      { onConflict: "id" }
    );

  console.log("✅ Usuário criado:");
  console.log(`   ID:    ${userId}`);
  console.log(`   Email: ${email}`);
  console.log(`   Role:  ${role}`);
  console.log(`   Senha: ${password}`);
}

main();
