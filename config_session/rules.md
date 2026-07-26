# Reglas de trabajo

## 1. Autorización de cambios

- No puedo modificar código sin tu autorización explícita.
- Solo estoy autorizado a trabajar con los archivos locales del proyecto.
- No asumo órdenes implícitas — todo debe ser ordenado explícitamente por escrito.
- No implemento nuevas funciones, interfaces de usuario ni actualizo interfaces existentes sin autorización explícita.

## 2. Pruebas

- **Tú** ejecutas las pruebas y me reportas los resultados.
- Yo solo doy instrucciones detalladas de qué probar y cómo.
- Yo no ejecuto pruebas ni scripts de prueba.

## 3. Git (commits y push)

- **Yo (IA)** ejecuto los commits (`git commit`).
- **Tú** ejecutas `git push` cuando lo decidas.
- **Checkpoint inicial**: antes de comenzar una modificación, yo ejecuto el commit con formato `checkpoint: <descripción>`. Esto permite rollback inmediato.
- Si decides no hacer checkpoint, asumes el riesgo sin posibilidad de rollback automático.

## 5. Rollback

- Para solicitar un rollback, indícame qué commit quieres restaurar.
- Yo te indico el comando exacto (`git revert <hash>` o `git restore .`).
- **Tú** ejecutas el comando.
- Después del rollback, **tú** ejecutas `node --check index.js` para verificar el estado.

## 6. Ciclo de implementación (orden estricto)

1. **Plan**: Yo presento un plan breve: objetivo, archivos a modificar, riesgo estimado.
2. **Autorización**: Tú autorizas la implementación.
3. **Checkpoint** (opcional): Si aceptas, yo ejecuto el commit checkpoint.
4. **Implementación**: Yo desarrollo e implemento los cambios.
5. **Instrucciones de prueba**: Yo te indico exactamente qué probar y cómo.
6. **Pruebas**: Tú ejecutas las pruebas y me dices el resultado.
7. **Resultado positivo**: Tú haces el commit final si lo deseas.
8. **Resultado negativo (error acotado)**: Yo corrijo solo el error específico que me indicas, sin revertir.
9. **Resultado negativo (rotura total)**: Revierte usando el checkpoint del paso 3 y empezamos de cero.
10. **Cierre**: Yo actualizo `memory.md` con el resumen de la sesión.
11. **Repetir**: Me preguntas qué tarea sigue.

## 7. Memory file (`memory.md`)

- Contiene el contexto compacto de la sesión para continuidad entre sesiones de OpenCode.
- Yo lo actualizo al final de cada sesión o cuando tú lo solicites.
- Vive en `config_session/memory.md` (o la raíz junto a este archivo).

## 8. Archivos importantes que leo al iniciar sesión

- `config_session/rules.md` — este archivo.
- `config_session/memory.md` — contexto de la sesión.
- `AGENTS.md` — instrucciones específicas para el agente IA.
- `opencode.json` — configuración del agente.
