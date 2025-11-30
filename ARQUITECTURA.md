# Arquitectura del Sistema de Cotizaciones y Ventas

## Estructura del Código (index.html)

El código está organizado en las siguientes secciones principales:

### 1. **HEAD - Configuración y Estilos** (Líneas 1-550)
- Meta tags y título
- CDN de librerías externas (jsPDF, html2canvas)
- Estilos CSS completos
  - Login screen
  - Aplicación principal
  - Header y navegación
  - Formularios y controles
  - Tablas
  - Modales
  - Responsive design

### 2. **BODY - Estructura HTML** (Líneas 551-819)
- **Login Screen**: Pantalla de autenticación
- **App Header**: Logo, información de empresa, navegación
- **Main Content**: 
  - Toggle tipo de documento (Cotización/Nota de Venta)
  - Sección Cliente con autocomplete
  - Sección Vendedor con autocomplete
  - Sección Productos con tabla dinámica
  - Sección Totales
  - Términos y condiciones
  - Botones de acción
- **Modales**:
  - Configuración de empresa
  - Gestión de clientes
  - Gestión de vendedores
  - Gestión de productos
  - Historial de PDFs

### 3. **JAVASCRIPT - Lógica de Aplicación** (Líneas 820-2036)

#### 3.1. Data Storage (Líneas 820-886)
- `appData`: Objeto principal que contiene toda la información
  - company: Datos de la empresa
  - clients: Array de clientes
  - sellers: Array de vendedores
  - products: Array de productos
  - pdfHistory: Historial de PDFs generados
  - currentQuoteNumber: Número correlativo
  - currentClient/Seller/Product: Elementos seleccionados
  - currentQuoteItems: Productos en la cotización actual
  - documentType: 'cotizacion' o 'notaventa'
  - terms: Términos por tipo de documento

#### 3.2. Initialization (Líneas 887-916)
- `init()`: Inicialización de la aplicación
- `loadData()`: Carga datos desde localStorage
- `saveData()`: Guarda datos en localStorage
- `updateUI()`: Actualiza interfaz con datos cargados

#### 3.3. Authentication (Líneas 917-953)
- Login form handler
- `logout()`: Cierre de sesión

#### 3.4. Company Management (Líneas 954-991)
- `openCompanySettings()`: Abre modal de configuración
- `handleLogoUpload()`: Procesa carga de logo
- `saveCompanySettings()`: Guarda configuración de empresa

#### 3.5. Document Type Management (Líneas 992-1007)
- `setDocumentType()`: Cambia entre cotización/nota de venta
- `loadTerms()`: Carga términos según tipo
- `saveTerms()`: Guarda términos editados

#### 3.6. Client Management (Líneas 1008-1088)
- `filterClients()`: Filtrado con autocomplete
- `showClientList()`: Muestra lista de clientes
- `addClientToList()`: Agrega cliente a lista
- `selectClient()`: Selecciona cliente
- `handleClientAction()`: Abre modal para agregar/editar
- `saveClient()`: Guarda cliente nuevo o editado

#### 3.7. Seller Management (Líneas 1089-1163)
- `filterSellers()`: Filtrado con autocomplete
- `showSellerList()`: Muestra lista de vendedores
- `addSellerToList()`: Agrega vendedor a lista
- `selectSeller()`: Selecciona vendedor
- `handleSellerAction()`: Abre modal para agregar/editar
- `saveSeller()`: Guarda vendedor nuevo o editado

#### 3.8. Product Management (Líneas 1164-1280)
- `filterProducts()`: Filtrado con autocomplete
- `showProductList()`: Muestra lista de productos
- `addProductToList()`: Agrega producto a lista
- `selectProduct()`: Selecciona producto
- `handleProductAction()`: Abre modal para agregar/editar
- `handleProductImageUpload()`: Procesa imagen del producto
- `saveProduct()`: Guarda producto nuevo o editado
- `updateProductPreview()`: Actualiza vista previa
- `addProductToQuote()`: Agrega producto a cotización
- `renderQuoteItems()`: Renderiza tabla de productos
- `removeQuoteItem()`: Elimina producto de cotización
- `calculateTotals()`: Calcula subtotal, descuento y total

#### 3.9. PDF Generation (Líneas 1281-1786)
- `generatePDF()`: Genera PDF principal
  - Validaciones
  - Configuración de documento
  - Header con logo y datos de empresa
  - Información de cliente y vendedor
  - Tabla de productos con bordes
  - Totales
  - Términos y condiciones
  - Numeración de páginas
  - Guardado en historial

#### 3.10. Utility Functions (Líneas 1787-1820)
- `openModal()`: Abre modal por ID
- `closeModal()`: Cierra modal
- `newQuote()`: Reinicia formulario para nueva cotización

#### 3.11. History Management (Líneas 1821-2036)
- `openHistory()`: Abre modal de historial
- `renderHistory()`: Renderiza tabla de historial con paginación
- `updateHistoryPagination()`: Actualiza controles de paginación
- `nextHistoryPage()`: Página siguiente
- `prevHistoryPage()`: Página anterior
- `deleteHistoryEntry()`: Elimina entrada del historial
- `redownloadPDF()`: Regenera y descarga PDF desde historial
  - Recrea PDF con datos guardados
  - Misma estructura que generatePDF()

## Flujo de Datos

```
Usuario → Login → App Principal
                      ↓
         [Selección Cliente/Vendedor/Productos]
                      ↓
         [Agregar productos a tabla]
                      ↓
         [Cálculo automático de totales]
                      ↓
         [Generar PDF] → Guarda en historial
                      ↓
         [Descarga PDF] + [Incrementa número]
                      ↓
         [Nueva cotización o consultar historial]
```

## Persistencia de Datos

- **localStorage**: Todos los datos se guardan en `proformaAppData`
- **Formato**: JSON con estructura completa de appData
- **Actualización**: Automática en cada operación CRUD

## Características Clave

1. **Single Page Application (SPA)**: Todo en un solo archivo HTML
2. **Autocomplete**: Búsqueda dinámica en clientes, vendedores y productos
3. **CRUD Completo**: Crear, leer, actualizar (editar) sin eliminar
4. **PDF Profesional**: Diseño personalizado con logo, tablas con bordes, imágenes
5. **Historial**: Almacena todos los PDFs generados con opción de re-descarga
6. **Paginación**: 20 items por página en el historial
7. **Responsive**: Adaptable a diferentes tamaños de pantalla
8. **Términos Personalizables**: Diferentes para cotización vs nota de venta

## Mejoras Aplicadas (Últimas)

1. ✅ Reducción de ancho de columna Cantidad a 12px
2. ✅ Reducción de margin top del logo (10px total)
3. ✅ Reducción de espacio hasta línea horizontal (10px total)
4. ✅ Bordes completos en tabla de productos PDF
5. ✅ Líneas verticales entre todas las columnas

## Organización del Código

El código sigue el patrón:
- **Declaración**: Variables y estructura de datos
- **Inicialización**: Carga y preparación
- **Eventos**: Handlers de formularios y clicks
- **CRUD**: Operaciones por entidad (Cliente, Vendedor, Producto)
- **Generación**: Lógica de PDF
- **Utilidades**: Funciones auxiliares

Todos los comentarios están en español y organizados por secciones claramente marcadas con `// ==================== SECCIÓN ====================`
