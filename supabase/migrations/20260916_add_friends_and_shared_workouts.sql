-- Migration: Add friendships and shared workouts tables

CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    addressee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(requester_id, addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can SELECT friendships involving themselves" 
ON public.friendships FOR SELECT 
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can INSERT friendships involving themselves" 
ON public.friendships FOR INSERT 
WITH CHECK (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can UPDATE friendships involving themselves" 
ON public.friendships FOR UPDATE 
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);


CREATE TABLE IF NOT EXISTS public.workout_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'declined')),
    role TEXT NOT NULL CHECK (role IN ('owner', 'participant')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(workout_id, user_id)
);

ALTER TABLE public.workout_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can SELECT workout participants if they are involved" 
ON public.workout_participants FOR SELECT 
USING (
    user_id = auth.uid() 
    OR workout_id IN (
        SELECT workout_id FROM public.workout_participants WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can INSERT workout participants if they are the owner or invited" 
ON public.workout_participants FOR INSERT 
WITH CHECK (
    user_id = auth.uid() 
    OR workout_id IN (
        SELECT id FROM public.workouts WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can UPDATE workout participants if it involves them" 
ON public.workout_participants FOR UPDATE 
USING (user_id = auth.uid() OR workout_id IN (SELECT id FROM public.workouts WHERE user_id = auth.uid()));

-- Add tables to powersync publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'powersync') THEN
    BEGIN
      ALTER PUBLICATION powersync ADD TABLE public.friendships;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION powersync ADD TABLE public.workout_participants;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
