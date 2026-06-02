
UPDATE public.banners
SET image_url = 'https://hfkudivemqvttwpxyknc.supabase.co/storage/v1/object/public/product-images/hero-products.jpg'
WHERE type = 'hero' AND image_url IS NULL;
