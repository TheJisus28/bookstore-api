-- =====================================================
-- Reset Database - DROP ALL OBJECTS
-- =====================================================

-- Drop views
DROP VIEW IF EXISTS customer_purchase_history CASCADE;
DROP VIEW IF EXISTS order_summary CASCADE;
DROP VIEW IF EXISTS book_catalog CASCADE;

-- Drop tables in reverse dependency order
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

-- Drop trigger functions
DROP FUNCTION IF EXISTS update_stock_on_order() CASCADE;
DROP FUNCTION IF EXISTS update_book_rating() CASCADE;
DROP FUNCTION IF EXISTS audit_order_changes() CASCADE;
DROP FUNCTION IF EXISTS update_user_timestamp() CASCADE;
DROP FUNCTION IF EXISTS update_book_timestamp() CASCADE;
DROP FUNCTION IF EXISTS update_cart_item_timestamp() CASCADE;
