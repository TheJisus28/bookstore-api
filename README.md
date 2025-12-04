# Bookstore E-commerce API

API REST completa para un e-commerce de librería desarrollada con NestJS y PostgreSQL.

## Base URL

```
http://localhost:3000
```

## Autenticación

La API utiliza JWT (JSON Web Tokens) para autenticación. Para acceder a endpoints protegidos, incluye el token en el header:

```
Authorization: Bearer <token>
```

### Obtener Token

1. **Registro**: `POST /auth/register`
2. **Login**: `POST /auth/login`

Ambos endpoints retornan un objeto con `access_token` y `user`.

## Roles

- **admin**: Acceso completo a todos los endpoints
- **customer**: Acceso limitado a sus propios recursos

## Paginación

Todos los endpoints de listado soportan paginación mediante query parameters:

```
?page=1&limit=10
```

**Respuesta paginada:**

```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

---

## Endpoints

### 🔐 Autenticación

#### POST `/auth/register`

Registrar un nuevo usuario (customer).

**Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890" // opcional
}
```

**Response:** `201 Created`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "customer"
  }
}
```

#### POST `/auth/login`

Iniciar sesión (admin o customer).

**Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK` (mismo formato que register)

#### GET `/auth/profile`

Obtener perfil del usuario autenticado.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "customer"
}
```

---

### 📚 Libros

#### GET `/books`

Listar libros (solo activos para customers).

**Query Params:**

- `page` (opcional, default: 1)
- `limit` (opcional, default: 10, max: 100)
- `search` (opcional): término de búsqueda

**Response:** `200 OK` (paginated)

#### GET `/books/admin`

Listar todos los libros incluyendo inactivos.

**Auth:** Admin only

**Response:** `200 OK` (paginated)

#### GET `/books/:id`

Obtener un libro por ID.

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "isbn": "1234567890",
  "title": "Book Title",
  "description": "Description",
  "price": 29.99,
  "stock": 10,
  "pages": 300,
  "publication_date": "2024-01-01",
  "language": "Spanish",
  "publisher_id": "uuid",
  "category_id": "uuid",
  "cover_image_url": "https://...",
  "is_active": true
}
```

#### POST `/books`

Crear un nuevo libro.

**Auth:** Admin only

**Body:**

```json
{
  "isbn": "1234567890",
  "title": "New Book",
  "description": "Description",
  "price": 29.99,
  "stock": 10,
  "pages": 300,
  "publication_date": "2024-01-01",
  "language": "Spanish",
  "publisher_id": "uuid",
  "category_id": "uuid",
  "cover_image_url": "https://..."
}
```

#### PUT `/books/:id`

Actualizar un libro.

**Auth:** Admin only

**Body:** (todos los campos opcionales)

```json
{
  "title": "Updated Title",
  "price": 35.99,
  "stock": 15,
  "is_active": true
}
```

#### DELETE `/books/:id`

Eliminar un libro.

**Auth:** Admin only

**Response:** `200 OK`

#### GET `/books/search/advanced`

Búsqueda avanzada de libros.

**Query Params:**

- `search` (opcional): término de búsqueda
- `category` (opcional): UUID de categoría
- `minPrice` (opcional): precio mínimo
- `maxPrice` (opcional): precio máximo
- `minRating` (opcional): rating mínimo (1-5)
- `page` (opcional)
- `limit` (opcional)

**Response:** `200 OK` (paginated)

#### GET `/books/bestsellers`

Obtener libros más vendidos.

**Query Params:**

- `limit` (opcional, default: 10)
- `startDate` (opcional): formato YYYY-MM-DD
- `endDate` (opcional): formato YYYY-MM-DD

**Response:** `200 OK`

```json
[
  {
    "book_id": "uuid",
    "title": "Book Title",
    "total_sold": 150,
    "total_revenue": 4498.5,
    "average_rating": 4.5
  }
]
```

#### GET `/books/:id/authors`

Obtener autores de un libro.

**Response:** `200 OK`

```json
[
  {
    "book_id": "uuid",
    "book_title": "Book Title",
    "author_id": "uuid",
    "author_name": "John Doe",
    "is_primary": true
  }
]
```

#### POST `/books/:id/authors`

Agregar autor a un libro.

**Auth:** Admin only

**Body:**

```json
{
  "author_id": "uuid",
  "is_primary": false
}
```

#### DELETE `/books/:id/authors/:authorId`

Eliminar autor de un libro.

**Auth:** Admin only

---

### 👤 Autores

#### GET `/authors`

Listar autores (paginated).

**Response:** `200 OK` (paginated)

#### GET `/authors/:id`

Obtener un autor por ID.

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "first_name": "John",
  "last_name": "Doe",
  "bio": "Biography",
  "birth_date": "1980-01-01",
  "nationality": "Spanish"
}
```

#### POST `/authors`

Crear un autor.

**Auth:** Admin only

**Body:**

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "bio": "Biography",
  "birth_date": "1980-01-01",
  "nationality": "Spanish"
}
```

#### PUT `/authors/:id`

Actualizar un autor.

**Auth:** Admin only

#### DELETE `/authors/:id`

Eliminar un autor.

**Auth:** Admin only

---

### 📂 Categorías

#### GET `/categories`

Listar categorías (paginated).

**Response:** `200 OK` (paginated)

#### GET `/categories/:id`

Obtener una categoría por ID.

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "name": "Ficción",
  "description": "Novelas de ficción",
  "parent_id": null
}
```

#### POST `/categories`

Crear una categoría.

**Auth:** Admin only

**Body:**

```json
{
  "name": "Ficción",
  "description": "Novelas de ficción",
  "parent_id": null
}
```

#### PUT `/categories/:id`

Actualizar una categoría.

**Auth:** Admin only

#### DELETE `/categories/:id`

Eliminar una categoría.

**Auth:** Admin only

---

### 🏢 Editoriales

#### GET `/publishers`

Listar editoriales (paginated).

**Response:** `200 OK` (paginated)

#### GET `/publishers/:id`

Obtener una editorial por ID.

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "name": "Editorial Planeta",
  "address": "Calle...",
  "city": "Barcelona",
  "country": "España",
  "phone": "+34...",
  "email": "contact@planeta.es",
  "website": "https://..."
}
```

#### POST `/publishers`

Crear una editorial.

**Auth:** Admin only

**Body:**

```json
{
  "name": "Editorial Planeta",
  "address": "Calle...",
  "city": "Barcelona",
  "country": "España",
  "phone": "+34...",
  "email": "contact@planeta.es",
  "website": "https://..."
}
```

#### PUT `/publishers/:id`

Actualizar una editorial.

**Auth:** Admin only

#### DELETE `/publishers/:id`

Eliminar una editorial.

**Auth:** Admin only

---

### 🛒 Carrito

**Todos los endpoints requieren autenticación (customer only)**

#### GET `/cart`

Obtener items del carrito del usuario autenticado.

**Response:** `200 OK`

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "book_id": "uuid",
    "quantity": 2,
    "title": "Book Title",
    "price": 29.99,
    "cover_image_url": "https://..."
  }
]
```

#### POST `/cart`

Agregar item al carrito.

**Body:**

```json
{
  "book_id": "uuid",
  "quantity": 2
}
```

**Response:** `201 Created`

#### PUT `/cart/:id`

Actualizar cantidad de un item.

**Body:**

```json
{
  "quantity": 3
}
```

#### DELETE `/cart/:id`

Eliminar un item del carrito.

#### DELETE `/cart`

Vaciar todo el carrito.

---

### 📦 Pedidos

#### POST `/orders`

Crear pedido desde el carrito.

**Auth:** Customer only

**Body:**

```json
{
  "address_id": "uuid",
  "discount_code": "DESC10" // opcional
}
```

**Response:** `201 Created`

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "address_id": "uuid",
  "status": "pending",
  "total_amount": 64.99,
  "shipping_cost": 5.0,
  "discount_amount": 0,
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### GET `/orders/my-orders`

Obtener mis pedidos (customer).

**Auth:** Customer only

**Query Params:** `page`, `limit`

**Response:** `200 OK` (paginated)

#### GET `/orders/admin`

Obtener todos los pedidos.

**Auth:** Admin only

**Query Params:** `page`, `limit`

**Response:** `200 OK` (paginated)

#### GET `/orders/:id`

Obtener un pedido por ID.

**Auth:** Required (customer solo puede ver sus propios pedidos)

**Response:** `200 OK`

#### PUT `/orders/:id/status`

Actualizar estado de un pedido.

**Auth:** Admin only

**Body:**

```json
{
  "status": "shipped" // pending, processing, shipped, delivered, cancelled, returned
}
```

#### GET `/orders/:id/items`

Obtener items de un pedido.

**Auth:** Required

**Response:** `200 OK`

```json
[
  {
    "id": "uuid",
    "order_id": "uuid",
    "book_id": "uuid",
    "quantity": 2,
    "unit_price": 29.99,
    "subtotal": 59.98
  }
]
```

---

### ⭐ Reseñas

#### GET `/reviews/book/:bookId`

Obtener reseñas de un libro.

**Query Params:** `page`, `limit`

**Response:** `200 OK` (paginated)

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "book_id": "uuid",
      "rating": 5,
      "comment": "Excelente libro",
      "first_name": "John",
      "last_name": "Doe",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 10
}
```

#### GET `/reviews/:id`

Obtener una reseña por ID.

**Response:** `200 OK`

#### POST `/reviews`

Crear una reseña.

**Auth:** Customer only

**Body:**

```json
{
  "book_id": "uuid",
  "rating": 5, // 1-5
  "comment": "Excelente libro" // opcional
}
```

**Response:** `201 Created`

#### PUT `/reviews/:id`

Actualizar una reseña (solo propias).

**Auth:** Customer only

**Body:**

```json
{
  "rating": 4,
  "comment": "Muy bueno"
}
```

#### DELETE `/reviews/:id`

Eliminar una reseña (solo propias).

**Auth:** Customer only

---

### 📍 Direcciones

**Todos los endpoints requieren autenticación**

#### GET `/addresses`

Obtener mis direcciones.

**Response:** `200 OK`

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "street": "Calle Principal 123",
    "city": "Madrid",
    "state": "Madrid",
    "postal_code": "28001",
    "country": "España",
    "is_default": true
  }
]
```

#### GET `/addresses/:id`

Obtener una dirección por ID.

**Response:** `200 OK`

#### POST `/addresses`

Crear una dirección.

**Body:**

```json
{
  "street": "Calle Principal 123",
  "city": "Madrid",
  "state": "Madrid",
  "postal_code": "28001",
  "country": "España",
  "is_default": false
}
```

**Response:** `201 Created`

#### PUT `/addresses/:id`

Actualizar una dirección.

**Body:** (todos los campos opcionales)

#### DELETE `/addresses/:id`

Eliminar una dirección.

---

### 👥 Usuarios

**Todos los endpoints requieren autenticación (admin only)**

#### GET `/users`

Listar usuarios.

**Query Params:**

- `page`, `limit`
- `role` (opcional): filtrar por rol (admin/customer)

**Response:** `200 OK` (paginated)

#### GET `/users/:id`

Obtener un usuario por ID.

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "customer",
  "phone": "+1234567890",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### PUT `/users/:id`

Actualizar un usuario.

**Body:** (todos los campos opcionales)

```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "role": "admin",
  "is_active": true
}
```

---

### 📊 Reportes

**Todos los endpoints requieren autenticación (admin only)**

#### GET `/reports/sales`

Generar reporte de ventas.

**Query Params:**

- `startDate` (requerido): formato YYYY-MM-DD
- `endDate` (requerido): formato YYYY-MM-DD

**Response:** `200 OK`

```json
[
  {
    "sale_date": "2024-01-01",
    "total_orders": 25,
    "unique_customers": 20,
    "total_revenue": 1250.5,
    "total_items_sold": 45,
    "average_order_value": 50.02
  }
]
```

#### GET `/reports/book-catalog`

Obtener catálogo de libros con estadísticas.

**Response:** `200 OK`

```json
[
  {
    "id": "uuid",
    "title": "Book Title",
    "average_rating": 4.5,
    "total_reviews": 25,
    "total_sold": 150
  }
]
```

#### GET `/reports/order-summary`

Obtener resumen de pedidos.

**Response:** `200 OK`

#### GET `/reports/customer-history`

Obtener historial de compras de clientes.

**Response:** `200 OK`

---

## Códigos de Estado HTTP

- `200 OK`: Solicitud exitosa
- `201 Created`: Recurso creado exitosamente
- `400 Bad Request`: Error en la solicitud (validación)
- `401 Unauthorized`: No autenticado o token inválido
- `403 Forbidden`: No tiene permisos para esta acción
- `404 Not Found`: Recurso no encontrado
- `500 Internal Server Error`: Error del servidor

---

## Ejemplos de Uso

### Flujo completo de compra (Customer)

1. **Registro/Login**

```bash
POST /auth/register
# o
POST /auth/login
```

2. **Agregar direcciones**

```bash
POST /addresses
```

3. **Buscar libros**

```bash
GET /books?search=harry potter
# o
GET /books/search/advanced?category=uuid&minPrice=10&maxPrice=50
```

4. **Agregar al carrito**

```bash
POST /cart
{
  "book_id": "uuid",
  "quantity": 2
}
```

5. **Ver carrito**

```bash
GET /cart
```

6. **Crear pedido**

```bash
POST /orders
{
  "address_id": "uuid"
}
```

7. **Ver mis pedidos**

```bash
GET /orders/my-orders
```

8. **Crear reseña**

```bash
POST /reviews
{
  "book_id": "uuid",
  "rating": 5,
  "comment": "Excelente"
}
```

### Flujo de administración (Admin)

1. **Login como admin**

```bash
POST /auth/login
# (usar credenciales de admin)
```

2. **Crear libro**

```bash
POST /books
{
  "isbn": "1234567890",
  "title": "Nuevo Libro",
  "price": 29.99,
  "stock": 10
}
```

3. **Asignar autores**

```bash
POST /books/:bookId/authors
{
  "author_id": "uuid",
  "is_primary": true
}
```

4. **Ver todos los pedidos**

```bash
GET /orders/admin
```

5. **Actualizar estado de pedido**

```bash
PUT /orders/:orderId/status
{
  "status": "shipped"
}
```

6. **Ver reportes**

```bash
GET /reports/sales?startDate=2024-01-01&endDate=2024-12-31
```

---

## Notas Importantes

1. **Autenticación**: La mayoría de endpoints requieren autenticación. Incluye el token JWT en el header `Authorization: Bearer <token>`.

2. **Paginación**: Los endpoints de listado usan paginación. Siempre incluye `page` y `limit` en los query params.

3. **Validación**: Todos los endpoints validan los datos de entrada. Revisa los mensajes de error para más detalles.

4. **Roles**:
   - `customer`: Solo puede ver/editar sus propios recursos
   - `admin`: Acceso completo a todos los recursos

5. **IDs**: Todos los IDs son UUIDs (formato: `550e8400-e29b-41d4-a716-446655440000`)

6. **Fechas**: Formato ISO 8601 (`YYYY-MM-DD` o `YYYY-MM-DDTHH:mm:ssZ`)

---

## Swagger Documentation

Para documentación interactiva, visita:

```
http://localhost:3000/api/docs
```
