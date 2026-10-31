# Extensiones recomendadas para VS Code

Instálalas desde la vista de extensiones (`Ctrl+Shift+X`) buscando el identificador.

## Frontend (JavaScript, HTML, CSS)
| Extensión | Identificador | Para qué sirve |
|---|---|---|
| Live Server | `ritwickdey.LiveServer` | Sirve la app con recarga automática |
| ESLint | `dbaeumer.vscode-eslint` | Detecta errores y estilo en JavaScript |
| Prettier | `esbenp.prettier-vscode` | Formatea el código con sangría uniforme |
| HTML CSS Support | `ecmel.vscode-html-css` | Autocompleta clases CSS en el HTML |
| Auto Rename Tag | `formulahendry.auto-rename-tag` | Renombra la etiqueta de cierre al editar la de apertura |
| Path Intellisense | `christian-kohler.path-intellisense` | Autocompleta rutas de importación |
| Error Lens | `usernamehw.errorlens` | Muestra los errores en la misma línea |
| EditorConfig | `editorconfig.editorconfig` | Mantiene la misma sangría en todo el equipo |

## Backend (Java, Spring Boot, base de datos)
| Extensión | Identificador | Para qué sirve |
|---|---|---|
| Extension Pack for Java | `vscjava.vscode-java-pack` | Java, depuración, pruebas y Maven |
| Spring Boot Extension Pack | `vmware.vscode-boot-dev-pack` | Herramientas para Spring Boot |
| PostgreSQL | `ckolkman.vscode-postgres` | Consulta la base de datos PostgreSQL (Supabase) |
| SQLTools + driver PostgreSQL | `mtxr.sqltools`, `mtxr.sqltools-driver-pg` | Ejecuta y guarda consultas SQL |
| Docker | `ms-azuretools.vscode-docker` | Construye y ejecuta `deploy/docker-compose.yml` |
| DotENV | `mikestead.dotenv` | Resalta los archivos `.env` |
| YAML | `redhat.vscode-yaml` | Valida los archivos `.yml` |
| Thunder Client | `rangav.vscode-thunder-client` | Prueba los endpoints de `docs/api.md` |

## Calidad y trabajo diario
| Extensión | Identificador | Para qué sirve |
|---|---|---|
| GitLens | `eamodio.gitlens` | Historial y autoría de cada línea |
| Playwright Test for VS Code | `ms-playwright.playwright` | Pruebas en el navegador |
| Markdown All in One | `yzhang.markdown-all-in-one` | Edita README y documentos |
| Code Spell Checker | `streetsidesoftware.code-spell-checker` | Corrige la ortografía |
| Spanish - Code Spell Checker | `streetsidesoftware.code-spell-checker-spanish` | Diccionario en español |
| Spanish Language Pack | `ms-ceintl.vscode-language-pack-es` | VS Code en español |

## Ajustes sugeridos (`.vscode/settings.json`)
```json
{
  "editor.tabSize": 2,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "files.eol": "\n",
  "liveServer.settings.root": "/"
}
```
