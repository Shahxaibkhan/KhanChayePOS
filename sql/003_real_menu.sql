-- Khan Chaye POS — migration 003
-- Run this once in the Supabase SQL editor, after 002_wastage_and_returns.sql.
-- Replaces the 6 placeholder starter items with the real printed menu.
-- Chaye items that come in Regular/Large are listed as two separate items —
-- fastest to tap on a counter screen, no "pick a size" step mid-order.

delete from items where name in
  ('Doodh Patti', 'Kadak Chaye', 'Green Tea', 'Aloo Paratha', 'Plain Paratha', 'Paratha Roll');

insert into items (name, category, price, sort_order, is_active) values
  -- Chaye
  ('Karak Chaye (Regular)',        'Chaye', 100, 1,  true),
  ('Karak Chaye (Large)',          'Chaye', 150, 2,  true),
  ('Doodh Patti (Regular)',        'Chaye', 120, 3,  true),
  ('Doodh Patti (Large)',          'Chaye', 180, 4,  true),
  ('Elaichi Chaye (Regular)',      'Chaye', 120, 5,  true),
  ('Elaichi Chaye (Large)',        'Chaye', 150, 6,  true),
  ('Masala Chaye (Regular)',       'Chaye', 130, 7,  true),
  ('Masala Chaye (Large)',         'Chaye', 160, 8,  true),
  ('Gur Chaye (Regular)',          'Chaye', 150, 9,  true),
  ('Gur Chaye (Large)',            'Chaye', 170, 10, true),
  ('Khan Special Malai (Regular)', 'Chaye', 200, 11, true),
  ('Khan Special Malai (Large)',   'Chaye', 300, 12, true),
  ('Kehwa',                        'Chaye', 150, 13, true),
  ('Kashmiri Tea',                 'Chaye', 280, 14, true),
  ('Chocolate Tea',                'Chaye', 250, 15, true),

  -- Parathas
  ('Simple Paratha',          'Paratha', 80,  20, true),
  ('Aloo Paratha',            'Paratha', 150, 21, true),
  ('Anda Paratha',            'Paratha', 230, 22, true),
  ('Cheese Paratha',          'Paratha', 250, 23, true),
  ('Chocolate Paratha',       'Paratha', 250, 24, true),
  ('Chicken Paratha',         'Paratha', 300, 25, true),
  ('Chicken Cheese Paratha',  'Paratha', 400, 26, true),
  ('Qeema Paratha',           'Paratha', 400, 27, true),

  -- Samosas & Snacks
  ('Aloo Samosa',             'Samosas & Snacks', 20,  30, true),
  ('Shami Samosa',            'Samosas & Snacks', 50,  31, true),
  ('Chicken Cheese Samosa',   'Samosas & Snacks', 70,  32, true),
  ('Tikka Cheese Samosa',     'Samosas & Snacks', 70,  33, true),
  ('Pizza Samosa',            'Samosas & Snacks', 80,  34, true),
  ('Zinger Samosa',           'Samosas & Snacks', 100, 35, true),
  ('Chicken Nuggets (2 pcs)', 'Samosas & Snacks', 130, 36, true),

  -- Rolls
  ('Malai Boti Roll',   'Rolls', 70,  40, true),
  ('Kabab Roll',         'Rolls', 100, 41, true),
  ('Malai Crunch Roll', 'Rolls', 150, 42, true),
  ('Chicken Shawarma',  'Rolls', 170, 43, true),

  -- Egg Special
  ('Egg Boil',      'Egg Special', 50,  50, true),
  ('Egg Full Fry',  'Egg Special', 100, 51, true),
  ('Egg Half Fry',  'Egg Special', 100, 52, true),
  ('Egg Omelette',  'Egg Special', 130, 53, true),

  -- On the menu board as "Coming Soon" — added inactive so they're ready to
  -- flip on (Admin → Items → edit price → toggle Active) the day they launch.
  ('Gol Gappay', 'Coming Soon', 0, 90, false),
  ('Chaat',      'Coming Soon', 0, 91, false);
