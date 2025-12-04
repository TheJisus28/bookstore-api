-- =====================================================
-- E-commerce Bookstore Database Schema and Data
-- PostgreSQL 16+
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For GIN indexes on btree columns

-- =====================================================
-- DROP TABLES (if they exist) - in reverse dependency order
-- =====================================================

DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS book_authors CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS authors CASCADE;
DROP TABLE IF EXISTS publishers CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- Drop functions and procedures
DROP FUNCTION IF EXISTS calculate_order_total(UUID);
DROP FUNCTION IF EXISTS apply_discount(NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS search_books(TEXT, UUID, NUMERIC, NUMERIC, INTEGER);
DROP FUNCTION IF EXISTS validate_stock(UUID, INTEGER);
DROP FUNCTION IF EXISTS calculate_book_rating(UUID);
DROP FUNCTION IF EXISTS get_bestsellers(INTEGER, DATE, DATE);
DROP PROCEDURE IF EXISTS process_checkout(UUID, UUID, TEXT);
DROP PROCEDURE IF EXISTS update_book_stock(UUID, INTEGER);
DROP PROCEDURE IF EXISTS generate_sales_report(DATE, DATE);
DROP PROCEDURE IF EXISTS process_return(UUID, UUID);

-- Drop triggers
DROP TRIGGER IF EXISTS update_stock_on_order ON order_items;
DROP TRIGGER IF EXISTS update_book_rating ON reviews;
DROP TRIGGER IF EXISTS audit_order_changes ON orders;
DROP TRIGGER IF EXISTS update_user_timestamp ON users;
DROP TRIGGER IF EXISTS update_book_timestamp ON books;
DROP TRIGGER IF EXISTS update_cart_item_timestamp ON cart_items;

-- Drop related functions
DROP FUNCTION IF EXISTS update_stock_on_order();
DROP FUNCTION IF EXISTS update_book_rating();
DROP FUNCTION IF EXISTS audit_order_changes();
DROP FUNCTION IF EXISTS update_user_timestamp();
DROP FUNCTION IF EXISTS update_book_timestamp();
DROP FUNCTION IF EXISTS update_cart_item_timestamp();

-- =====================================================
-- TABLES
-- =====================================================

-- Users table (admin and customers)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'customer')),
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Authors table
CREATE TABLE authors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    bio TEXT,
    birth_date DATE,
    nationality VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Publishers table
CREATE TABLE publishers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories table (hierarchical structure)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Books table
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    isbn VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    pages INTEGER CHECK (pages > 0),
    publication_date DATE,
    language VARCHAR(50) DEFAULT 'Spanish',
    publisher_id UUID REFERENCES publishers(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    cover_image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Book-Authors relationship (many-to-many)
CREATE TABLE book_authors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(book_id, author_id)
);

-- Addresses table
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    address_id UUID NOT NULL REFERENCES addresses(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')),
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    shipping_cost NUMERIC(10, 2) DEFAULT 0 CHECK (shipping_cost >= 0),
    discount_amount NUMERIC(10, 2) DEFAULT 0 CHECK (discount_amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- Order items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cart items table
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, book_id)
);

-- Reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, book_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Books indexes
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_title ON books USING gin(title gin_trgm_ops);
CREATE INDEX idx_books_category ON books(category_id);
CREATE INDEX idx_books_publisher ON books(publisher_id);
CREATE INDEX idx_books_price ON books(price);
CREATE INDEX idx_books_stock ON books(stock);
CREATE INDEX idx_books_active ON books(is_active);
CREATE INDEX idx_books_publication_date ON books(publication_date);
-- Composite index for common filters
CREATE INDEX idx_books_category_price ON books(category_id, price);
CREATE INDEX idx_books_active_stock ON books(is_active, stock);

-- Full text search index on books
CREATE INDEX idx_books_fulltext ON books USING gin(
    to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(description, ''))
);

-- Authors indexes
CREATE INDEX idx_authors_name ON authors USING gin((first_name || ' ' || last_name) gin_trgm_ops);

-- Book authors indexes
CREATE INDEX idx_book_authors_book ON book_authors(book_id);
CREATE INDEX idx_book_authors_author ON book_authors(author_id);

-- Orders indexes
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Order items indexes
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_book ON order_items(book_id);

-- Cart items indexes
CREATE INDEX idx_cart_items_user ON cart_items(user_id);
CREATE INDEX idx_cart_items_book ON cart_items(book_id);

-- Reviews indexes
CREATE INDEX idx_reviews_book ON reviews(book_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_book_rating ON reviews(book_id, rating);

-- Addresses indexes
CREATE INDEX idx_addresses_user ON addresses(user_id);

-- Categories indexes
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to calculate order total
CREATE OR REPLACE FUNCTION calculate_order_total(order_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
    total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(subtotal), 0)
    INTO total
    FROM order_items
    WHERE order_id = order_uuid;
    
    RETURN total;
END;
$$ LANGUAGE plpgsql;

-- Function to apply discount
CREATE OR REPLACE FUNCTION apply_discount(amount NUMERIC, discount_percent NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
    IF discount_percent < 0 OR discount_percent > 100 THEN
        RAISE EXCEPTION 'Discount percentage must be between 0 and 100';
    END IF;
    
    RETURN amount * (1 - discount_percent / 100);
END;
$$ LANGUAGE plpgsql;

-- Function to search books with filters (demonstrates subqueries in FROM)
CREATE OR REPLACE FUNCTION search_books(
    search_term TEXT DEFAULT NULL,
    category_uuid UUID DEFAULT NULL,
    min_price NUMERIC DEFAULT NULL,
    max_price NUMERIC DEFAULT NULL,
    min_rating INTEGER DEFAULT NULL
)
RETURNS TABLE (
    book_id UUID,
    title VARCHAR,
    price NUMERIC,
    stock INTEGER,
    average_rating NUMERIC,
    total_reviews BIGINT,
    publisher_name VARCHAR,
    category_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.title,
        b.price,
        b.stock,
        COALESCE(book_ratings.avg_rating, 0)::NUMERIC(3, 2) as average_rating,
        COALESCE(book_ratings.review_count, 0) as total_reviews,
        p.name as publisher_name,
        c.name as category_name
    FROM books b
    LEFT JOIN publishers p ON b.publisher_id = p.id
    LEFT JOIN categories c ON b.category_id = c.id
    LEFT JOIN (
        -- Subquery in FROM to calculate ratings
        SELECT 
            book_id,
            AVG(rating)::NUMERIC(3, 2) as avg_rating,
            COUNT(*) as review_count
        FROM reviews
        GROUP BY book_id
    ) book_ratings ON b.id = book_ratings.book_id
    WHERE 
        b.is_active = TRUE
        AND (search_term IS NULL OR 
             to_tsvector('spanish', coalesce(b.title, '') || ' ' || coalesce(b.description, '')) 
             @@ plainto_tsquery('spanish', search_term))
        AND (category_uuid IS NULL OR b.category_id = category_uuid)
        AND (min_price IS NULL OR b.price >= min_price)
        AND (max_price IS NULL OR b.price <= max_price)
        AND (min_rating IS NULL OR COALESCE(book_ratings.avg_rating, 0) >= min_rating)
    ORDER BY b.title;
END;
$$ LANGUAGE plpgsql;

-- Function to validate stock availability
CREATE OR REPLACE FUNCTION validate_stock(book_uuid UUID, requested_quantity INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    available_stock INTEGER;
BEGIN
    SELECT stock INTO available_stock
    FROM books
    WHERE id = book_uuid;
    
    IF available_stock IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN available_stock >= requested_quantity;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate book rating
CREATE OR REPLACE FUNCTION calculate_book_rating(book_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
    avg_rating NUMERIC;
BEGIN
    SELECT COALESCE(AVG(rating), 0)::NUMERIC(3, 2)
    INTO avg_rating
    FROM reviews
    WHERE book_id = book_uuid;
    
    RETURN avg_rating;
END;
$$ LANGUAGE plpgsql;

-- Function to get bestsellers (demonstrates complex subqueries)
CREATE OR REPLACE FUNCTION get_bestsellers(
    limit_count INTEGER DEFAULT 10,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    book_id UUID,
    title VARCHAR,
    total_sold BIGINT,
    total_revenue NUMERIC,
    average_rating NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.title,
        COALESCE(sales.total_sold, 0) as total_sold,
        COALESCE(sales.total_revenue, 0)::NUMERIC(10, 2) as total_revenue,
        COALESCE(ratings.avg_rating, 0)::NUMERIC(3, 2) as average_rating
    FROM books b
    LEFT JOIN (
        -- Subquery in FROM for sales aggregation
        SELECT 
            oi.book_id,
            SUM(oi.quantity) as total_sold,
            SUM(oi.subtotal) as total_revenue
        FROM order_items oi
        INNER JOIN orders o ON oi.order_id = o.id
        WHERE 
            o.status IN ('shipped', 'delivered')
            AND (start_date IS NULL OR o.created_at::DATE >= start_date)
            AND (end_date IS NULL OR o.created_at::DATE <= end_date)
        GROUP BY oi.book_id
    ) sales ON b.id = sales.book_id
    LEFT JOIN (
        -- Another subquery in FROM for ratings
        SELECT 
            book_id,
            AVG(rating)::NUMERIC(3, 2) as avg_rating
        FROM reviews
        GROUP BY book_id
    ) ratings ON b.id = ratings.book_id
    WHERE sales.total_sold > 0 OR ratings.avg_rating > 0
    ORDER BY sales.total_sold DESC, ratings.avg_rating DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STORED PROCEDURES
-- =====================================================

-- Procedure to process checkout (create order from cart)
CREATE OR REPLACE PROCEDURE process_checkout(
    user_uuid UUID,
    address_uuid UUID,
    discount_code TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    new_order_id UUID;
    cart_total NUMERIC;
    calculated_discount NUMERIC := 0;
    calculated_shipping_cost NUMERIC := 5.00; -- Fixed shipping cost
    cart_item RECORD;
BEGIN
    -- Calculate cart total
    SELECT COALESCE(SUM(ci.quantity * b.price), 0)
    INTO cart_total
    FROM cart_items ci
    INNER JOIN books b ON ci.book_id = b.id
    WHERE ci.user_id = user_uuid;
    
    IF cart_total = 0 THEN
        RAISE EXCEPTION 'Cart is empty';
    END IF;
    
    -- Apply discount if code provided (simplified - in real app would check discount table)
    IF discount_code IS NOT NULL THEN
        calculated_discount := cart_total * 0.10; -- 10% discount example
    END IF;
    
    -- Create order
    INSERT INTO orders (user_id, address_id, total_amount, shipping_cost, discount_amount, status)
    VALUES (user_uuid, address_uuid, cart_total - calculated_discount + calculated_shipping_cost, calculated_shipping_cost, calculated_discount, 'pending')
    RETURNING id INTO new_order_id;
    
    -- Create order items and update stock
    FOR cart_item IN 
        SELECT ci.book_id, ci.quantity, b.price
        FROM cart_items ci
        INNER JOIN books b ON ci.book_id = b.id
        WHERE ci.user_id = user_uuid
    LOOP
        -- Validate stock
        IF NOT validate_stock(cart_item.book_id, cart_item.quantity) THEN
            RAISE EXCEPTION 'Insufficient stock for book %', cart_item.book_id;
        END IF;
        
        -- Insert order item
        INSERT INTO order_items (order_id, book_id, quantity, unit_price, subtotal)
        VALUES (new_order_id, cart_item.book_id, cart_item.quantity, cart_item.price, cart_item.quantity * cart_item.price);
        
        -- Update stock
        UPDATE books
        SET stock = stock - cart_item.quantity
        WHERE id = cart_item.book_id;
    END LOOP;
    
    -- Clear cart
    DELETE FROM cart_items WHERE user_id = user_uuid;
    
    -- Update order total (Recalculate total amount from order items)
    UPDATE orders
    SET total_amount = calculate_order_total(new_order_id) - calculated_discount + calculated_shipping_cost
    WHERE id = new_order_id;
    
    COMMIT;
END;
$$;

-- Procedure to update book stock
CREATE OR REPLACE PROCEDURE update_book_stock(
    book_uuid UUID,
    quantity_change INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    current_stock INTEGER;
BEGIN
    SELECT stock INTO current_stock
    FROM books
    WHERE id = book_uuid;
    
    IF current_stock IS NULL THEN
        RAISE EXCEPTION 'Book not found';
    END IF;
    
    IF current_stock + quantity_change < 0 THEN
        RAISE EXCEPTION 'Insufficient stock. Current stock: %', current_stock;
    END IF;
    
    UPDATE books
    SET stock = stock + quantity_change,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = book_uuid;
END;
$$;

-- Procedure to generate sales report (demonstrates complex aggregations)
CREATE OR REPLACE PROCEDURE generate_sales_report(
    start_date DATE,
    end_date DATE
)
LANGUAGE plpgsql
AS $$
DECLARE
    report_record RECORD;
BEGIN
    -- This procedure demonstrates complex queries with subqueries in FROM
    FOR report_record IN
        SELECT 
            DATE_TRUNC('day', o.created_at)::DATE as sale_date,
            COUNT(DISTINCT o.id) as total_orders,
            COUNT(DISTINCT o.user_id) as unique_customers,
            SUM(oi.subtotal) as total_revenue,
            SUM(oi.quantity) as total_items_sold,
            AVG(order_totals.order_total) as average_order_value
        FROM orders o
        INNER JOIN order_items oi ON o.id = oi.order_id
        INNER JOIN (
            -- Subquery in FROM to calculate order totals
            SELECT 
                order_id,
                SUM(subtotal) as order_total
            FROM order_items
            GROUP BY order_id
        ) order_totals ON o.id = order_totals.order_id
        WHERE 
            o.status IN ('shipped', 'delivered')
            AND o.created_at::DATE BETWEEN start_date AND end_date
        GROUP BY DATE_TRUNC('day', o.created_at)::DATE
        ORDER BY sale_date
    LOOP
        -- In a real application, you would insert into a reports table or return results
        RAISE NOTICE 'Date: %, Orders: %, Customers: %, Revenue: %, Items: %, Avg Order: %',
            report_record.sale_date,
            report_record.total_orders,
            report_record.unique_customers,
            report_record.total_revenue,
            report_record.total_items_sold,
            report_record.average_order_value;
    END LOOP;
END;
$$;

-- Procedure to process return
CREATE OR REPLACE PROCEDURE process_return(
    order_uuid UUID,
    book_uuid UUID
)
LANGUAGE plpgsql
AS $$
DECLARE
    order_item RECORD;
BEGIN
    -- Get order item
    SELECT * INTO order_item
    FROM order_items
    WHERE order_id = order_uuid AND book_id = book_uuid;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order item not found';
    END IF;
    
    -- Restore stock
    CALL update_book_stock(book_uuid, order_item.quantity);
    
    -- Update order status if all items returned (simplified check)
    UPDATE orders
    SET status = 'returned',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = order_uuid
    AND NOT EXISTS (
        SELECT 1 
        FROM order_items oi
        WHERE oi.order_id = order_uuid
        AND oi.id != order_item.id
    );
END;
$$;

-- =====================================================
-- TRIGGERS & TRIGGER FUNCTIONS
-- =====================================================

-- Trigger to update stock when order item is created
CREATE OR REPLACE FUNCTION update_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Stock is already updated in the checkout procedure, this is for direct inserts
    UPDATE books
    SET stock = stock - NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.book_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stock_on_order
    AFTER INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_order();

-- Trigger to update book rating when review is added/updated
CREATE OR REPLACE FUNCTION update_book_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Dummy trigger function to demonstrate the trigger
    -- The actual calculation is done in functions/views
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_book_rating
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_book_rating();

-- Trigger for order audit (updates updated_at)
CREATE OR REPLACE FUNCTION audit_order_changes()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_order_changes
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION audit_order_changes();

-- Trigger for user updated_at
CREATE OR REPLACE FUNCTION update_user_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_timestamp();

-- Trigger for book updated_at
CREATE OR REPLACE FUNCTION update_book_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_book_timestamp
    BEFORE UPDATE ON books
    FOR EACH ROW
    EXECUTE FUNCTION update_book_timestamp();

-- Trigger for cart_item updated_at
CREATE OR REPLACE FUNCTION update_cart_item_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cart_item_timestamp
    BEFORE UPDATE ON cart_items
    FOR EACH ROW
    EXECUTE FUNCTION update_cart_item_timestamp();

-- =====================================================
-- VIEWS (with subqueries in FROM)
-- =====================================================

-- View for book catalog with ratings and sales
CREATE OR REPLACE VIEW book_catalog AS
SELECT 
    b.id,
    b.isbn,
    b.title,
    b.description,
    b.price,
    b.stock,
    b.pages,
    b.publication_date,
    b.language,
    b.cover_image_url,
    p.name as publisher_name,
    c.name as category_name,
    COALESCE(book_stats.average_rating, 0)::NUMERIC(3, 2) as average_rating,
    COALESCE(book_stats.total_reviews, 0) as total_reviews,
    COALESCE(sales_stats.total_sold, 0) as total_sold
FROM books b
LEFT JOIN publishers p ON b.publisher_id = p.id
LEFT JOIN categories c ON b.category_id = c.id
LEFT JOIN (
    -- Subquery in FROM for book statistics
    SELECT 
        r.book_id,
        AVG(r.rating)::NUMERIC(3, 2) as average_rating,
        COUNT(*) as total_reviews
    FROM reviews r
    GROUP BY r.book_id
) book_stats ON b.id = book_stats.book_id
LEFT JOIN (
    -- Another subquery in FROM for sales statistics
    SELECT 
        oi.book_id,
        SUM(oi.quantity) as total_sold
    FROM order_items oi
    INNER JOIN orders o ON oi.order_id = o.id
    WHERE o.status IN ('shipped', 'delivered')
    GROUP BY oi.book_id
) sales_stats ON b.id = sales_stats.book_id
WHERE b.is_active = TRUE;

-- View for order summary with customer info
CREATE OR REPLACE VIEW order_summary AS
SELECT 
    o.id as order_id,
    o.status,
    o.total_amount,
    o.shipping_cost,
    o.discount_amount,
    o.created_at,
    o.shipped_at,
    o.delivered_at,
    u.id as user_id,
    u.email,
    u.first_name || ' ' || u.last_name as customer_name,
    a.street || ', ' || a.city || ', ' || a.country as shipping_address,
    order_stats.total_items,
    order_stats.total_books
FROM orders o
INNER JOIN users u ON o.user_id = u.id
INNER JOIN addresses a ON o.address_id = a.id
INNER JOIN (
    -- Subquery in FROM for order statistics
    SELECT 
        order_id,
        SUM(quantity) as total_items,
        COUNT(DISTINCT book_id) as total_books
    FROM order_items
    GROUP BY order_id
) order_stats ON o.id = order_stats.order_id;

-- View for customer purchase history
CREATE OR REPLACE VIEW customer_purchase_history AS
SELECT 
    u.id as user_id,
    u.email,
    u.first_name || ' ' || u.last_name as customer_name,
    customer_stats.total_orders,
    customer_stats.total_spent,
    customer_stats.average_order_value,
    customer_stats.favorite_category
FROM users u
INNER JOIN (
    -- Subquery in FROM for customer statistics
    SELECT 
        o.user_id,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.total_amount) as total_spent,
        AVG(o.total_amount) as average_order_value,
        (
            SELECT c.name
            FROM order_items oi2
            INNER JOIN books b2 ON oi2.book_id = b2.id
            INNER JOIN categories c ON b2.category_id = c.id
            INNER JOIN orders o2 ON oi2.order_id = o2.id
            WHERE o2.user_id = o.user_id
            GROUP BY c.name
            ORDER BY SUM(oi2.quantity) DESC
            LIMIT 1
        ) as favorite_category
    FROM orders o
    WHERE o.status IN ('shipped', 'delivered')
    GROUP BY o.user_id
) customer_stats ON u.id = customer_stats.user_id
WHERE u.role = 'customer';

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- UUIDs Fijos para Referencia
-- Nota: En un entorno real, usarías variables o confiarías en la función uuid_generate_v4()
-- Se usan aquí para mantener la coherencia de las referencias.

-- USUARIOS (Necesario para Addresses y Reviews)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, phone) 
VALUES 
('90e8c7b6-1a2d-4f3e-8c7a-6b5d4e3c2a1b', 'cliente@prueba.com', '$2a$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 'Cliente', 'Prueba', 'customer', '+34 600 123 456'),
('90e8c7b6-1a2d-4f3e-8c7a-6b5d4e3c2a1c', 'admin@libreria.com', '$2a$10$YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY', 'Admin', 'User', 'admin', '+34 600 654 321'),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'maria.garcia@email.com', '$2a$10$ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ', 'María', 'García', 'customer', '+34 611 222 333'),
('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'juan.lopez@email.com', '$2a$10$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'Juan', 'López', 'customer', '+34 622 333 444'),
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'ana.martinez@email.com', '$2a$10$BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', 'Ana', 'Martínez', 'customer', '+34 633 444 555');


-- CATEGORIAS (Primero las principales, luego las subcategorías)
INSERT INTO categories (id, name, description, parent_id) VALUES
-- Categorías principales
('50f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0d', 'Ficción', 'Novelas y obras de ficción', NULL),
('60f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0e', 'No Ficción', 'Libros informativos y educativos', NULL),
('70f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0f', 'Ciencia', 'Libros de ciencia y tecnología', NULL),
('80f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1a', 'Historia', 'Libros históricos', NULL),
('90f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1b', 'Biografía', 'Biografías y autobiografías', NULL),
('a0f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c10', 'Filosofía', 'Libros de filosofía y pensamiento', NULL),
('b0f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1d', 'Arte', 'Libros sobre arte, diseño y cultura visual', NULL),
('c0f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1e', 'Cocina', 'Libros de recetas y gastronomía', NULL),
('d0f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1f', 'Deportes', 'Libros sobre deportes y fitness', NULL),
('e0f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c2a', 'Infantil', 'Libros para niños y jóvenes', NULL),
-- Subcategorías de Ficción
('0f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c10', 'Ciencia Ficción', 'Género de ficción especulativa', '50f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0d'),
('1f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c10', 'Fantasía', 'Libros de fantasía y magia', '50f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0d'),
('2f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c10', 'Misterio', 'Novelas de misterio y suspense', '50f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0d'),
('3f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c10', 'Romance', 'Novelas románticas', '50f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0d'),
('4f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c20', 'Literatura Contemporánea', 'Literatura moderna y contemporánea', '50f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0d'),
-- Subcategorías de No Ficción
('5f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c20', 'Autoayuda', 'Libros para el desarrollo personal', '60f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0e'),
('6f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c20', 'Negocios', 'Libros sobre negocios y emprendimiento', '60f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0e'),
('7f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c20', 'Educación', 'Libros educativos y de aprendizaje', '60f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0e');

-- EDITORIALES
INSERT INTO publishers (id, name, city, country, email, website) VALUES
('a1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0d', 'Editorial Planeta', 'Barcelona', 'España', 'info@planeta.es', 'https://www.planeta.es'),
('b1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0e', 'Penguin Random House', 'Madrid', 'España', 'info@penguinrandomhouse.es', 'https://www.penguinrandomhouse.es'),
('c1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0f', 'Editorial Anagrama', 'Barcelona', 'España', 'info@anagrama-ed.es', 'https://www.anagrama-ed.es'),
('d1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1a', 'Salamandra', 'Barcelona', 'España', 'info@salamandra.es', 'https://www.salamandra.es'),
('e1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1b', 'Vintage Español', 'Nueva York', 'EEUU', 'info@vintage.com', 'https://www.vintage.com'),
('f1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1c', 'Tusquets Editores', 'Barcelona', 'España', 'info@tusquets.es', 'https://www.tusquetseditores.com'),
('a2f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1d', 'Alfaguara', 'Madrid', 'España', 'info@alfaguara.es', 'https://www.alfaguara.es'),
('b2f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1e', 'Seix Barral', 'Barcelona', 'España', 'info@seix-barral.es', 'https://www.seix-barral.es'),
('c2f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1f', 'Debate', 'Barcelona', 'España', 'info@debate.com', 'https://www.debate.com'),
('d2f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c2a', 'Paidós', 'Barcelona', 'España', 'info@paidos.com', 'https://www.paidos.com');

-- AUTORES
INSERT INTO authors (id, first_name, last_name, bio, birth_date, nationality) VALUES
('6a4b13e0-0c4d-48a1-94e8-23d20f18c8e1', 'Gabriel', 'García Márquez', 'Escritor, periodista y guionista colombiano. Premio Nobel de Literatura en 1982.', '1927-03-06', 'Colombiana'),
('8c3a1f7d-5e2b-40d3-9f8c-6d9e0b12a3f0', 'Isabel', 'Allende', 'Escritora chilena, considerada la novelista más leída en lengua española.', '1942-08-02', 'Chilena'),
('4e2b0d9f-3c8a-4f6e-8d7b-9a1b2c3d4e5f', 'Carl', 'Sagan', 'Astrónomo, astrofísico y divulgador científico estadounidense.', '1934-11-09', 'Estadounidense'),
('b0f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c10', 'Rosa', 'Montero', 'Periodista y escritora española, conocida por sus novelas y artículos periodísticos.', '1951-01-03', 'Española'),
('c1e0f3a2-b4c5-d6e7-f8a9-b0c1d2e3f4a5', 'Yuval Noah', 'Harari', 'Historiador y filósofo israelí, profesor en la Universidad Hebrea de Jerusalén.', '1976-02-24', 'Israelí'),
('d2e3f4a5-b5c6-d7e8-f9a0-b1c2d3e4f5a6', 'Mario', 'Vargas Llosa', 'Escritor peruano, Premio Nobel de Literatura en 2010.', '1936-03-28', 'Peruana'),
('e3f4a5b6-c6d7-e8f9-a0b1-c2d3e4f5a6b7', 'Jorge Luis', 'Borges', 'Escritor argentino, uno de los autores más destacados de la literatura del siglo XX.', '1899-08-24', 'Argentina'),
('f4a5b6c7-d7e8-f9a0-b1c2-d3e4f5a6b7c8', 'Julio', 'Cortázar', 'Escritor argentino, considerado uno de los autores más innovadores de su tiempo.', '1914-08-26', 'Argentina'),
('a5b6c7d8-e8f9-a0b1-c2d3-e4f5a6b7c8d9', 'Pablo', 'Neruda', 'Poeta chileno, Premio Nobel de Literatura en 1971.', '1904-07-12', 'Chilena'),
('b6c7d8e9-f9a0-b1c2-d3e4-f5a6b7c8d9e0', 'Octavio', 'Paz', 'Poeta y ensayista mexicano, Premio Nobel de Literatura en 1990.', '1914-03-31', 'Mexicana'),
('c7d8e9f0-a0b1-c2d3-e4f5-a6b7c8d9e0f1', 'Stephen', 'Hawking', 'Físico teórico, cosmólogo y divulgador científico británico.', '1942-01-08', 'Británica'),
('d8e9f0a1-b1c2-d3e4-f5a6-b7c8d9e0f1a2', 'Bill', 'Bryson', 'Escritor estadounidense de libros de viajes y divulgación científica.', '1951-12-08', 'Estadounidense'),
('e9f0a1b2-c2d3-e4f5-a6b7-c8d9e0f1a2b3', 'Michel', 'Foucault', 'Filósofo, historiador y teórico social francés.', '1926-10-15', 'Francesa'),
('f0a1b2c3-d3e4-f5a6-b7c8-d9e0f1a2b3c4', 'Umberto', 'Eco', 'Escritor, filósofo y semiólogo italiano.', '1932-01-05', 'Italiana'),
('a1b2c3d4-e4f5-a6b7-c8d9-e0f1a2b3c4d5', 'J.K.', 'Rowling', 'Escritora británica, creadora de la serie de libros Harry Potter.', '1965-07-31', 'Británica'),
('b2c3d4e5-f5a6-b7c8-d9e0-f1a2b3c4d5e6', 'George R.R.', 'Martin', 'Escritor estadounidense, conocido por la serie Canción de hielo y fuego.', '1948-09-20', 'Estadounidense'),
('c3d4e5f6-a6b7-c8d9-e0f1-a2b3c4d5e6f7', 'Haruki', 'Murakami', 'Escritor japonés, uno de los autores más importantes de la literatura contemporánea.', '1949-01-12', 'Japonesa'),
('d4e5f6a7-b7c8-d9e0-f1a2-b3c4d5e6f7a8', 'Elena', 'Ferrante', 'Seudónimo de una escritora italiana, autora de la tetralogía napolitana.', '1943-04-05', 'Italiana'),
('e5f6a7b8-c8d9-e0f1-a2b3-c4d5e6f7a8b9', 'Zadie', 'Smith', 'Escritora británica de origen jamaicano, conocida por sus novelas sobre identidad y cultura.', '1975-10-25', 'Británica'),
('f6a7b8c9-d9e0-f1a2-b3c4-d5e6f7a8b9c0', 'Chimamanda Ngozi', 'Adichie', 'Escritora nigeriana, conocida por sus novelas sobre la experiencia africana.', '1977-09-15', 'Nigeriana'),
('a7b8c9d0-e0f1-a2b3-c4d5-e6f7a8b9c0d1', 'Frank', 'Herbert', 'Escritor estadounidense de ciencia ficción, autor de la serie Dune.', '1920-10-08', 'Estadounidense'),
('b8c9d0e1-f1a2-b3c4-d5e6-f7a8b9c0d1e2', 'George', 'Orwell', 'Escritor y periodista británico, conocido por sus obras distópicas.', '1903-06-25', 'Británica'),
('c9d0e1f2-a2b3-c4d5-e6f7-a8b9c0d1e2f3', 'Aldous', 'Huxley', 'Escritor británico, conocido por sus novelas de ciencia ficción y ensayos.', '1894-07-26', 'Británica'),
('d0e1f2a3-b3c4-d5e6-f7a8-b9c0d1e2f3a4', 'J.R.R.', 'Tolkien', 'Escritor, poeta y filólogo británico, autor de El señor de los anillos.', '1892-01-03', 'Británica'),
('e1f2a3b4-c4d5-e6f7-a8b9-c0d1e2f3a4b5', 'Eckhart', 'Tolle', 'Escritor y maestro espiritual alemán, autor de El poder del ahora.', '1948-02-16', 'Alemana'),
('f2a3b4c5-d5e6-f7a8-b9c0-d1e2f3a4b5c6', 'Stephen', 'Covey', 'Escritor estadounidense, autor de Los 7 hábitos de la gente altamente efectiva.', '1932-10-24', 'Estadounidense'),
('a3b4c5d6-e6f7-a8b9-c0d1-e2f3a4b5c6d7', 'Robert', 'Kiyosaki', 'Empresario y escritor estadounidense, autor de Padre rico, padre pobre.', '1947-04-08', 'Estadounidense');

-- LIBROS (Asegurando que todas las categorías y editoriales existan usando UUIDs directos)
INSERT INTO books (id, isbn, title, description, price, stock, pages, publication_date, language, publisher_id, category_id, cover_image_url) VALUES
-- Literatura Latinoamericana
('1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', '978-8420484725', 'Cien años de soledad', 'La obra maestra de Gabriel García Márquez que narra la historia de la familia Buendía a lo largo de siete generaciones en el mítico pueblo de Macondo.', 19.99, 150, 496, '1967-05-30', 'Spanish', 'a1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0d', '50f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0d', 'http://example.com/cover1.jpg'),
('2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', '978-8499081514', 'La casa de los espíritus', 'Novela debut de Isabel Allende que cuenta la historia de tres generaciones de mujeres en Chile.', 15.50, 80, 432, '1982-01-01', 'Spanish', 'a1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0d', '50f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0d', 'http://example.com/cover2.jpg'),
('3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f', '978-8420412146', 'El amor en los tiempos del cólera', 'Historia de amor que se desarrolla a lo largo de más de cincuenta años.', 18.50, 120, 464, '1985-01-01', 'Spanish', 'a1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0d', '50f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0d', 'http://example.com/cover3.jpg'),
('4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a', '978-8420412147', 'La ciudad y los perros', 'Primera novela de Mario Vargas Llosa, ambientada en un colegio militar de Lima.', 16.99, 90, 320, '1963-01-01', 'Spanish', 'a2f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1d', '50f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0d', 'http://example.com/cover4.jpg'),
('5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b', '978-8420412148', 'Ficciones', 'Colección de cuentos de Jorge Luis Borges, considerada una de las obras maestras de la literatura universal.', 14.99, 110, 192, '1944-01-01', 'Spanish', 'c1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0f', '50f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0d', 'http://example.com/cover5.jpg'),
('6f7a8b9c-0d1e-2f3a-4b5c-6d7e8f9a0b1c', '978-8420412149', 'Rayuela', 'Novela experimental de Julio Cortázar que puede leerse de múltiples formas.', 17.50, 95, 736, '1963-01-01', 'Spanish', 'c1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0f', '4f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c20', 'http://example.com/cover6.jpg'),
-- Ciencia y Divulgación
('7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d', '978-0345331359', 'Cosmos', 'Un viaje a través del espacio y el tiempo con Carl Sagan.', 25.99, 200, 365, '1980-10-01', 'English', 'b1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0e', '70f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0f', 'http://example.com/cover7.jpg'),
('8b9c0d1e-2f3a-4b5c-6d7e-8f9a0b1c2d3e', '978-0345331360', 'Breve historia del tiempo', 'Del Big Bang a los agujeros negros por Stephen Hawking.', 22.50, 180, 256, '1988-01-01', 'English', 'b1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0e', '70f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0f', 'http://example.com/cover8.jpg'),
('9c0d1e2f-3a4b-5c6d-7e8f-9a0b1c2d3e4f', '978-0345331361', 'Una breve historia de casi todo', 'Divulgación científica accesible de Bill Bryson.', 24.99, 160, 544, '2003-01-01', 'English', 'b1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0e', '70f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0f', 'http://example.com/cover9.jpg'),
-- Historia
('0d1e2f3a-4b5c-6d7e-8f9a-b1c2d3e4f5a6', '978-6073155381', 'Sapiens: De animales a dioses', 'Una breve historia de la humanidad por Yuval Noah Harari.', 22.99, 120, 498, '2014-09-01', 'Spanish', 'e1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1b', '80f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1a', 'http://example.com/cover10.jpg'),
('1e2f3a4b-5c6d-7e8f-9a0b-1c2d3e4f5a6b', '978-6073155382', 'Homo Deus: Breve historia del mañana', 'Continuación de Sapiens sobre el futuro de la humanidad.', 23.50, 100, 496, '2016-01-01', 'Spanish', 'e1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1b', '80f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1a', 'http://example.com/cover11.jpg'),
-- Biografías
('2f3a4b5c-6d7e-8f9a-0b1c-2d3e4f5a6b7c', '978-8432235948', 'La ridícula idea de no volver a verte', 'Un homenaje a Marie Curie por Rosa Montero.', 17.00, 95, 208, '2013-05-01', 'Spanish', 'd1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1a', '90f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1b', 'http://example.com/cover12.jpg'),
-- Ciencia Ficción
('3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d', '978-8498381491', 'Dune', 'Épica de ciencia ficción de Frank Herbert sobre el planeta desértico Arrakis.', 26.99, 140, 688, '1965-01-01', 'Spanish', 'a1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0d', '0f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c10', 'http://example.com/cover13.jpg'),
('4b5c6d7e-8f9a-0b1c-2d3e-4f5a6b7c8d9e', '978-8498381492', '1984', 'Distopía clásica de George Orwell sobre un futuro totalitario.', 15.99, 200, 352, '1949-06-08', 'Spanish', 'b1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0e', '0f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c10', 'http://example.com/cover14.jpg'),
('5c6d7e8f-9a0b-1c2d-3e4f-5a6b7c8d9e0f', '978-8498381493', 'Un mundo feliz', 'Distopía de Aldous Huxley sobre una sociedad futura controlada.', 16.50, 175, 288, '1932-01-01', 'Spanish', 'b1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0e', '0f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c10', 'http://example.com/cover15.jpg'),
-- Fantasía
('6d7e8f9a-0b1c-2d3e-4f5a-6b7c8d9e0f1a', '978-8498381494', 'El señor de los anillos', 'Trilogía épica de fantasía de J.R.R. Tolkien.', 29.99, 250, 1216, '1954-07-29', 'Spanish', 'a1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0d', '1f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c10', 'http://example.com/cover16.jpg'),
('7e8f9a0b-1c2d-3e4f-5a6b-7c8d9e0f1a2b', '978-8498381495', 'Harry Potter y la piedra filosofal', 'Primer libro de la serie de J.K. Rowling.', 19.99, 300, 320, '1997-06-26', 'Spanish', 'd1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1a', '1f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c10', 'http://example.com/cover17.jpg'),
('8f9a0b1c-2d3e-4f5a-6b7c-8d9e0f1a2b3c', '978-8498381496', 'Juego de tronos', 'Primer libro de Canción de hielo y fuego de George R.R. Martin.', 24.99, 180, 832, '1996-08-01', 'Spanish', 'a1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0d', '1f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c10', 'http://example.com/cover18.jpg'),
-- Literatura Contemporánea
('9a0b1c2d-3e4f-5a6b-7c8d-9e0f1a2b3c4d', '978-8498381497', 'Tokio Blues', 'Novela de Haruki Murakami sobre la nostalgia y la pérdida.', 18.50, 130, 384, '1987-01-01', 'Spanish', 'c1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0f', '4f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c20', 'http://example.com/cover19.jpg'),
('0b1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e', '978-8498381498', 'La amiga estupenda', 'Primer libro de la tetralogía napolitana de Elena Ferrante.', 20.99, 110, 480, '2011-01-01', 'Spanish', 'c1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0f', '4f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c20', 'http://example.com/cover20.jpg'),
('1c2d3e4f-5a6b-7c8d-9e0f-1a2b3c4d5e6f', '978-8498381499', 'Dientes blancos', 'Novela debut de Zadie Smith sobre identidad y multiculturalismo.', 17.99, 95, 544, '2000-01-01', 'Spanish', 'a2f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1d', '4f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c20', 'http://example.com/cover21.jpg'),
('2d3e4f5a-6b7c-8d9e-0f1a-2b3c4d5e6f7a', '978-8498381500', 'Americanah', 'Novela de Chimamanda Ngozi Adichie sobre inmigración e identidad.', 19.50, 105, 608, '2013-01-01', 'Spanish', 'a2f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1d', '4f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c20', 'http://example.com/cover22.jpg'),
-- Misterio
('3e4f5a6b-7c8d-9e0f-1a2b-3c4d5e6f7a8b', '978-8498381501', 'El nombre de la rosa', 'Novela histórica de misterio de Umberto Eco.', 21.99, 125, 672, '1980-01-01', 'Spanish', 'c1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0f', '2f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c10', 'http://example.com/cover23.jpg'),
-- Filosofía
('4f5a6b7c-8d9e-0f1a-2b3c-4d5e6f7a8b9c', '978-8498381502', 'Vigilar y castigar', 'Obra de Michel Foucault sobre el sistema penitenciario.', 18.99, 85, 352, '1975-01-01', 'Spanish', 'c2f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1f', 'a0f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c10', 'http://example.com/cover24.jpg'),
-- Autoayuda
('5a6b7c8d-9e0f-1a2b-3c4d-5e6f7a8b9c0d', '978-8498381503', 'El poder del ahora', 'Guía espiritual de Eckhart Tolle sobre el presente.', 16.99, 200, 256, '1997-01-01', 'Spanish', 'd2f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c2a', '5f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c20', 'http://example.com/cover25.jpg'),
('6b7c8d9e-0f1a-2b3c-4d5e-6f7a8b9c0d1e', '978-8498381504', 'Los 7 hábitos de la gente altamente efectiva', 'Clásico de desarrollo personal de Stephen Covey.', 19.99, 180, 432, '1989-01-01', 'Spanish', 'd2f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c2a', '5f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c20', 'http://example.com/cover26.jpg'),
-- Negocios
('7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f', '978-8498381505', 'Padre rico, padre pobre', 'Libro sobre educación financiera de Robert Kiyosaki.', 17.50, 160, 336, '1997-01-01', 'Spanish', 'c2f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1f', '6f7e8a30-2d1c-4b5a-8c9d-4e6f3a2b1c20', 'http://example.com/cover27.jpg'),
-- Poesía
('8d9e0f1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a', '978-8498381506', 'Veinte poemas de amor y una canción desesperada', 'Obra poética de Pablo Neruda.', 12.99, 140, 96, '1924-01-01', 'Spanish', 'a1f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0d', '50f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c0d', 'http://example.com/cover28.jpg'),
('9e0f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b', '978-8498381507', 'El laberinto de la soledad', 'Ensayo de Octavio Paz sobre la identidad mexicana.', 15.50, 100, 208, '1950-01-01', 'Spanish', 'a2f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c1d', 'a0f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c10', 'http://example.com/cover29.jpg');

-- RELACION LIBRO-AUTOR (usando UUIDs directos para evitar problemas con SELECT)
INSERT INTO book_authors (book_id, author_id, is_primary) VALUES
('1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', '6a4b13e0-0c4d-48a1-94e8-23d20f18c8e1', TRUE),
('2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', '8c3a1f7d-5e2b-40d3-9f8c-6d9e0b12a3f0', TRUE),
('3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f', '6a4b13e0-0c4d-48a1-94e8-23d20f18c8e1', TRUE),
('4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a', 'd2e3f4a5-b5c6-d7e8-f9a0-b1c2d3e4f5a6', TRUE),
('5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b', 'e3f4a5b6-c6d7-e8f9-a0b1-c2d3e4f5a6b7', TRUE),
('6f7a8b9c-0d1e-2f3a-4b5c-6d7e8f9a0b1c', 'f4a5b6c7-d7e8-f9a0-b1c2-d3e4f5a6b7c8', TRUE),
('7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d', '4e2b0d9f-3c8a-4f6e-8d7b-9a1b2c3d4e5f', TRUE),
('8b9c0d1e-2f3a-4b5c-6d7e-8f9a0b1c2d3e', 'c7d8e9f0-a0b1-c2d3-e4f5-a6b7c8d9e0f1', TRUE),
('9c0d1e2f-3a4b-5c6d-7e8f-9a0b1c2d3e4f', 'd8e9f0a1-b1c2-d3e4-f5a6-b7c8d9e0f1a2', TRUE),
('0d1e2f3a-4b5c-6d7e-8f9a-b1c2d3e4f5a6', 'c1e0f3a2-b4c5-d6e7-f8a9-b0c1d2e3f4a5', TRUE),
('1e2f3a4b-5c6d-7e8f-9a0b-1c2d3e4f5a6b', 'c1e0f3a2-b4c5-d6e7-f8a9-b0c1d2e3f4a5', TRUE),
('2f3a4b5c-6d7e-8f9a-0b1c-2d3e4f5a6b7c', 'b0f7e8a3-2d1c-4b5a-8c9d-4e6f3a2b1c10', TRUE),
('3a4b5c6d-7e8f-9a0b-1c2d-3e4f5a6b7c8d', 'a7b8c9d0-e0f1-a2b3-c4d5-e6f7a8b9c0d1', TRUE),
('4b5c6d7e-8f9a-0b1c-2d3e-4f5a6b7c8d9e', 'b8c9d0e1-f1a2-b3c4-d5e6-f7a8b9c0d1e2', TRUE),
('5c6d7e8f-9a0b-1c2d-3e4f-5a6b7c8d9e0f', 'c9d0e1f2-a2b3-c4d5-e6f7-a8b9c0d1e2f3', TRUE),
('6d7e8f9a-0b1c-2d3e-4f5a-6b7c8d9e0f1a', 'd0e1f2a3-b3c4-d5e6-f7a8-b9c0d1e2f3a4', TRUE),
('7e8f9a0b-1c2d-3e4f-5a6b-7c8d9e0f1a2b', 'a1b2c3d4-e4f5-a6b7-c8d9-e0f1a2b3c4d5', TRUE),
('8f9a0b1c-2d3e-4f5a-6b7c-8d9e0f1a2b3c', 'b2c3d4e5-f5a6-b7c8-d9e0-f1a2b3c4d5e6', TRUE),
('9a0b1c2d-3e4f-5a6b-7c8d-9e0f1a2b3c4d', 'c3d4e5f6-a6b7-c8d9-e0f1-a2b3c4d5e6f7', TRUE),
('0b1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e', 'd4e5f6a7-b7c8-d9e0-f1a2-b3c4d5e6f7a8', TRUE),
('1c2d3e4f-5a6b-7c8d-9e0f-1a2b3c4d5e6f', 'e5f6a7b8-c8d9-e0f1-a2b3-c4d5e6f7a8b9', TRUE),
('2d3e4f5a-6b7c-8d9e-0f1a-2b3c4d5e6f7a', 'f6a7b8c9-d9e0-f1a2-b3c4-d5e6f7a8b9c0', TRUE),
('3e4f5a6b-7c8d-9e0f-1a2b-3c4d5e6f7a8b', 'f0a1b2c3-d3e4-f5a6-b7c8-d9e0f1a2b3c4', TRUE),
('4f5a6b7c-8d9e-0f1a-2b3c-4d5e6f7a8b9c', 'e9f0a1b2-c2d3-e4f5-a6b7-c8d9e0f1a2b3', TRUE),
('5a6b7c8d-9e0f-1a2b-3c4d-5e6f7a8b9c0d', 'e1f2a3b4-c4d5-e6f7-a8b9-c0d1e2f3a4b5', TRUE),
('6b7c8d9e-0f1a-2b3c-4d5e-6f7a8b9c0d1e', 'f2a3b4c5-d5e6-f7a8-b9c0-d1e2f3a4b5c6', TRUE),
('7c8d9e0f-1a2b-3c4d-5e6f-7a8b9c0d1e2f', 'a3b4c5d6-e6f7-a8b9-c0d1-e2f3a4b5c6d7', TRUE),
('8d9e0f1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a', 'a5b6c7d8-e8f9-a0b1-c2d3-e4f5a6b7c8d9', TRUE),
('9e0f1a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b', 'b6c7d8e9-f9a0-b1c2-d3e4-f5a6b7c8d9e0', TRUE);

-- DIRECCIONES
INSERT INTO addresses (id, user_id, street, city, state, postal_code, country, is_default) VALUES
('d1a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', '90e8c7b6-1a2d-4f3e-8c7a-6b5d4e3c2a1b', 'Calle Falsa 123', 'Madrid', 'Comunidad de Madrid', '28001', 'España', TRUE),
('e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b', '90e8c7b6-1a2d-4f3e-8c7a-6b5d4e3c2a1b', 'Avenida Siempreviva 742', 'Barcelona', 'Cataluña', '08005', 'España', FALSE),
('f3a4b5c6-d7e8-9f0a-1b2c-3d4e5f6a7b8c', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Calle Gran Vía 45', 'Madrid', 'Comunidad de Madrid', '28013', 'España', TRUE),
('a4b5c6d7-e8f9-0a1b-2c3d-4e5f6a7b8c9d', 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', 'Paseo de Gracia 92', 'Barcelona', 'Cataluña', '08008', 'España', TRUE),
('b5c6d7e8-f9a0-1b2c-3d4e-5f6a7b8c9d0e', 'c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', 'Calle Alcalá 120', 'Madrid', 'Comunidad de Madrid', '28009', 'España', TRUE);

-- RESEÑAS (usando UUIDs directos)
INSERT INTO reviews (user_id, book_id, rating, comment) VALUES
('90e8c7b6-1a2d-4f3e-8c7a-6b5d4e3c2a1b', '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 5, 'Una obra que te transporta. Genial.'),
('90e8c7b6-1a2d-4f3e-8c7a-6b5d4e3c2a1b', '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', 4, 'Muy buen libro, un poco lento al principio.'),
('90e8c7b6-1a2d-4f3e-8c7a-6b5d4e3c2a1b', '7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d', 5, 'Imprescindible para amantes de la ciencia.'),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '0d1e2f3a-4b5c-6d7e-8f9a-b1c2d3e4f5a6', 5, 'Excelente libro que cambia tu perspectiva sobre la humanidad.'),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '7e8f9a0b-1c2d-3e4f-5a6b-7c8d9e0f1a2b', 5, 'Magia pura. No puedo dejar de leerlo.'),
('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', '5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b', 5, 'Borges es un genio. Cada cuento es una joya.'),
('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', '8b9c0d1e-2f3a-4b5c-6d7e-8f9a0b1c2d3e', 4, 'Complejo pero fascinante. Hawking explica conceptos difíciles de forma accesible.'),
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', '8f9a0b1c-2d3e-4f5a-6b7c-8d9e0f1a2b3c', 4, 'Muy buena historia, aunque a veces se hace largo.'),
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', '9a0b1c2d-3e4f-5a6b-7c8d-9e0f1a2b3c4d', 5, 'Murakami tiene un estilo único. Me encantó.'),
('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', '0b1c2d3e-4f5a-6b7c-8d9e-0f1a2b3c4d5e', 5, 'Una historia poderosa sobre amistad y crecimiento personal.'),
('b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e', '2d3e4f5a-6b7c-8d9e-0f1a-2b3c4d5e6f7a', 4, 'Muy bien escrita, aunque algunos pasajes son densos.'),
('c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f', '3e4f5a6b-7c8d-9e0f-1a2b-3c4d5e6f7a8b', 5, 'Eco es un maestro. La combinación de historia y misterio es perfecta.');

-- =====================================================
-- END OF SCHEMA AND DATA
-- =====================================================