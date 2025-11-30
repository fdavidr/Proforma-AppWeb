# Sistema de Cotizaciones y Ventas - Estructura Modular

## 📁 Estructura de Archivos

```
Proforma-AppWeb/
│
├── index.html              # Archivo original (monolítico - 2036 líneas)
├── index-modular.html      # Nuevo archivo HTML modular
│
├── css/
│   └── styles.css          # Todos los estilos CSS organizados
│
├── js/
│   ├── data.js             # Estructura de datos y persistencia
│   ├── app.js              # Inicialización de la aplicación
│   ├── auth.js             # Sistema de autenticación
│   ├── utils.js            # Funciones utilitarias
│   ├── company.js          # Gestión de empresa
│   ├── clients.js          # Gestión de clientes
│   ├── sellers.js          # Gestión de vendedores
│   ├── products.js         # Gestión de productos
│   ├── quotes.js           # Gestión de cotizaciones
│   ├── pdf.js              # Generación de PDF
│   └── history.js          # Gestión de historial
│
├── ARQUITECTURA.md         # Documentación de arquitectura
├── README.md               # Documentación original
└── INSTRUCCIONES.md        # Instrucciones de uso

```

## 🎯 Descripción de Módulos

### **CSS**
- **styles.css** (447 líneas)
  - Reset y configuración base
  - Estilos de login
  - Formularios y controles
  - Botones
  - Header y navegación
  - Tablas de productos
  - Modales
  - Autocompletado
  - Responsive design

### **JavaScript**

#### **1. data.js** - Datos y Persistencia (32 líneas)
- Variable global `appData` con toda la estructura de datos
- `loadData()`: Carga desde localStorage
- `saveData()`: Guarda en localStorage
- Variables de paginación para historial

#### **2. app.js** - Inicialización (9 líneas)
- `init()`: Inicializa la aplicación
- Event listener para DOMContentLoaded
- Orquesta la carga inicial

#### **3. auth.js** - Autenticación (29 líneas)
- `initLogin()`: Configura el formulario de login
- `logout()`: Cierra sesión
- Validación de credenciales (CiamP25/CiamP25)

#### **4. utils.js** - Utilidades (20 líneas)
- `openModal()`: Abre modales
- `closeModal()`: Cierra modales
- `updateUI()`: Actualiza interfaz
- Event listener para cerrar autocompletado

#### **5. company.js** - Gestión de Empresa (34 líneas)
- `openCompanySettings()`: Abre configuración
- `handleLogoUpload()`: Procesa carga de logo
- `saveCompanySettings()`: Guarda configuración

#### **6. clients.js** - Gestión de Clientes (85 líneas)
- `filterClients()`: Filtrado con autocompletado
- `showClientList()`: Muestra lista completa
- `addClientToList()`: Agrega a lista de autocompletado
- `selectClient()`: Selecciona cliente
- `handleClientAction()`: Modal agregar/editar
- `saveClient()`: Guarda cliente (CRUD)

#### **7. sellers.js** - Gestión de Vendedores (79 líneas)
- `filterSellers()`: Filtrado con autocompletado
- `showSellerList()`: Muestra lista completa
- `addSellerToList()`: Agrega a lista
- `selectSeller()`: Selecciona vendedor
- `handleSellerAction()`: Modal agregar/editar
- `saveSeller()`: Guarda vendedor (CRUD)

#### **8. products.js** - Gestión de Productos (120 líneas)
- `filterProducts()`: Filtrado con autocompletado
- `showProductList()`: Muestra lista completa
- `addProductToList()`: Agrega a lista
- `selectProduct()`: Selecciona producto
- `handleProductAction()`: Modal agregar/editar
- `handleProductImageUpload()`: Procesa imagen
- `saveProduct()`: Guarda producto (CRUD)
- `updateProductPreview()`: Vista previa

#### **9. quotes.js** - Gestión de Cotizaciones (154 líneas)
- `setDocumentType()`: Cambia tipo (cotización/nota venta)
- `loadTerms()`: Carga términos según tipo
- `saveTerms()`: Guarda términos editados
- `addProductToQuote()`: Agrega producto a tabla
- `renderQuoteItems()`: Renderiza tabla de productos
- `removeQuoteItem()`: Elimina producto
- `calculateTotals()`: Calcula subtotal, descuento, total
- `newQuote()`: Reinicia formulario

#### **10. pdf.js** - Generación de PDF (323 líneas)
- `generatePDF()`: Función principal de generación
- `addPDFHeader()`: Agrega logo y header
- `addPDFDocumentInfo()`: Tipo y número de documento
- `addPDFClientInfo()`: Información del cliente
- `addPDFSellerInfo()`: Información del vendedor
- `addPDFProductsTable()`: Tabla con bordes
- `addPDFTotals()`: Sección de totales
- `addPDFTerms()`: Términos y condiciones
- `addPDFPageNumbers()`: Numeración de páginas
- `saveToHistory()`: Guarda en historial

#### **11. history.js** - Gestión de Historial (320 líneas)
- `openHistory()`: Abre modal de historial
- `renderHistory()`: Renderiza tabla con paginación
- `updateHistoryPagination()`: Controles de paginación
- `nextHistoryPage()`: Página siguiente
- `prevHistoryPage()`: Página anterior
- `deleteHistoryEntry()`: Elimina entrada
- `redownloadPDF()`: Regenera y descarga PDF desde historial

## 🚀 Cómo Usar

### **Opción 1: Archivo Original**
```html
<!-- Abrir directamente -->
index.html
```
Todo el código en un solo archivo (2036 líneas).

### **Opción 2: Versión Modular (RECOMENDADO)**
```html
<!-- Abrir -->
index-modular.html
```
Código separado en módulos para fácil mantenimiento.

## ✅ Ventajas de la Estructura Modular

1. **Fácil de entender**: Cada archivo tiene una responsabilidad específica
2. **Rápido de navegar**: Encuentras funciones por categoría
3. **Simple de mantener**: Cambios aislados por módulo
4. **Escalable**: Agregar nuevas funcionalidades sin afectar otras
5. **Trabajo en equipo**: Múltiples desarrolladores pueden trabajar sin conflictos
6. **Debugging eficiente**: Errores identificados rápidamente por módulo
7. **Reutilizable**: Módulos pueden usarse en otros proyectos

## 📊 Comparación

| Aspecto | Original | Modular |
|---------|----------|---------|
| **Archivos** | 1 archivo | 12 archivos |
| **Líneas por archivo** | 2036 | 9-447 |
| **Búsqueda de código** | Ctrl+F | Por archivo |
| **Mantenimiento** | Difícil | Fácil |
| **Velocidad de carga** | Similar | Similar |
| **Debugging** | Complejo | Simple |
| **Escalabilidad** | Limitada | Alta |

## 🔄 Flujo de Carga

```
1. index-modular.html
   ↓
2. css/styles.css
   ↓
3. js/data.js         (Estructura de datos)
   ↓
4. js/utils.js        (Utilidades)
   ↓
5. js/auth.js         (Autenticación)
   ↓
6. js/company.js      (Empresa)
   ↓
7. js/clients.js      (Clientes)
   ↓
8. js/sellers.js      (Vendedores)
   ↓
9. js/products.js     (Productos)
   ↓
10. js/quotes.js      (Cotizaciones)
    ↓
11. js/pdf.js         (PDF)
    ↓
12. js/history.js     (Historial)
    ↓
13. js/app.js         (Inicialización)
```

## 🛠️ Mantenimiento

### Para agregar una nueva funcionalidad:

1. Identifica el módulo correspondiente
2. Agrega la función en ese archivo
3. Si es una nueva categoría, crea un nuevo módulo JS
4. Importa el nuevo módulo en `index-modular.html`

### Para corregir un bug:

1. Identifica el módulo afectado por el nombre de la función
2. Abre solo ese archivo
3. Realiza la corrección
4. Prueba la funcionalidad específica

## 📝 Notas

- Ambas versiones (`index.html` e `index-modular.html`) son totalmente funcionales
- La versión modular mantiene 100% de compatibilidad
- Los datos se guardan en `localStorage` bajo la misma clave
- No hay cambios en la funcionalidad, solo en la organización

## 🎓 Recomendación

**Usa `index-modular.html`** para desarrollo y mantenimiento continuo. Es más profesional, organizado y escalable.
