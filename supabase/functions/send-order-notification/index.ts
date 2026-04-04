import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get notification email from shop_settings
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: settings } = await supabase
      .from("shop_settings")
      .select("notification_email")
      .limit(1)
      .maybeSingle();

    const notificationEmail = settings?.notification_email;
    if (!notificationEmail) {
      console.log("No notification email configured, skipping");
      return new Response(
        JSON.stringify({ success: false, reason: "no_notification_email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const order = await req.json();

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #8B6914; border-bottom: 2px solid #8B6914; padding-bottom: 10px;">
    🛒 Nuevo Pedido - Tienda Solidaria del Retablo de Ircio
  </h1>
  
  <h2 style="color: #555;">Datos del Producto</h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Producto:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${order.product_name}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Precio unitario:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${Number(order.product_price).toFixed(2)} €</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Cantidad:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${order.quantity}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 2px solid #8B6914; font-weight: bold; font-size: 1.1em;">Total:</td><td style="padding: 8px; border-bottom: 2px solid #8B6914; font-size: 1.1em; font-weight: bold; color: #8B6914;">${Number(order.total_amount).toFixed(2)} €</td></tr>
  </table>

  <h2 style="color: #555;">Datos del Cliente</h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Nombre:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${order.customer_name}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${order.customer_email}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Teléfono:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${order.customer_phone || 'No proporcionado'}</td></tr>
  </table>

  <h2 style="color: #555;">Dirección de Envío</h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Dirección:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${order.shipping_address}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Ciudad:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${order.shipping_city}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Código Postal:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${order.shipping_postal_code}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Provincia:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${order.shipping_province || 'No proporcionada'}</td></tr>
  </table>

  ${order.notes ? `<h2 style="color: #555;">Notas del Cliente</h2><p style="background: #f9f7f2; padding: 12px; border-radius: 8px; border-left: 4px solid #8B6914;">${order.notes}</p>` : ''}

  <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
    Este correo fue generado automáticamente por el sitio web del Retablo de Ircio.
  </p>
</body>
</html>`;

    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Retablo de Ircio <onboarding@resend.dev>",
        to: [notificationEmail],
        subject: `🛒 Nuevo pedido: ${order.product_name} (x${order.quantity})`,
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        `Resend API failed [${response.status}]: ${JSON.stringify(result)}`
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Error sending order notification:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
