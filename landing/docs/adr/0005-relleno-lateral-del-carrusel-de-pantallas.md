# 0005 — El carrusel de Pantallas necesita relleno lateral de media pantalla

**Fecha:** histórica (previa a esta limpieza) — bug real.

## Problema

En pantallas anchas, las 4 tarjetas del carrusel (`Screens.tsx`, sección "Pantallas") entraban
completas en el viewport sin necesidad de scroll — las flechas de navegación no tenían nada que
mover, y la tarjeta "activa" quedaba sin poder centrarse.

## Decisión

El contenedor con scroll usa `px-[calc(50%-125px)]` (`calc(50%-150px)` en `sm:`) como relleno
lateral — la mitad del ancho de una tarjeta. Así SIEMPRE hay espacio de sobra a los costados,
garantizando que cualquier tarjeta pueda centrarse con scroll sin importar cuán ancha sea la
ventana. No reducir ese padding a un valor fijo chico pensando que "ya se ve bien" en una pantalla
de prueba — el bug solo aparece en pantallas anchas.

Código: `landing/src/components/sections/Screens.tsx`.
