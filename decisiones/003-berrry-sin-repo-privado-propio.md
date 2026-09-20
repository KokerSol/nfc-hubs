# 003 — `berrry-sin` tiene su propio repositorio privado

- **Estado:** aceptada, **aplicada a medias**
- **Fecha:** 2026-09-20
- **Aplica a:** `nfc-hubs`, carpeta `src/businesses/berrry-sin/`

## Contexto

La [002](002-berrry-sin-fuera-del-repo-publico.md) saca a `berrry-sin` del repo público, y eso
está bien. Pero tiene un efecto colateral que nadie había escrito: al estar fuera de git,
`berrry-sin` **no tenía histórico ni ninguna copia fuera de este disco**.

Agravantes verificados el 20-sep:
- `Perfil-de-necesidades.md` afirmaba desde el 9-sep que existía una copia cifrada en
  `secure-backups/`. **La carpeta estaba vacía.** No existía.
- OneDrive no sincroniza desde junio.

Atenuante, también verificado y que rebaja la urgencia: son **3 ficheros y 9 KB**
(`business.json`, `index.njk`, `theme.css`), no un volumen de trabajo grande.

## Decisión

`berrry-sin` es un repositorio git propio y **privado**, anidado dentro de la carpeta que el
repo padre ya ignora entera. Los ficheros se siguen editando en su sitio; ganan histórico y una
copia fuera del disco.

**Esta decisión NO contradice a la 002.** La 002 dice «fuera del repo público»; la 003 dice
«además, con histórico propio». La contradicción aparente del 20-sep venía de que ninguna de las
dos estaba escrita, y una regla en `CLAUDE.md` decía «nunca comitear» como absoluto sin contexto.

## Consecuencias

- Hay dos repos en la misma carpeta. Es intencionado y no rompe nada: el padre ignora la carpeta
  entera, así que ni la ve.
- La regla de `CLAUDE.md` y la entrada de `autoMode.hard_deny` que mencionan `berrry-sin` **deben
  citar esta decisión** en vez de afirmar un absoluto. Ver `METODO.md` §4.

## Estado de aplicación

| Paso | Estado |
|---|---|
| Repo local con primer commit (`86b7bd7`) | ✅ hecho |
| Remoto privado en GitHub | ❌ **pendiente** |

**Por qué está pendiente:** `gh repo create KokerSol/...` falla siempre — `KokerSol` es una
cuenta de **usuario**, no una organización, y `DiegoJS97` solo tiene `push`, no `admin`. Y el
intento de crearlo bajo `DiegoJS97` lo bloqueó el clasificador por la entrada de
`autoMode.hard_deny`, que es justo lo que el §6.2 de `METODO.md` propone sustituir.

**Para cerrarlo:** crear el repo privado entrando con la cuenta KokerSol, o aceptar que viva bajo
`DiegoJS97` y transferirlo luego. Después: `git remote add origin <url>` y `git push -u origin main`.

## Cómo se verifica

```bash
git -C src/businesses/berrry-sin log --oneline    # debe haber al menos un commit
git -C src/businesses/berrry-sin remote -v        # vacío = sigue sin copia fuera del disco
```
