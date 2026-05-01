## Plan: Eliminar el idioma euskera

Solo quedarán español (predeterminado) e inglés.

### Cambios

1. **`src/i18n/index.ts`**
   - Quitar `import eu from './eu.json';`
   - Quitar `eu: { translation: eu }` de `resources`.

2. **`src/components/layout/LanguageSwitcher.tsx`**
   - Eliminar la entrada `{ code: 'eu', label: 'EU' }` del array `languages`.

3. **`src/i18n/eu.json`**
   - Borrar el archivo.

4. **`src/i18n/es.json` y `src/i18n/en.json`**
   - Eliminar la clave `"eu": "Euskara"` (línea 133) dentro del bloque de nombres de idiomas, ya que ya no se ofrece esa opción.

5. **Memoria del proyecto**
   - Actualizar la memoria `features/languages` para reflejar que el soporte ahora es bilingüe (español + inglés).

### Verificación
- `bun run lint` y carga del preview: el switcher solo muestra ES / EN, y los usuarios cuyo navegador estaba en `eu` caen al fallback `es`.
