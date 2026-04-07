
Objetivo: arreglar de una vez el post-pago para que, tras pagar en Stripe, se hagan las 3 acciones: guardar el pedido en `orders`, enviar email al encargado y enviar email al cliente.

Diagnóstico confirmado
- Ya no parece fallar el checkout: el pago sí se inicia y Stripe funciona.
- El bloqueo real está en `supabase/functions/stripe-webhook/index.ts`.
- Los logs muestran el error exacto:
  ```text
  SubtleCryptoProvider cannot be used in a synchronous context.
  Use `await constructEventAsync(...)` instead of `constructEvent(...)`
  ```
- Ahora mismo el webhook usa `stripe.webhooks.constructEvent(...)`, así que revienta antes de:
  1. insertar en `orders`
  2. leer `shop_settings.notification_email`
  3. enviar los 2 correos

Qué voy a corregir
1. Arreglar la validación del webhook de Stripe
- En `supabase/functions/stripe-webhook/index.ts`, cambiar:
  - `stripe.webhooks.constructEvent(...)`
  - por `await stripe.webhooks.constructEventAsync(...)`
- Esto es lo crítico: permitirá que el webhook procese realmente el evento `checkout.session.completed`.

2. Hacer más robusto el guardado del pedido
- Mantener la inserción en `orders`, pero añadir validaciones y logs más claros antes y después del insert.
- Comprobar que los campos sacados de `session.metadata` se convierten bien:
  - `product_price`
  - `quantity`
  - `total_amount`
- Si falta algún dato obligatorio, responder con log explícito en vez de fallar silenciosamente.

3. Asegurar los dos envíos de correo
- Mantener el email al encargado leyendo `shop_settings.notification_email`.
- Mantener el email al cliente usando `meta.customer_email`.
- Mejorar control de errores de cada envío por separado para que:
  - si falla un correo, el pedido siga guardándose
  - quede registrado en logs cuál de los dos falló
- Verificar también la respuesta del gateway de email, no solo hacer `fetch(...)` sin comprobar `response.ok`.

4. Simplificar el flujo para evitar puntos muertos
- El archivo `send-order-notification` existe, pero el flujo real del pago no lo usa.
- La corrección principal seguirá en `stripe-webhook`, para que todo ocurra en un único punto tras el pago confirmado.
- No hace falta tocar la UI de la tienda para resolver este fallo.

5. Verificación después del cambio
- Hacer una prueba completa de compra y comprobar:
  - que aparece una fila nueva en `orders`
  - que llega el correo al email configurado en `shop_settings`
  - que llega el correo de confirmación al comprador
- Si algo siguiera fallando, el siguiente punto de verdad serán los logs del webhook, que ya deberían mostrar errores útiles y no el fallo criptográfico actual.

Archivos a tocar
- `supabase/functions/stripe-webhook/index.ts`

Resultado esperado
- Stripe confirma el pago
- El webhook deja de romperse al verificar la firma
- Se registra el pedido en la tabla `orders`
- Se envía correo al encargado
- Se envía correo al cliente
