# TekaPoker

Aplicación web para gestionar y liquidar las partidas de póker que jugamos entre amigos. Después de cada partida introduces lo que ha puesto cada jugador y las fichas con las que termina, y la app calcula cuánto gana o pierde cada uno y quién tiene que pagar a quién con el menor número de transferencias. Además guarda el histórico, mantiene un ranking y ofrece estadísticas y un análisis de los datos por IA.

Está pensada para usarse después de la partida (registro y liquidación), no durante el juego.

## Funcionalidades

- Registro de partidas seleccionando jugadores de una lista persistente (se pueden crear nuevos sobre la marcha).
- Buy-in individual por jugador: cada uno puede haber puesto una cantidad distinta (por ejemplo, alguien que recompra durante la partida).
- Recompras entre jugadores: cuando alguien compra fichas a otro jugador porque se acabaron las de la caja, y se lo paga al liquidar. La app lo tiene en cuenta para que las cuentas cuadren.
- Cálculo de la liquidación con el mínimo número de pagos.
- Historial de partidas con detalle de jugadores y pagos.
- Ranking global con podio y clasificación completa.
- Estadísticas por jugador: neto total, win-rate, mejor y peor partida, rachas y gráfica de evolución.
- Analíticas del grupo: evolución del dinero acumulado, comparador de jugadores por métrica, ranking de consistencia, tendencia reciente y reparto de partidas por número de jugadores.
- Analista por IA: un chat que responde preguntas sobre los datos del grupo, usando únicamente la información real de la base de datos.
- Caja de fichas: configura tu set (color, valor en puntos y cantidad) y reparte las fichas a partes iguales calculando el valor de cada punto a partir del buy-in.
- Acceso protegido por contraseña.

## Cómo funciona el cálculo

El cálculo está en `frontend/src/services/calculator.js`.

1. Valor de cada ficha:

   ```
   valorPorFicha = (suma de todos los buy-ins) / (suma de todas las fichas finales)
   ```

2. Resultado de cada jugador:

   ```
   dineroFinal = fichasFinales * valorPorFicha
   neto        = dineroFinal - buyInEfectivo
   ```

   Un neto positivo significa que el jugador gana; negativo, que pierde. La suma de todos los netos es siempre 0.

3. Liquidación: se separan los jugadores en acreedores (ganan) y deudores (pierden) y se aplica un algoritmo voraz que empareja al mayor deudor con el mayor acreedor, minimizando el número de pagos.

### Recompras entre jugadores

Cuando A compra fichas a B (porque se acabaron las de la caja) y se lo paga al liquidar, no entra dinero nuevo al bote (esas fichas ya estaban en juego). Lo que cambia es el buy-in efectivo de cada uno:

```
buyInEfectivo = buyIn + (fichas compradas a otros) - (fichas vendidas a otros)
```

Así la deuda por las fichas se combina automáticamente con el resultado de la partida y aparece reflejada en los pagos finales, sin tener que hacer pagos aparte. La suma de netos sigue siendo 0.

Ejemplo: 4 jugadores ponen 10 € cada uno (bote 40 €). A se queda sin fichas y compra 10 € a B. Si A acaba perdiendo y B ganando, la app calcula que A le paga 5 € a B, importe que ya combina la compra de fichas con el resultado del juego.

## Tecnologías

- Frontend: React 18 + Vite 5 (SPA, diseño móvil-first).
- Routing: React Router 6.
- Estilos: CSS con variables de diseño, tema oscuro.
- Iconos: lucide-react. Gráficas: Recharts.
- Base de datos: Supabase (PostgreSQL).
- Función serverless en Vercel (Node) para el chat de IA.
- IA: API de Groq (modelo Llama 3.3).
- Hosting: Vercel, con despliegue automático desde GitHub.

## Estructura del proyecto

```
tekapoker/
├── README.md
├── guia-tekapoker.html        Guía detallada del proyecto (HTML)
├── supabase/
│   └── schema.sql             Esquema SQL de las tablas
└── frontend/
    ├── api/
    │   └── chat.js            Función serverless del analista IA (Groq)
    ├── vercel.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx            Rutas + protección por login
        ├── components/        Navbar, Toast, ConfirmDialog, LoadingSpinner
        ├── pages/
        │   ├── Login.jsx
        │   ├── Home.jsx
        │   ├── NewGame.jsx
        │   ├── Results.jsx
        │   ├── History.jsx
        │   ├── Ranking.jsx
        │   ├── Analytics.jsx
        │   ├── ChipCase.jsx
        │   ├── Players.jsx
        │   └── PlayerStats.jsx
        └── services/
            ├── supabase.js     Cliente de Supabase
            ├── database.js     Consultas a la base de datos
            ├── calculator.js   Algoritmo de liquidación
            ├── analytics.js    Cálculo de estadísticas
            ├── chipCase.js     Reparto de fichas (localStorage)
            └── ai.js           Cliente del endpoint /api/chat
```

## Base de datos

La base de datos está en Supabase (PostgreSQL). El esquema completo está en `supabase/schema.sql`.

- `players`: jugadores registrados (`id`, `name`, `avatar_color`, `created_at`).
- `games`: cada partida jugada (`id`, `played_at`, `buy_in`, `total_players`, `notes`).
- `game_players`: resultado de cada jugador en una partida (`points`, `final_money`, `net`).
- `transactions`: pagos para liquidar una partida (`from_player_id`, `to_player_id`, `amount`).

Al borrar una partida, sus filas hijas se eliminan en cascada. Los resultados, incluidas las recompras entre jugadores, quedan reflejados en el campo `net`, por lo que no hace falta ampliar el esquema para esas funcionalidades.

## Analista IA

El chat está diseñado para ser fiable y no inventarse datos. Funciona como un RAG sencillo: el frontend calcula un resumen estructurado de las estadísticas reales (a partir de Supabase) y se lo envía al modelo como contexto. Las instrucciones del sistema obligan a usar solo esos datos, a responder "No tengo ese dato registrado" cuando algo no está, y a no inventar cifras ni nombres. Se ejecuta con temperatura baja para respuestas estables.

El selector "¿Quién eres?" indica desde qué jugador se está hablando, para personalizar el análisis. La clave de la IA vive solo en la función serverless `frontend/api/chat.js` (variable de entorno del servidor); el navegador nunca la ve.

En desarrollo local con Vite el chat no funciona, porque la función serverless solo se ejecuta en Vercel (o con `vercel dev`). El resto de la app sí funciona en local.

## Caja de fichas

Las fichas valen puntos, no euros. Cada color tiene un valor en puntos (por defecto blanca 1, roja 2, verde 5, azul 10, negra 20), editable porque en algunas partidas se cambia el valor de algún color. Las fichas se reparten a partes iguales entre los jugadores y el buy-in determina cuánto vale cada punto:

```
valorPorPunto = buyIn / puntosPorJugador
```

La configuración se guarda en el navegador (localStorage), así que se ajusta una vez por dispositivo.

## Acceso

La app está protegida por una contraseña sencilla, suficiente para evitar que cualquiera entre y modifique los datos. La pantalla de login guarda una marca de sesión en localStorage y `App.jsx` redirige al login si no hay sesión. El botón "Salir" de la barra inferior la cierra.

## Desarrollo en local

Requisitos: Node.js 18 o superior, una cuenta de Supabase y, opcionalmente, una cuenta de Groq para el chat.

```
git clone https://github.com/imartinnez/TekaPoker.git
cd TekaPoker/frontend
npm install
```

Crea la base de datos ejecutando `supabase/schema.sql` en el SQL Editor de Supabase. Después crea un archivo `frontend/.env` con tus credenciales (ver más abajo) y arranca:

```
npm run dev        # http://localhost:5173
npm run build      # genera frontend/dist/
```

## Variables de entorno

| Variable | Dónde | Descripción |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | Cliente | URL del proyecto de Supabase |
| `VITE_SUPABASE_ANON_KEY` | Cliente | Clave pública (anon) de Supabase |
| `GROQ_API_KEY` | Servidor (Vercel) | Clave de Groq para el chat de IA |
| `GROQ_MODEL` | Servidor (Vercel) | Opcional; por defecto `llama-3.3-70b-versatile` |

Las variables `VITE_*` se incluyen en el build del cliente (solo para claves públicas). `GROQ_API_KEY` es secreta y se configura únicamente en Vercel, nunca en el código.

## Despliegue

La app se despliega en Vercel automáticamente con cada push a `main`.

- Root Directory: `frontend`.
- Framework: Vite.
- Variables de entorno: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GROQ_API_KEY` y, opcionalmente, `GROQ_MODEL`.

El contenido de `frontend/` se compila con Vite y se sirve como sitio estático; la carpeta `frontend/api/` se despliega como función serverless. El `vercel.json` reescribe todas las rutas al `index.html` del SPA salvo las que empiezan por `/api/`.

```
git add -A
git commit -m "..."
git push origin main
```
