import Stripe from "https://esm.sh/stripe@14.21.0";
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
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    // If we have a webhook secret, verify the signature
    const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    let event: Stripe.Event;
    if (STRIPE_WEBHOOK_SECRET && sig) {
      event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_WEBHOOK_SECRET);
    } else {
      event = JSON.parse(body);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata || {};

      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      console.log("Processing checkout.session.completed for:", meta.customer_email, "Product:", meta.product_name);

      // Validate required metadata
      if (!meta.product_name || !meta.customer_name || !meta.customer_email || !meta.shipping_address || !meta.shipping_city || !meta.shipping_postal_code) {
        console.error("Missing required metadata:", JSON.stringify(meta));
        return new Response(JSON.stringify({ error: "Missing required order metadata" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Insert order
      const { error: orderError } = await supabase.from("orders").insert({
        product_id: meta.product_id || null,
        product_name: meta.product_name,
        product_price: parseFloat(meta.product_price),
        quantity: parseInt(meta.quantity),
        total_amount: parseFloat(meta.total_amount),
        customer_name: meta.customer_name,
        customer_email: meta.customer_email,
        customer_phone: meta.customer_phone || null,
        shipping_address: meta.shipping_address,
        shipping_city: meta.shipping_city,
        shipping_postal_code: meta.shipping_postal_code,
        shipping_province: meta.shipping_province || null,
        notes: meta.notes || null,
        status: "paid",
      });

      if (orderError) {
        console.error("Error inserting order:", JSON.stringify(orderError));
      } else {
        console.log("Order saved successfully for:", meta.customer_email);
      }

      // Send notification email
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

        if (LOVABLE_API_KEY && RESEND_API_KEY) {
          const { data: settings } = await supabase
            .from("shop_settings")
            .select("notification_email")
            .limit(1)
            .maybeSingle();

          const notificationEmail = settings?.notification_email;
          if (notificationEmail) {
            const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #8B6914; border-bottom: 2px solid #8B6914; padding-bottom: 10px;">
    🛒 Nuevo Pedido PAGADO - Tienda Solidaria del Retablo de Ircio
  </h1>
  <p style="background: #d4edda; padding: 10px; border-radius: 8px; color: #155724;">✅ Pago confirmado por Stripe</p>
  
  <h2 style="color: #555;">Datos del Producto</h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Producto:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${meta.product_name}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Precio unitario:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${Number(meta.product_price).toFixed(2)} €</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Cantidad:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${meta.quantity}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 2px solid #8B6914; font-weight: bold; font-size: 1.1em;">Total:</td><td style="padding: 8px; border-bottom: 2px solid #8B6914; font-size: 1.1em; font-weight: bold; color: #8B6914;">${Number(meta.total_amount).toFixed(2)} €</td></tr>
  </table>

  <h2 style="color: #555;">Datos del Cliente</h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Nombre:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${meta.customer_name}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${meta.customer_email}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Teléfono:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${meta.customer_phone || 'No proporcionado'}</td></tr>
  </table>

  <h2 style="color: #555;">Dirección de Envío</h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Dirección:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${meta.shipping_address}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Ciudad:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${meta.shipping_city}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Código Postal:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${meta.shipping_postal_code}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Provincia:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${meta.shipping_province || 'No proporcionada'}</td></tr>
  </table>

  ${meta.notes ? `<h2 style="color: #555;">Notas del Cliente</h2><p style="background: #f9f7f2; padding: 12px; border-radius: 8px; border-left: 4px solid #8B6914;">${meta.notes}</p>` : ''}

  <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
    Este correo fue generado automáticamente por el sitio web del Retablo de Ircio.
  </p>
</body>
</html>`;

            await fetch(`${GATEWAY_URL}/emails`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "X-Connection-Api-Key": RESEND_API_KEY,
              },
              body: JSON.stringify({
                from: "Retablo de Ircio <onboarding@resend.dev>",
                to: [notificationEmail],
                subject: `🛒 Nuevo pedido PAGADO: ${meta.product_name} (x${meta.quantity})`,
                html,
              }),
            });
            console.log("Admin notification email sent to:", notificationEmail);
          }

          // Send confirmation email to customer
          if (meta.customer_email) {
            const customerHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #8B6914; border-bottom: 2px solid #8B6914; padding-bottom: 10px;">
    ¡Gracias por tu pedido! 🎉
  </h1>
  <p>Hola <strong>${meta.customer_name}</strong>,</p>
  <p>Hemos recibido tu pedido correctamente y el pago ha sido confirmado. A continuación tienes los detalles:</p>

  <h2 style="color: #555;">Resumen del Pedido</h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Producto:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${meta.product_name}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Cantidad:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${meta.quantity}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Precio unitario:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${Number(meta.product_price).toFixed(2)} €</td></tr>
    <tr><td style="padding: 8px; border-bottom: 2px solid #8B6914; font-weight: bold; font-size: 1.1em;">Total:</td><td style="padding: 8px; border-bottom: 2px solid #8B6914; font-size: 1.1em; font-weight: bold; color: #8B6914;">${Number(meta.total_amount).toFixed(2)} €</td></tr>
  </table>

  <h2 style="color: #555;">Dirección de Envío</h2>
  <p style="background: #f9f7f2; padding: 12px; border-radius: 8px;">
    ${meta.shipping_address}<br>
    ${meta.shipping_postal_code} ${meta.shipping_city}<br>
    ${meta.shipping_province ? meta.shipping_province : ''}
  </p>

  <p style="margin-top: 20px;">Te avisaremos cuando tu pedido sea enviado. Si tienes alguna pregunta, no dudes en contactarnos.</p>

  <p style="margin-top: 30px;">¡Gracias por apoyar la restauración del Retablo de Ircio!</p>

  <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
    Este correo fue generado automáticamente por el sitio web del Retablo de Ircio.
  </p>
</body>
</html>`;

            await fetch(`${GATEWAY_URL}/emails`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "X-Connection-Api-Key": RESEND_API_KEY,
              },
              body: JSON.stringify({
                from: "Retablo de Ircio <onboarding@resend.dev>",
                to: [meta.customer_email],
                subject: `✅ Confirmación de pedido: ${meta.product_name}`,
                html: customerHtml,
              }),
            });
            console.log("Customer confirmation email sent to:", meta.customer_email);
          }
        }
      } catch (emailErr) {
        console.error("Email notification failed:", emailErr);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
