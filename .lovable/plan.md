

## Plan: Corregir persistencia de pedidos y añadir emails de confirmación

### Problema

El webhook de Stripe (`stripe-webhook`) no tiene logs, lo que indica que **no está desplegado** o Stripe no lo está llamando. El código del webhook ya tiene la lógica correcta para insertar en `orders` y enviar email al encargado, pero nunca se ejecuta.

Además, falta el envío de email de confirmación al cliente.

### Acciones

**1. Desplegar las Edge Functions**
- Desplegar `stripe-webhook` y `create-checkout` (y `send-order-notification` si existe).
- El webhook debe desplegarse con `--no-verify-jwt` ya que Stripe lo llama directamente sin token JWT.

**2. Añadir email de confirmación al cliente**
- En `stripe-webhook/index.ts`, después de enviar el email al encargado, enviar un segundo email al `customer_email` con los detalles de su pedido (producto, cantidad, total, dirección de envío).
- Se usará el mismo mecanismo de Resend vía el gateway.

**3. Verificar la URL del webhook en Stripe**
- La URL del webhook en Stripe debe apuntar a:
  `https://gqakeutnqwkqqynamgxy.supabase.co/functions/v1/stripe-webhook`
- Confirmar con el usuario que esta URL está configurada correctamente en el panel de Stripe.

### Archivos a modificar
- `supabase/functions/stripe-webhook/index.ts` — añadir email de confirmación al cliente

### Detalles técnicos

El webhook ya:
- Verifica la firma con `STRIPE_WEBHOOK_SECRET`
- Inserta el pedido en `orders` con `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS)
- Envía email al encargado via Resend gateway

Lo que falta:
- Despliegue de la función
- Email al cliente con template HTML de confirmación de pedido

El email al cliente incluirá: nombre del producto, cantidad, total, dirección de envío, y un mensaje de agradecimiento.

