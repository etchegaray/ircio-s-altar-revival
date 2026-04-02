

# Fase 2: Base de datos, autenticación y sistema de roles

## Resumen

Crear todas las tablas en Supabase, configurar RLS, implementar autenticación de admin (login por email/password), y proteger rutas de administración.

---

## 1. Migración SQL — Crear esquema completo

Una única migración que crea:

**Enum y tablas:**
- `app_role` enum (`admin`, `user`)
- `user_roles` (id, user_id, role) — con RLS
- `campaign_settings` (id, goal_amount, campaign_name, created_at)
- `donations` (id, amount, donor_name, description, date, created_at)
- `expenses` (id, amount, description, category, date, created_at)
- `products` (id, name, description, price, image_url, stripe_price_id, active, created_at)
- `events` (id, title, description, date, time, location, max_attendees, created_at)
- `event_registrations` (id, event_id, name, email, created_at)

**Función security definer:**
- `has_role(user_id, role)` — para verificar roles sin recursión en RLS

**Políticas RLS:**
- Tablas públicas (donations, expenses, products, events, event_registrations, campaign_settings): SELECT para todos (`anon` + `authenticated`)
- INSERT/UPDATE/DELETE en donations, expenses, products, events, campaign_settings: solo admin via `has_role()`
- event_registrations: INSERT público (para inscripciones), DELETE solo admin

---

## 2. Página de Login (`/auth`)

- Formulario simple de email + password (solo para admins, no registro público)
- Usa `supabase.auth.signInWithPassword()`
- Redirige al panel admin tras login exitoso
- Traducciones i18n para los textos del formulario

---

## 3. Hook `useAuth`

- `src/hooks/useAuth.ts`
- Gestiona sesión con `onAuthStateChange` + `getSession`
- Expone: `user`, `isAdmin`, `loading`, `signIn`, `signOut`
- Consulta `user_roles` para determinar si es admin

---

## 4. Componente `ProtectedRoute`

- Wrapper que verifica `isAdmin` antes de renderizar rutas admin
- Redirige a `/auth` si no autenticado o no admin

---

## 5. Rutas de administración

- `/admin` — Dashboard básico (placeholder para fases 3-5)
- Enlace "Administración" visible en header solo si el usuario es admin
- Botón login/logout en header

---

## 6. Traducciones i18n

Añadir claves de auth/admin en los 3 idiomas (es, en, eu):
- Login, logout, email, password, panel admin, acceso denegado

---

## Detalle técnico

- No se crea tabla `profiles` — no se necesitan datos de perfil adicionales, solo roles
- El primer admin se creará manualmente: crear usuario en Supabase Auth dashboard, luego insertar fila en `user_roles`
- Las tablas financieras y de productos quedan vacías, listas para las fases 3-5

