import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.1";
import { sendEmail, buildAdminOrderHtml, buildCustomerOrderHtml, type OrderLineItem } from "../_shared/email.ts";

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
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });

    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

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

      // Handle donation payments
      if (meta.payment_type === "donation") {
        console.log("Processing donation for:", meta.donor_email, "Amount:", meta.amount);
        const donorName = meta.show_name === "true" ? meta.donor_name : "Anónimo";
        const { error: donationError } = await supabase.from("donations").insert({
          amount: parseFloat(meta.amount),
          date: new Date().toISOString().split("T")[0],
          donor_name: donorName,
          description: "Donativo online vía Stripe",
        });
        if (donationError) {
          console.error("Error inserting donation:", JSON.stringify(donationError));
        } else {
          console.log("Donation saved for:", donorName);
        }
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      console.log("Processing shop order for:", meta.customer_email);

      if (!meta.items_json || !meta.customer_name || !meta.customer_email || !meta.shipping_address || !meta.shipping_city || !meta.shipping_postal_code) {
        console.error("Missing required metadata:", JSON.stringify(meta));
        return new Response(JSON.stringify({ error: "Missing required order metadata" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let items: OrderLineItem[];
      try {
        items = JSON.parse(meta.items_json);
      } catch {
        console.error("Failed to parse items_json:", meta.items_json);
        return new Response(JSON.stringify({ error: "Invalid items_json" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const totalAmount = parseFloat(meta.total_amount);
      const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
      const productNameSummary = items.length === 1
        ? items[0].product_name
        : items.map(i => i.product_name).join(", ");

      const { data: orderData, error: orderError } = await supabase.from("orders").insert({
        product_id: items.length === 1 ? (items[0] as any).product_id || null : null,
        product_name: productNameSummary,
        product_price: items.length === 1 ? items[0].product_price : 0,
        quantity: totalQuantity,
        total_amount: totalAmount,
        customer_name: meta.customer_name,
        customer_email: meta.customer_email,
        customer_phone: meta.customer_phone || null,
        shipping_address: meta.shipping_address,
        shipping_city: meta.shipping_city,
        shipping_postal_code: meta.shipping_postal_code,
        shipping_province: meta.shipping_province || null,
        notes: meta.notes || null,
        status: "paid",
      }).select("id").single();

      if (orderError) {
        console.error("Error inserting order:", JSON.stringify(orderError));
      } else {
        console.log("Order saved successfully, id:", orderData.id);

        // Insert order_items detail rows
        const orderItems = items.map(item => ({
          order_id: orderData.id,
          product_id: (item as any).product_id || null,
          product_name: item.product_name,
          product_price: item.product_price,
          quantity: item.quantity,
          subtotal: item.product_price * item.quantity,
        }));
        const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
        if (itemsError) {
          console.error("Error inserting order_items:", JSON.stringify(itemsError));
        } else {
          console.log("Order items saved:", orderItems.length);
        }

        // Insert donation entry for financial tracking
        const descriptionParts = items.map(item => {
          const qty = item.quantity;
          const label = qty === 1 ? "ejemplar" : "ejemplares";
          return `${qty} ${label} de "${item.product_name}"`;
        });
        const { error: saleError } = await supabase.from("donations").insert({
          amount: totalAmount,
          date: new Date().toISOString().split("T")[0],
          donor_name: null,
          description: `Venta de ${descriptionParts.join(", ")}`,
        });
        if (saleError) {
          console.error("Error inserting donation from sale:", JSON.stringify(saleError));
        } else {
          console.log("Donation from sale saved");
        }
      }

      // Send emails — failures are non-fatal
      console.log("Email env check - RESEND_API_KEY:", Deno.env.get("RESEND_API_KEY") ? "SET" : "MISSING", "| FROM_EMAIL:", Deno.env.get("FROM_EMAIL") ?? "MISSING");

      try {
        const { data: settings, error: settingsError } = await supabase
          .from("shop_settings")
          .select("notification_email")
          .limit(1)
          .maybeSingle();

        if (settingsError) {
          console.error("Error fetching shop_settings:", JSON.stringify(settingsError));
        }

        const notificationEmail = settings?.notification_email;
        if (notificationEmail) {
          await sendEmail({
            to: [notificationEmail],
            subject: `Nuevo pedido PAGADO: ${productNameSummary}`,
            html: buildAdminOrderHtml(meta, items),
          });
          console.log("Admin notification email sent to:", notificationEmail);
        }
      } catch (adminEmailErr) {
        console.error("Admin notification email failed (non-fatal):", adminEmailErr);
      }

      try {
        await sendEmail({
          to: [meta.customer_email],
          subject: `Confirmación de pedido: ${productNameSummary}`,
          html: buildCustomerOrderHtml(meta, items),
        });
        console.log("Customer confirmation email sent to:", meta.customer_email);
      } catch (customerEmailErr) {
        console.error("Customer confirmation email failed (non-fatal):", customerEmailErr);
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
