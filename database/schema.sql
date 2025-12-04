-- =====================================================
-- E-commerce Bookstore Database Schema
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
    discount_amount NUMERIC := 0;
    shipping_cost NUMERIC := 5.00; -- Fixed shipping cost
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
        discount_amount := cart_total * 0.10; -- 10% discount example
    END IF;
    
    -- Create order
    INSERT INTO orders (user_id, address_id, total_amount, shipping_cost, discount_amount, status)
    VALUES (user_uuid, address_uuid, cart_total - discount_amount + shipping_cost, shipping_cost, discount_amount, 'pending')
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
    
    -- Update order total
    UPDATE orders
    SET total_amount = calculate_order_total(new_order_id) - discount_amount + shipping_cost
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
    
    -- Update order status if all items returned
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
-- TRIGGERS
-- =====================================================

-- Trigger to update stock when order item is created
CREATE OR REPLACE FUNCTION update_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Stock is already updated in the checkout procedure
    -- This trigger is for direct order item inserts (if needed)
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
    -- In a real application, you might want to store this in a books.rating column
    -- For now, we'll just ensure the trigger fires
    -- The rating is calculated on-the-fly using the function
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
-- INITIAL DATA (Optional - for testing)
-- =====================================================

-- Insert default admin user (password should be hashed in real application)
-- Password: admin123 (should be properly hashed)
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
('admin@libreria.com', '$2b$10$example_hash_here', 'Admin', 'User', 'admin');

-- Insert sample categories
INSERT INTO categories (name, description) VALUES
('Ficción', 'Novelas y obras de ficción'),
('No Ficción', 'Libros informativos y educativos'),
('Ciencia', 'Libros de ciencia y tecnología'),
('Historia', 'Libros históricos'),
('Biografía', 'Biografías y autobiografías');

-- Insert sample publishers
INSERT INTO publishers (name, city, country) VALUES
('Editorial Planeta', 'Barcelona', 'España'),
('Penguin Random House', 'Madrid', 'España'),
('Editorial Anagrama', 'Barcelona', 'España');

-- =====================================================
-- END OF SCHEMA
-- =====================================================
