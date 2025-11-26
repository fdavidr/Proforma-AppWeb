# Instrucciones del Sistema de Cotizaciones

## Credenciales
- Usuario: `CiamP25`
- Contraseña: `CiamP25`

## Archivos del Proyecto
- `index.html` - Aplicación completa (HTML + CSS + JavaScript)
- `firebase.json` - Configuración para Firebase Hosting
- `.firebaserc` - Configuración del proyecto Firebase
- `README.md` - Documentación completa
- `.gitignore` - Archivos a ignorar en Git

## Características Implementadas

### ✅ Sistema de Login
- Usuario único con credenciales fijas

### ✅ Gestión de Empresa
- Nombre, eslogan y logo editables
- Numeración automática de cotizaciones (inicia en 100000)

### ✅ Gestión de Clientes
- Datos: Nombre, Teléfono, CI/CNIT, Empresa
- Filtro en tiempo real
- Validación visual (fondo verde)
- Botón dinámico Agregar/Editar

### ✅ Gestión de Vendedores
- Datos: Nombre, Celular
- Filtro en tiempo real
- Validación visual (fondo verde)
- Botón dinámico Agregar/Editar

### ✅ Gestión de Productos
- Datos: Código, Descripción, Precio, Imagen, Fecha de registro
- Filtro en tiempo real
- Validación visual (fondo verde)
- Botón dinámico Nuevo/Modificar
- Imágenes de productos (25x25px en tabla)

### ✅ Sistema de Cotización/Nota de Venta
- Agregar productos con cantidad, precio y descuento (% o Bs)
- Cálculos automáticos en tiempo real
- Subtotal, Descuento Total y Total
- Tabla con todos los productos agregados

### ✅ Términos y Condiciones
- 4 términos editables
- Diferentes para Cotización vs Nota de Venta

### ✅ Generación de PDF
- Diseño profesional
- Numeración de páginas (ej: Página 1 de 2)
- Incluye logo, datos completos y términos

### ✅ Almacenamiento
- localStorage del navegador (datos persisten localmente)
- No requiere backend ni base de datos

## Uso Básico

1. Abrir `index.html` en el navegador
2. Iniciar sesión con CiamP25/CiamP25
3. Configurar empresa (botón ⚙️)
4. Agregar clientes, vendedores y productos
5. Crear cotizaciones/notas de venta
6. Generar PDF

## Despliegue en Firebase

```bash
# 1. Instalar Firebase CLI
npm install -g firebase-tools

# 2. Iniciar sesión
firebase login

# 3. Editar .firebaserc con tu ID de proyecto

# 4. Desplegar
firebase deploy --only hosting
```

## Sincronización con GitHub

### Desde casa (después de hacer cambios):
1. Abrir GitHub Desktop
2. Ver cambios en la izquierda
3. Escribir descripción del commit
4. Clic en "Commit to main"
5. Clic en "Push origin" (flecha arriba)

### Desde la oficina (al empezar):
1. Abrir GitHub Desktop
2. Clic en "Fetch origin"
3. Si hay cambios, clic en "Pull origin"
4. Abrir proyecto en VS Code

## Tecnologías Utilizadas
- HTML5
- CSS3
- JavaScript (Vanilla)
- jsPDF (generación de PDFs)
- localStorage (almacenamiento)
- Firebase Hosting (despliegue gratuito)

## Notas Importantes
- Los datos se guardan en localStorage del navegador
- Cada navegador tiene sus propios datos
- El PDF se genera en el cliente (sin backend)
- La aplicación funciona completamente offline
- GitHub Desktop sincroniza el código, no los datos

## Contacto/Soporte
Para modificaciones, editar `index.html` directamente.
Todo el código está en un solo archivo para fácil mantenimiento.
