-- Add barcode support to energy drinks
-- Migration 002: Add UPC/EAN barcode column

-- Add barcode column (UPC-A is 12 digits, EAN-13 is 13 digits)
ALTER TABLE energy_drinks ADD COLUMN IF NOT EXISTS barcode VARCHAR(20) UNIQUE;

-- Create index for fast barcode lookups
CREATE INDEX IF NOT EXISTS idx_drinks_barcode ON energy_drinks (barcode);

-- Add sample barcodes for existing drinks (using realistic UPC-A format)
-- Red Bull Original 250ml
UPDATE energy_drinks SET barcode = '611269991000' WHERE brand = 'Red Bull' AND flavor = 'Original' AND size_ml = 250;

-- Red Bull Sugar Free 250ml
UPDATE energy_drinks SET barcode = '611269991017' WHERE brand = 'Red Bull' AND flavor = 'Sugar Free' AND size_ml = 250;

-- Monster Original 473ml (16oz)
UPDATE energy_drinks SET barcode = '070847811169' WHERE brand = 'Monster' AND flavor = 'Original' AND size_ml = 473;

-- Monster Ultra White 473ml
UPDATE energy_drinks SET barcode = '070847030928' WHERE brand = 'Monster' AND flavor = 'Ultra White' AND size_ml = 473;

-- Bang Cotton Candy 473ml
UPDATE energy_drinks SET barcode = '819005020306' WHERE brand = 'Bang' AND flavor = 'Cotton Candy' AND size_ml = 473;

-- Bang Blue Razz 473ml
UPDATE energy_drinks SET barcode = '819005020207' WHERE brand = 'Bang' AND flavor = 'Blue Razz' AND size_ml = 473;

-- Celsius Sparkling Orange 355ml
UPDATE energy_drinks SET barcode = '889392002027' WHERE brand = 'Celsius' AND flavor = 'Sparkling Orange' AND size_ml = 355;

-- Reign Melon Mania 473ml
UPDATE energy_drinks SET barcode = '084879518801' WHERE brand = 'Reign' AND flavor = 'Melon Mania' AND size_ml = 473;

-- Rockstar Original 473ml
UPDATE energy_drinks SET barcode = '818094002875' WHERE brand = 'Rockstar' AND flavor = 'Original' AND size_ml = 473;

-- 5-hour Energy Berry 59ml
UPDATE energy_drinks SET barcode = '719410100018' WHERE brand = '5-hour Energy' AND flavor = 'Berry' AND size_ml = 59;
