
Objetivo: corregir el flujo para que Stripe Checkout se abra correctamente y no quede “en gris”.

Diagnóstico
- El frontend sí intenta crear la sesión y redirigir: `src/pages/Shop.tsx:90-112`.
- La función `create-checkout` devuelve `session.url` correctamente cuando Stripe acepta la clave: `supabase/functions/create-checkout/index.ts:52-89`.
- El síntoma “empieza a dibujar Stripe pero se queda todo en gris” encaja con un problema de embebido en iframe.
- En Lovable, la preview se muestra embebida; actualmente el código usa `window.location.href = data.url`, así que intenta abrir Stripe dentro del contexto actual.
- Stripe Checkout hospedado no debe renderizarse dentro de iframes/restricciones de `frame-ancestors`, por eso probablemente se queda bloqueado aunque la sesión exista.

Qué construir
1. Cambiar la navegación a Stripe para abrir Checkout fuera del iframe
- En `src/pages/Shop.tsx`, sustituir la redirección actual por una estrategia segura:
  - intentar `window.top?.location.href = data.url` si está disponible y permitido
  - si no, usar `window.open(data.url, "_blank", "noopener,noreferrer")`
  - como último recurso, mantener `window.location.href = data.url`
- Esto evita que Stripe se intente pintar dentro de la preview embebida.

2. Mejorar el manejo de errores del checkout
- Mostrar un toast más específico cuando la función devuelva error.
- Registrar mejor el error devuelto por `supabase.functions.invoke` para distinguir:
  - fallo al crear sesión
  - bloqueo del navegador/iframe
  - URL ausente o inválida

3. Endurecer la Edge Function
- En `supabase/functions/create-checkout/index.ts`:
  - eliminar imports no usados (`createClient`, `totalAmount`) para dejar la función limpia
  - validar tipos básicos (`product_price > 0`, `quantity >= 1`, URLs presentes)
  - opcionalmente devolver también `session_id` y quizá `checkout_url` con naming claro
- No parece que el backend sea el problema principal ahora, pero conviene dejarlo robusto.

4. Añadir soporte mejor para entornos embebidos
- Detectar si la app corre embebida:
  ```text
  const isEmbedded = window.self !== window.top
  ```
- Si está embebida, priorizar apertura en nueva pestaña/ventana y avisar al usuario con un texto breve si el navegador bloquea popups.

5. Verificación final
- Probar el flujo:
  - abrir producto
  - rellenar formulario
  - pulsar pagar
  - comprobar que Stripe abre fuera de la preview
  - completar/cancelar pago
  - confirmar retorno a `/shop?payment=success|cancelled`
  - confirmar que siguen funcionando el webhook y el email

Archivos a tocar
- `src/pages/Shop.tsx`
- `supabase/functions/create-checkout/index.ts`

Detalles técnicos
- Causa probable:
  ```text
  Lovable preview (iframe)
    -> Shop.tsx hace window.location.href
      -> Stripe Checkout intenta cargar en el contexto embebido
        -> el navegador/Stripe lo bloquea
          -> pantalla gris
  ```
- Evidencia revisada:
  - `Shop.tsx` usa `window.location.href = data.url`
  - No hay rutas de éxito/cancel especiales fuera de `/shop`
  - Los logs recientes del Edge Function sólo muestran el error viejo de permisos con `rk_test`; no hay un error nuevo del backend en el contexto aportado
- Observación secundaria:
  - `src/components/ui/sonner.tsx` usa `next-themes` en un proyecto Vite/React sin ThemeProvider visible en `App.tsx`; no parece la causa de Stripe, pero conviene revisarlo aparte si hay warnings o comportamiento raro.

Resultado esperado tras implementar
- Al pulsar “Pagar”, Stripe Checkout se abrirá correctamente fuera del iframe de preview.
- Desaparecerá el estado “gris”.
- El usuario podrá completar o cancelar el pago y volver a la tienda con feedback correcto.
