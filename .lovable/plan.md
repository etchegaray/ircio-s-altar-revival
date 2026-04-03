

# Fix: Race condition en autenticacion admin

## Problema

En `useAuth.ts`, el flujo es:
1. `onAuthStateChange` detecta sesion
2. Se pone `loading = false`
3. **Despues**, `setTimeout(() => checkAdminRole(...), 0)` ejecuta la consulta a `user_roles`

`ProtectedRoute` evalua en el paso 2, cuando `isAdmin` aun es `false`, y redirige a `/auth`.

## Solucion

### 1. Corregir `src/hooks/useAuth.ts`

- Eliminar el `setTimeout` en `onAuthStateChange`
- No poner `loading = false` hasta que `checkAdminRole` haya terminado
- En `getSession`, esperar tambien a `checkAdminRole` antes de `setLoading(false)`

```typescript
// En onAuthStateChange:
if (session?.user) {
  await checkAdminRole(session.user.id);
}
setLoading(false);

// En getSession:
if (session?.user) {
  await checkAdminRole(session.user.id);
}
setLoading(false);
```

### 2. Redirigir usuarios ya autenticados desde `/auth`

En `Auth.tsx`, si el usuario ya esta logueado y es admin, redirigir automaticamente a `/admin` en vez de mostrar el formulario de login:

```typescript
const { user, isAdmin, loading, signIn } = useAuth();

if (loading) return <spinner />;
if (user && isAdmin) return <Navigate to="/admin" />;
```

## Archivos a modificar

- `src/hooks/useAuth.ts` — eliminar setTimeout, await checkAdminRole antes de setLoading(false)
- `src/pages/Auth.tsx` — redirigir si ya autenticado como admin

