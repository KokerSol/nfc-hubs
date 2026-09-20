# 002 — `berrry-sin` no entra en el repositorio público

- **Estado:** aceptada · **complementada por** [003](003-berrry-sin-repo-privado-propio.md)
- **Fecha:** 2026-08-28 (formalizada el 2026-09-20)
- **Aplica a:** `nfc-hubs`, carpeta `src/businesses/berrry-sin/`

## Contexto

`KokerSol/nfc-hubs` es **público**. `berrry-sin` es la instancia de una clienta real y no debe
aparecer en él. Hasta el 20-sep la exclusión vivía en `.git/info/exclude`, que es local y **no
viaja en un clon ni a un runner de CI**: en un checkout limpio no había ninguna protección.

## Decisión

La exclusión vive en el `.gitignore` **versionado**, como lista blanca:

```
src/businesses/*
!src/businesses/demo/
```

Se ignora todo y se readmite solo lo público. Una instancia privada nueva queda excluida **por
no haber hecho nada**: el olvido juega a favor.

## Consecuencias

- Un negocio **público** nuevo no se verá con `git add -A` hasta que se le añada su línea `!`.
  Falla cerrado, no abierto. Es el comportamiento que se quiere.
- La protección ya viaja en un clon. Aplicada en `fc72d0e` (20-sep).

## Cómo se verifica

```bash
git check-ignore -v src/businesses/berrry-sin
git log --all --oneline -- src/businesses/berrry-sin   # debe salir vacío
```

Verificado el 20-sep-2026: `berrry-sin` **nunca** estuvo en el historial. No hubo fuga.
