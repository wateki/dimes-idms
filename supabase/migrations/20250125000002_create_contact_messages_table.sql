-- Migration: Create contact_messages table
-- This table stores contact form submissions from the public contact page

-- Contact messages table
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'new', -- new, read, replied, archived
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON public.contact_messages(email);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_createdAt ON public.contact_messages(createdAt DESC);

-- Add comments
COMMENT ON TABLE public.contact_messages IS 'Stores contact form submissions from the public contact page';
COMMENT ON COLUMN public.contact_messages.status IS 'Message status: new, read, replied, archived';

-- Enable RLS
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow anyone to insert (submit contact forms)
CREATE POLICY "Allow public to insert contact messages"
  ON public.contact_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated users (admins) can read contact messages
CREATE POLICY "Allow authenticated users to read contact messages"
  ON public.contact_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users (admins) can update contact messages
CREATE POLICY "Allow authenticated users to update contact messages"
  ON public.contact_messages
  FOR UPDATE
  TO authenticated
  USING (true);

-- Only authenticated users (admins) can delete contact messages
CREATE POLICY "Allow authenticated users to delete contact messages"
  ON public.contact_messages
  FOR DELETE
  TO authenticated
  USING (true);
