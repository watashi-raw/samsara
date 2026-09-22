# SAMSARA

Registro tranquilo del ciclo menstrual, síntomas, actividades y notas, relacionado con la fase de la luna. App web estática (HTML + CSS + JS) con Supabase como base de datos y autenticación.

## Puesta en marcha (una sola vez)

1. **Crear las tablas.** En Supabase abre `SQL Editor → New query`, pega el contenido completo de `supabase/schema.sql` y pulsa **Run**. Crea las tablas `entries` y `catalog`, las políticas de seguridad (RLS) y las 67 opciones iniciales del catálogo.
2. **Crear tu usuario admin.** En `Authentication → Users → Add user → Create new user`: escribe tu correo y una contraseña, y marca **Auto Confirm User**. Ese será el único acceso.
3. **Cerrar el registro público.** En `Authentication → Sign In / Providers → Email` desactiva **Allow new users to sign up**. Así nadie más puede crear cuentas.
4. **Mes de prueba.** Entra a la app → Setup → *Cargar mes de prueba*: inserta un mes de check-ins de ejemplo (marcados con `[prueba]`) para ver los gráficos; se borran con un botón.
5. (Opcional) En `js/config.js` escribe tu correo en `ADMIN_EMAIL` para que la portada solo pida contraseña.

## Usarla

- **Local:** sirve la carpeta con cualquier servidor estático, por ejemplo `python3 -m http.server 8790` y abre `http://127.0.0.1:8790`.
- **En línea:** sube la carpeta tal cual a Netlify, Vercel, GitHub Pages o Cloudflare Pages. No hay build.
- **Demo:** `index.html#demo` abre la app con datos de ejemplo en memoria, sin guardar nada.

## Estructura

```
index.html            portada (ASCII) + app
css/styles.css        sistema visual
js/config.js          URL y llave pública de Supabase, ADMIN_EMAIL
js/app.js             vistas: Hoy · Calendario · Gráficos · Diario · Ajustes
js/moon.js            fase lunar, luna halftone, luna ASCII
js/cycle.js           detección de ciclos y fases
js/charts.js          mapa del periodo, mapas de calor, barras
js/catalog.js         categorías y catálogo por defecto
js/icons.js           iconos de línea
js/db.js              acceso a Supabase y modo demo
supabase/schema.sql   esquema + RLS + semilla
```

## Créditos de imágenes

Las fotografías de orquídeas en `img/` vienen de Wikimedia Commons y se usan con atribución: `orchid-black.jpg` por domdomegg (CC BY 4.0), `orchid-single.jpg` por André Karwath (CC BY-SA 2.5), `orchid-magenta.jpg` por Jedesto (CC BY-SA 4.0), `orchid-spotted.jpg` por Anne Jea. (CC BY-SA 4.0). La app las interviene en tiempo real (estirado en bandas y ASCII) con `js/art.js`.

## Cómo se calcula

- **Luna:** ciclo sinódico de 29,53 días desde la luna nueva de referencia (6 ene 2000). Ocho fases.
- **Ciclo menstrual:** empieza el primer día con flujo ligero, medio o abundante tras al menos diez días sin sangrado. La ovulación se estima 14 días antes del siguiente inicio. El promedio usa los últimos seis ciclos completos (por defecto 28 días).
- **Gráficos:** el mapa del periodo muestra luna, flujo, libido, seggs, dolor y una capa (mood, seggs, síntomas, energy o qué hice) día por día, en una sola tinta. Los mapas de calor cruzan todos tus registros con la fase lunar y con la fase del ciclo.
