CREATE TABLE talks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  author TEXT NOT NULL,
  duration INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE user_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  talk_id UUID NOT NULL REFERENCES talks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  UNIQUE(user_id, talk_id)
);

CREATE TABLE voting_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voting_start_date TIMESTAMPTZ NOT NULL,
  max_votes_per_user INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

INSERT INTO voting_config (voting_start_date, max_votes_per_user)
VALUES ('2025-11-07T00:00:00Z', 3);

ALTER TABLE talks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE voting_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura pública de charlas" ON talks
  FOR SELECT USING (true);

CREATE POLICY "Permitir inserción de charlas a usuarios autenticados" ON talks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden ver sus propios votos" ON user_votes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden insertar sus propios votos" ON user_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus propios votos" ON user_votes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Permitir lectura pública de configuración de votación" ON voting_config
  FOR SELECT USING (true);
