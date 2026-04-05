import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.101.1";

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
    if (!STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    const {
      product_id,
      product_name,
      product_price,
      quantity,
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      shipping_city,
      shipping_postal_code,
      shipping_province,
      notes,
      success_url,
      cancel_url,
    } = await req.json();

    // Validate required fields
    if (!product_name || !product_price || !quantity || !customer_name || !customer_email || !shipping_address || !shipping_city || !shipping_postal_code) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalAmount = Math.round(product_price * quantity * 100); // cents

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: customer_email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: product_name,
            },
            unit_amount: Math.round(product_price * 100),
          },
          quantity: quantity,
        },
      ],
      metadata: {
        product_id: product_id || "",
        product_name,
        product_price: String(product_price),
        quantity: String(quantity),
        total_amount: String(product_price * quantity),
        customer_name,
        customer_email,
        customer_phone: customer_phone || "",
        shipping_address,
        shipping_city,
        shipping_postal_code,
        shipping_province: shipping_province || "",
        notes: notes || "",
      },
      success_url: success_url || "https://example.com/success",
      cancel_url: cancel_url || "https://example.com/cancel",
    });

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error creating checkout session:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
