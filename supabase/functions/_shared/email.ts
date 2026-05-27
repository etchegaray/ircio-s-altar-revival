const RESEND_API_URL = "https://api.resend.com/emails";

export interface EmailPayload {
  to: string[];
  subject: string;
  html: string;
}

export interface OrderLineItem {
  product_name: string;
  product_price: number;
  quantity: number;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

  const FROM_EMAIL = Deno.env.get("FROM_EMAIL");
  if (!FROM_EMAIL) throw new Error("FROM_EMAIL is not configured");

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_EMAIL, ...payload }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error [${res.status}]: ${body}`);
  }
}

function buildItemsTableRows(items: OrderLineItem[]): string {
  return items.map(item => {
    const subtotal = (item.product_price * item.quantity).toFixed(2);
    return `<tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product_name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${Number(item.product_price).toFixed(2)} €</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${subtotal} €</td>
    </tr>`;
  }).join("");
}

export function buildAdminOrderHtml(order: Record<string, string>, items: OrderLineItem[]): string {
  const total = Number(order.total_amount).toFixed(2);
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #8B6914; border-bottom: 2px solid #8B6914; padding-bottom: 10px;">
    Nuevo Pedido PAGADO - Tienda Solidaria del Retablo de Ircio
  </h1>
  <p style="background: #d4edda; padding: 10px; border-radius: 8px; color: #155724;">Pago confirmado por Stripe</p>

  <h2 style="color: #555;">Artículos del pedido</h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <thead>
      <tr style="background: #f5f0e8;">
        <th style="padding: 8px; text-align: left; border-bottom: 2px solid #8B6914;">Producto</th>
        <th style="padding: 8px; text-align: center; border-bottom: 2px solid #8B6914;">Cant.</th>
        <th style="padding: 8px; text-align: right; border-bottom: 2px solid #8B6914;">Precio</th>
        <th style="padding: 8px; text-align: right; border-bottom: 2px solid #8B6914;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${buildItemsTableRows(items)}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="padding: 10px 8px; text-align: right; font-weight: bold; font-size: 1.1em;">Total:</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: bold; font-size: 1.1em; color: #8B6914;">${total} €</td>
      </tr>
    </tfoot>
  </table>

  <h2 style="color: #555;">Datos del Cliente</h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Nombre:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${order.customer_name}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${order.customer_email}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Teléfono:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${order.customer_phone || "No proporcionado"}</td></tr>
  </table>

  <h2 style="color: #555;">Dirección de Envío</h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Dirección:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${order.shipping_address}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Ciudad:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${order.shipping_city}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Código Postal:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${order.shipping_postal_code}</td></tr>
    <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Provincia:</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${order.shipping_province || "No proporcionada"}</td></tr>
  </table>

  ${order.notes ? `<h2 style="color: #555;">Notas del Cliente</h2><p style="background: #f9f7f2; padding: 12px; border-radius: 8px; border-left: 4px solid #8B6914;">${order.notes}</p>` : ""}

  <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
    Este correo fue generado automáticamente por el sitio web del Retablo de Ircio.
  </p>
</body>
</html>`;
}

export function buildCustomerOrderHtml(order: Record<string, string>, items: OrderLineItem[]): string {
  const total = Number(order.total_amount).toFixed(2);
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #8B6914; border-bottom: 2px solid #8B6914; padding-bottom: 10px;">
    ¡Gracias por tu pedido!
  </h1>
  <p>Hola <strong>${order.customer_name}</strong>,</p>
  <p>Hemos recibido tu pedido correctamente y el pago ha sido confirmado. A continuación tienes los detalles:</p>

  <h2 style="color: #555;">Resumen del Pedido</h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <thead>
      <tr style="background: #f5f0e8;">
        <th style="padding: 8px; text-align: left; border-bottom: 2px solid #8B6914;">Producto</th>
        <th style="padding: 8px; text-align: center; border-bottom: 2px solid #8B6914;">Cant.</th>
        <th style="padding: 8px; text-align: right; border-bottom: 2px solid #8B6914;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product_name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${(item.product_price * item.quantity).toFixed(2)} €</td>
      </tr>`).join("")}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="2" style="padding: 10px 8px; text-align: right; font-weight: bold; font-size: 1.1em;">Total:</td>
        <td style="padding: 10px 8px; text-align: right; font-weight: bold; font-size: 1.1em; color: #8B6914;">${total} €</td>
      </tr>
    </tfoot>
  </table>

  <h2 style="color: #555;">Dirección de Envío</h2>
  <p style="background: #f9f7f2; padding: 12px; border-radius: 8px;">
    ${order.shipping_address}<br>
    ${order.shipping_postal_code} ${order.shipping_city}<br>
    ${order.shipping_province || ""}
  </p>

  <p style="margin-top: 20px;">Te avisaremos cuando tu pedido sea enviado. Si tienes alguna pregunta, no dudes en contactarnos.</p>
  <p style="margin-top: 30px;">¡Gracias por apoyar la restauración del Retablo de Ircio!</p>

  <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
    Este correo fue generado automáticamente por el sitio web del Retablo de Ircio.
  </p>
</body>
</html>`;
}
