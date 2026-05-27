import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.1";
import { sendEmail, buildAdminOrderHtml } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: settings } = await supabase
      .from("shop_settings")
      .select("notification_email")
      .limit(1)
      .maybeSingle();

    const notificationEmail = settings?.notification_email;
    if (!notificationEmail) {
      console.log("No notification email configured in shop_settings, skipping");
      return new Response(
        JSON.stringify({ success: false, reason: "no_notification_email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const order = await req.json();

    await sendEmail({
      to: [notificationEmail],
      subject: `Nuevo pedido: ${order.product_name} (x${order.quantity})`,
      html: buildAdminOrderHtml(order),
    });

    console.log("Admin notification email sent to:", notificationEmail);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Error sending order notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
