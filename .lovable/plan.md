

# Plan: Sitio Web para la Restauración del Retablo de Ircio

## Resumen del Proyecto

Sitio web trilingue (ES/EN/EU) para promover la restauración del retablo mayor de la parroquia de San Pedro en Ircio (Miranda de Ebro, Burgos). Retablo renacentista del siglo XVI, obra de Pedro Lopez de Gamiz, Hernando de Murillas y Bernardo de Valderrama. Estilo visual calido con colores tierra.

---

## Arquitectura General

```text
┌─────────────────────────────────────────────┐
│                 Frontend (React)            │
│  Home | Financiero | Tienda | Eventos       │
│  + Panel Admin (rutas protegidas)           │
├─────────────────────────────────────────────┤
│              Supabase (externo)             │
│  Auth | Database | Storage                  │
├─────────────────────────────────────────────┤
│          Stripe (checkout sessions)         │
└─────────────────────────────────────────────┘
```

---

## Secciones del Sitio

### 1. Home
- Hero con imagen del retablo (la foto subida)
- Introduccion historica (contenido extraido del PDF: autores, siglo XVI, escultura romanista)
- Estado actual y necesidad de restauracion
- Importancia artistica e historica
- Llamada a la accion (donar / ver tienda)

### 2. Situacion Financiera
- Barra de progreso visual (recaudado vs objetivo)
- Tabla de ingresos (donativos) y gastos
- Graficos sencillos de evolucion
- Solo lectura para visitantes; editable por admin

### 3. Tienda (Merchandising)
- Catalogo de productos (libro, camiseta, gorra, etc.)
- Integracion con Stripe en modo test
- Flujo: seleccionar producto → Stripe Checkout → confirmacion
- Gestion de productos desde panel admin

### 4. Calendario de Eventos
- Vista de calendario atractiva con tarjetas de eventos
- Inscripcion de visitantes (nombre + email)
- Gestion de eventos desde panel admin

---

## Base de Datos (Supabase)

Tablas necesarias:

- **donations** (id, amount, donor_name, description, date, created_at)
- **expenses** (id, amount, description, category, date, created_at)
- **products** (id, name, description, price, image_url, stripe_price_id, active, created_at)
- **events** (id, title, description, date, time, location, max_attendees, created_at)
- **event_registrations** (id, event_id, name, email, created_at)
- **user_roles** (id, user_id, role) — enum: admin, user
- **campaign_settings** (id, goal_amount, campaign_name)

RLS habilitado en todas las tablas. Funcion `has_role()` como security definer para verificar admin sin recursion.

---

## Internacionalizacion (i18n)

- Libreria: `react-i18next`
- 3 archivos de traducciones: `es.json`, `en.json`, `eu.json`
- Selector de idioma en el header
- Contenido historico traducido a los 3 idiomas

---

## Estilo Visual

- Paleta calida: tonos tierra (#8B6914 dorado antiguo, #D4A574 arena, #5C4033 marron, #F5E6D3 crema, #2F4F2F verde oliva)
- Tipografia serif para titulos (Playfair Display), sans-serif para cuerpo (Inter)
- Imagenes del retablo como protagonistas
- Diseno responsive

---

## Estructura de Archivos (principales)

```text
src/
├── i18n/              # Configuracion i18n + traducciones
├── pages/
│   ├── Index.tsx       # Home
│   ├── Finances.tsx    # Situacion financiera
│   ├── Shop.tsx        # Tienda
│   ├── Events.tsx      # Calendario
│   ├── Auth.tsx        # Login admin
│   └── admin/
│       ├── Dashboard.tsx
│       ├── FinancesAdmin.tsx
│       ├── ProductsAdmin.tsx
│       └── EventsAdmin.tsx
├── components/
│   ├── layout/         # Header, Footer, LanguageSwitcher
│   ├── home/           # Hero, History, Importance
│   ├── finances/       # ProgressBar, TransactionsTable
│   ├── shop/           # ProductCard, Cart
│   ├── events/         # EventCard, Calendar, RegistrationForm
│   └── admin/          # Forms para CRUD
├── hooks/              # useAuth, useTranslation wrappers
└── lib/
    ├── supabase.ts     # Cliente Supabase
    └── stripe.ts       # Helpers Stripe
```

---

## Plan de Implementacion

Se implementara en fases incrementales:

**Fase 1**: Estructura base, layout, i18n, pagina Home con contenido del retablo e imagen

**Fase 2**: Conexion Supabase, autenticacion, sistema de roles, tablas y RLS

**Fase 3**: Seccion financiera (publica + admin CRUD)

**Fase 4**: Tienda con Stripe (catalogo, checkout, admin productos)

**Fase 5**: Calendario de eventos con inscripcion + admin

---

## Requisitos del Usuario

Antes de implementar necesitare:

1. **Conectar Supabase externo** — te pedire la conexion
2. **Conectar Stripe** — para la tienda (modo test)
3. Las tablas se crearan via migraciones SQL

