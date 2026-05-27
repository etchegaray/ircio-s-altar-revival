import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ok = (data: unknown) =>
  new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });

const fail = (status: number, message: string) =>
  new Response(JSON.stringify({ error: message }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SITE_URL = Deno.env.get("SITE_URL") ?? "http://localhost:8080";

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return fail(401, "Unauthorized");

    const { data: { user }, error: authError } = await adminClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) return fail(401, "Unauthorized");

    // Verify the caller has the admin role
    const { data: adminRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) return fail(403, "Forbidden: admin role required");

    const { action, ...params } = await req.json();

    switch (action) {
      case "list": {
        const { data: { users }, error: listError } =
          await adminClient.auth.admin.listUsers({ perPage: 1000 });
        if (listError) throw listError;

        const { data: allRoles } = await adminClient
          .from("user_roles")
          .select("user_id, role");

        const rolesByUser = (allRoles ?? []).reduce<Record<string, string[]>>(
          (acc, r) => {
            (acc[r.user_id] ??= []).push(r.role);
            return acc;
          },
          {}
        );

        return ok(
          users.map((u) => ({
            id: u.id,
            email: u.email,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at ?? null,
            roles: rolesByUser[u.id] ?? [],
          }))
        );
      }

      case "invite": {
        const { email, roles = [] } = params as { email: string; roles: string[] };
        if (!email) return fail(400, "email is required");

        const { data, error: inviteError } =
          await adminClient.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${SITE_URL}/auth`,
          });
        if (inviteError) throw inviteError;

        if (roles.length > 0 && data.user) {
          const inserts = roles.map((role) => ({ user_id: data.user!.id, role }));
          const { error: roleError } = await adminClient
            .from("user_roles")
            .insert(inserts);
          if (roleError) console.error("Role insert error:", roleError);
        }

        return ok({ id: data.user?.id, email });
      }

      case "assign_role": {
        const { userId, role } = params as { userId: string; role: string };
        if (!userId || !role) return fail(400, "userId and role are required");

        const { error: upsertError } = await adminClient
          .from("user_roles")
          .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
        if (upsertError) throw upsertError;
        return ok({ success: true });
      }

      case "remove_role": {
        const { userId, role } = params as { userId: string; role: string };
        if (!userId || !role) return fail(400, "userId and role are required");

        // Prevent removing your own admin role
        if (userId === user.id && role === "admin") {
          return fail(400, "Cannot remove your own admin role");
        }

        const { error: deleteError } = await adminClient
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);
        if (deleteError) throw deleteError;
        return ok({ success: true });
      }

      case "delete_user": {
        const { userId } = params as { userId: string };
        if (!userId) return fail(400, "userId is required");
        if (userId === user.id) return fail(400, "Cannot delete your own account");

        const { error: deleteError } =
          await adminClient.auth.admin.deleteUser(userId);
        if (deleteError) throw deleteError;
        return ok({ success: true });
      }

      default:
        return fail(400, `Unknown action: ${action}`);
    }
  } catch (err: unknown) {
    console.error("admin-users error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return fail(500, message);
  }
});
