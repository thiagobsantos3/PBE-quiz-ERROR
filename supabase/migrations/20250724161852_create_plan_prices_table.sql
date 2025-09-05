-- Create the plan_prices table
CREATE TABLE public.plan_prices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id text NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
    currency text NOT NULL,
    interval text NOT NULL,
    amount numeric NOT NULL,
    stripe_price_id text, -- To store Stripe's Price ID for this specific price point
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),

    -- Ensure no duplicate price entries for the same plan, currency, and interval
    CONSTRAINT unique_plan_currency_interval UNIQUE (plan_id, currency, interval),

    -- Restrict currency to supported values
    CONSTRAINT check_currency CHECK (currency IN ('USD', 'GBP', 'AUD', 'CAD')),

    -- Restrict interval to supported values
    CONSTRAINT check_interval CHECK (interval IN ('monthly', 'yearly'))
);

-- Add an index for faster lookups by plan_id
CREATE INDEX idx_plan_prices_plan_id ON public.plan_prices (plan_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.plan_prices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust as needed for your application's security model)
-- For now, allow authenticated users to read, and admins to manage.
CREATE POLICY "Allow authenticated read access to plan_prices"
ON public.plan_prices FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admin to manage plan_prices"
ON public.plan_prices FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'admin'));

-- Create a trigger function to update the 'updated_at' column automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to the plan_prices table
CREATE TRIGGER update_plan_prices_updated_at BEFORE UPDATE ON public.plan_prices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
