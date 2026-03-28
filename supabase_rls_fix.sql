-- Supabase SQL Fix for RLS on "orders" table
-- Execute this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Enable RLS if not already enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

-- 3. Create policy for INSERT
-- This allows authenticated users to insert rows where the "User ID" matches their own UID
CREATE POLICY "Users can insert their own orders" ON public.orders
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid()::text = "User ID"::text);

-- 4. Create policy for SELECT
-- This allows authenticated users to view only their own rows
CREATE POLICY "Users can view their own orders" ON public.orders
FOR SELECT 
TO authenticated
USING (auth.uid()::text = "User ID"::text);

-- 5. Create policy for UPDATE (if needed)
CREATE POLICY "Users can update their own orders" ON public.orders
FOR UPDATE
TO authenticated
USING (auth.uid()::text = "User ID"::text)
WITH CHECK (auth.uid()::text = "User ID"::text);

-- 6. Verify the table has the correct columns
-- If you renamed columns, ensure "User ID" exists and is of type text or uuid.
