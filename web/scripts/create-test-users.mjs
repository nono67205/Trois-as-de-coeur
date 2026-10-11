// Crée les comptes de test (admin, coordinateur, bénévole) dans un vrai projet Supabase.
// Usage : node --env-file=.env.local scripts/create-test-users.mjs
// Prérequis : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY renseignés, migration SQL appliquée.
// À n'utiliser qu'en développement / préproduction : jamais avec les mots de passe de démo en production.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.");
const supabase = createClient(url, key, { auth: { persistSession: false } });

const accounts = [
  { email: process.env.DEMO_ADMIN_EMAIL, password: process.env.DEMO_ADMIN_PASSWORD, role: "admin", name: "Camille Admin" },
  { email: process.env.DEMO_COORDINATOR_EMAIL, password: process.env.DEMO_COORDINATOR_PASSWORD, role: "coordinator", name: "Sacha Coordination" },
  { email: process.env.DEMO_VOLUNTEER_EMAIL, password: process.env.DEMO_VOLUNTEER_PASSWORD, role: "volunteer", name: "Alex Bénévole" },
];

for (const a of accounts) {
  if (!a.email || !a.password) { console.log("ignoré (variables manquantes) :", a.role); continue; }
  const { data, error } = await supabase.auth.admin.createUser({
    email: a.email, password: a.password, email_confirm: true, user_metadata: { full_name: a.name },
  });
  if (error) { console.log(`${a.role}: ${error.message}`); continue; }
  // Le trigger handle_new_user crée le profil ; on lui attribue le bon rôle.
  const { error: e2 } = await supabase.from("profiles").update({ role: a.role }).eq("id", data.user.id);
  console.log(`${a.role}: ${a.email} ${e2 ? "(rôle non appliqué : " + e2.message + ")" : "créé"}`);
}
