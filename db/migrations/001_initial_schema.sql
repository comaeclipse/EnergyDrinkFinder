-- Energy Drink Finder Database Schema
-- Initial migration: Create stores, energy_drinks, and store_inventory tables

-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Stores table: Physical locations selling energy drinks
CREATE TABLE IF NOT EXISTS stores (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    phone VARCHAR(20),
    hours_json JSONB, -- Store hours in JSON format
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Create a geography point for efficient spatial queries
    location GEOGRAPHY(POINT, 4326)
);

-- Create spatial index on location for fast proximity queries
CREATE INDEX IF NOT EXISTS idx_stores_location ON stores USING GIST (location);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_stores_city_state ON stores (city, state);
CREATE INDEX IF NOT EXISTS idx_stores_zip ON stores (zip_code);

-- Trigger to automatically update location from lat/long
CREATE OR REPLACE FUNCTION update_store_location()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER store_location_trigger
    BEFORE INSERT OR UPDATE ON stores
    FOR EACH ROW
    EXECUTE FUNCTION update_store_location();

-- Energy drinks table: Product catalog
CREATE TABLE IF NOT EXISTS energy_drinks (
    id SERIAL PRIMARY KEY,
    brand VARCHAR(100) NOT NULL,
    flavor VARCHAR(100) NOT NULL,
    size_ml INTEGER NOT NULL,
    caffeine_mg INTEGER,
    sugar_g DECIMAL(5, 2),
    calories INTEGER,
    description TEXT,
    image_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Ensure unique combination of brand, flavor, and size
    UNIQUE (brand, flavor, size_ml)
);

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_drinks_brand ON energy_drinks (brand);
CREATE INDEX IF NOT EXISTS idx_drinks_flavor ON energy_drinks (flavor);

-- Store inventory: Links stores to available drinks with pricing
CREATE TABLE IF NOT EXISTS store_inventory (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    drink_id INTEGER NOT NULL REFERENCES energy_drinks(id) ON DELETE CASCADE,
    price DECIMAL(6, 2) NOT NULL,
    in_stock BOOLEAN DEFAULT true,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Ensure a store can't have duplicate entries for the same drink
    UNIQUE (store_id, drink_id)
);

-- Create indexes for inventory queries
CREATE INDEX IF NOT EXISTS idx_inventory_store ON store_inventory (store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_drink ON store_inventory (drink_id);
CREATE INDEX IF NOT EXISTS idx_inventory_in_stock ON store_inventory (in_stock);

-- Trigger to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_inventory_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inventory_timestamp_trigger
    BEFORE UPDATE ON store_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_timestamp();

-- Insert some sample data for testing
INSERT INTO stores (name, address, city, state, zip_code, latitude, longitude, phone) VALUES
    ('7-Eleven Downtown', '123 Main St', 'New York', 'NY', '10001', 40.750580, -73.993584, '212-555-0100'),
    ('QuikTrip Midtown', '456 5th Ave', 'New York', 'NY', '10018', 40.754932, -73.984016, '212-555-0101'),
    ('Wawa Plaza', '789 Broadway', 'New York', 'NY', '10003', 40.732000, -73.990000, '212-555-0102'),
    ('Circle K East', '321 Park Ave', 'New York', 'NY', '10022', 40.758896, -73.968285, '212-555-0103');

INSERT INTO energy_drinks (brand, flavor, size_ml, caffeine_mg, sugar_g, calories, description) VALUES
    ('Red Bull', 'Original', 250, 80, 27, 110, 'Classic Red Bull energy drink'),
    ('Red Bull', 'Sugar Free', 250, 80, 0, 10, 'Red Bull with zero sugar'),
    ('Monster', 'Original', 473, 160, 54, 210, 'Monster Energy original green'),
    ('Monster', 'Ultra White', 473, 150, 0, 10, 'Monster Ultra zero sugar white'),
    ('Bang', 'Cotton Candy', 473, 300, 0, 0, 'Bang Energy cotton candy flavor'),
    ('Bang', 'Blue Razz', 473, 300, 0, 0, 'Bang Energy blue raspberry'),
    ('Celsius', 'Sparkling Orange', 355, 200, 0, 10, 'Celsius fitness drink orange'),
    ('Reign', 'Melon Mania', 473, 300, 0, 10, 'Reign Total Body Fuel melon'),
    ('Rockstar', 'Original', 473, 160, 62, 250, 'Rockstar original energy'),
    ('5-hour Energy', 'Berry', 59, 200, 0, 4, 'Extra strength 5-hour shot');

-- Insert sample inventory (connect stores with drinks)
-- 7-Eleven has a variety
INSERT INTO store_inventory (store_id, drink_id, price, in_stock) VALUES
    (1, 1, 2.99, true),
    (1, 2, 2.99, true),
    (1, 3, 3.49, true),
    (1, 5, 3.99, true),
    (1, 7, 3.29, true),
    (1, 10, 4.49, false);

-- QuikTrip has Monster and Bang focus
INSERT INTO store_inventory (store_id, drink_id, price, in_stock) VALUES
    (2, 3, 3.29, true),
    (2, 4, 3.29, true),
    (2, 5, 3.79, true),
    (2, 6, 3.79, true),
    (2, 9, 3.49, true);

-- Wawa has Red Bull and Celsius
INSERT INTO store_inventory (store_id, drink_id, price, in_stock) VALUES
    (3, 1, 3.19, true),
    (3, 2, 3.19, true),
    (3, 7, 3.49, true),
    (3, 8, 3.99, true);

-- Circle K has everything
INSERT INTO store_inventory (store_id, drink_id, price, in_stock) VALUES
    (4, 1, 2.89, true),
    (4, 3, 3.19, true),
    (4, 4, 3.19, true),
    (4, 5, 3.69, true),
    (4, 7, 3.39, true),
    (4, 8, 3.89, true),
    (4, 9, 3.29, true),
    (4, 10, 4.29, true);
