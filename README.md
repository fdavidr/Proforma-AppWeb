# Sistema de Cotizaciones y Notas de Venta

Sistema web completo para generar cotizaciones y notas de venta con gestión de clientes, vendedores y productos.

## Características

✅ **Sistema de Login**
- Usuario: `CiamP25`
- Contraseña: `CiamP25`

✅ **Gestión de Empresa**
- Configuración de nombre, eslogan y logo
- Numeración automática de cotizaciones (inicia en 100000)

✅ **Gestión de Clientes**
- Agregar, editar y seleccionar clientes
- Datos: Nombre, Teléfono, CI/CNIT, Empresa
- Filtrado en tiempo real
- Validación visual (fondo verde al seleccionar)

✅ **Gestión de Vendedores**
- Agregar, editar y seleccionar vendedores
- Datos: Nombre, Celular
- Filtrado en tiempo real
- Validación visual

✅ **Gestión de Productos**
- Agregar, modificar y seleccionar productos
- Datos: Código, Descripción, Precio, Imagen
- Filtrado en tiempo real
- Soporte para imágenes de productos

✅ **Sistema de Cotización/Nota de Venta**
- Agregar productos con cantidad, precio y descuento (% o Bs)
- Cálculo automático de subtotales y totales
- Vista previa de productos en tabla
- Imágenes de productos (25x25px)

✅ **Términos y Condiciones**
- 4 términos personalizables
- Diferentes términos para cotizaciones y notas de venta

✅ **Generación de PDF**
- Diseño profesional
- Paginación automática (ej: Página 1 de 2)
- Incluye todos los datos del documento

✅ **Almacenamiento Local**
- Todos los datos se guardan en localStorage del navegador
- Persistencia de información entre sesiones

## Cómo Usar

1. **Iniciar Sesión**
   - Usuario: CiamP25
   - Contraseña: CiamP25

2. **Configurar Empresa**
   - Clic en "⚙️ Configuración"
   - Ingresar nombre, eslogan y cargar logo

3. **Agregar Clientes y Vendedores**
   - Usar los botones "Agregar Cliente" y "Agregar Vendedor"
   - Completar datos obligatorios (Nombre)

4. **Agregar Productos**
   - Clic en "Nuevo Producto"
   - Ingresar descripción, código, precio e imagen

5. **Crear Cotización**
   - Seleccionar tipo: Cotización o Nota de Venta
   - Seleccionar cliente y vendedor
   - Agregar productos con cantidad y descuento
   - Personalizar términos y condiciones
   - Generar PDF

## Despliegue en Firebase

### Requisitos
- Cuenta de Firebase
- Firebase CLI instalado

### Pasos

1. **Instalar Firebase CLI** (si no lo tienes):
```bash
npm install -g firebase-tools
```

2. **Iniciar sesión en Firebase**:
```bash
firebase login
```

3. **Crear proyecto en Firebase Console**:
   - Ir a https://console.firebase.google.com
   - Crear nuevo proyecto
   - Copiar el ID del proyecto

4. **Configurar el proyecto**:
   - Editar `.firebaserc` y reemplazar `"tu-proyecto-firebase"` con tu ID de proyecto

5. **Desplegar**:
```bash
firebase deploy --only hosting
```

6. **Acceder a tu aplicación**:
   - URL: `https://tu-proyecto-firebase.web.app`
   - O la URL personalizada que Firebase te proporcione

## Tecnologías Utilizadas

- **HTML5**: Estructura
- **CSS3**: Diseño responsive y amigable
- **JavaScript (Vanilla)**: Lógica de la aplicación
- **localStorage**: Almacenamiento de datos
- **jsPDF**: Generación de PDFs
- **Firebase Hosting**: Despliegue gratuito

## Características Técnicas

- **Sin dependencias de backend**: Todo funciona en el navegador
- **Sin base de datos externa**: Datos en localStorage
- **100% gratuito**: Hosting gratuito en Firebase
- **Responsive**: Funciona en móviles y tablets
- **Intuitivo**: Interfaz amigable con colores claros
- **Validación visual**: Fondos verdes para selecciones válidas
- **Filtros en tiempo real**: Búsqueda rápida de clientes, vendedores y productos

## Soporte

Para cualquier consulta o mejora, editar directamente el archivo `index.html`.

---

**Versión**: 1.0.0  
**Fecha**: Noviembre 2025
