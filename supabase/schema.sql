-- ============================================
-- Workout Logger - Supabase Schema
-- ============================================

-- 1. Categories (운동 카테고리)
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0
);

-- 2. Exercises (운동 종목)
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exercises_category ON exercises(category_id);
CREATE INDEX idx_exercises_created_by ON exercises(created_by);

-- 3. Workout Logs (운동 기록)
CREATE TABLE workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workout_logs_user_date ON workout_logs(user_id, date);
CREATE INDEX idx_workout_logs_exercise ON workout_logs(exercise_id);

-- 4. Workout Sets (세트 정보)
CREATE TABLE workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id UUID NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
  set_number INT NOT NULL,
  weight DECIMAL(6, 2),
  reps INT,
  duration_seconds INT
);

CREATE INDEX idx_workout_sets_log ON workout_sets(workout_log_id);

-- ============================================
-- RLS Policies
-- ============================================

-- Categories: 모든 사용자 읽기 가능
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read categories"
ON categories FOR SELECT
USING (true);

-- Exercises: 기본 종목은 모두 읽기, 커스텀은 본인만
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read default exercises"
ON exercises FOR SELECT
USING (is_custom = false OR created_by = auth.uid());

CREATE POLICY "Users can create custom exercises"
ON exercises FOR INSERT
WITH CHECK (auth.uid() = created_by AND is_custom = true);

CREATE POLICY "Users can update own custom exercises"
ON exercises FOR UPDATE
USING (auth.uid() = created_by AND is_custom = true);

CREATE POLICY "Users can delete own custom exercises"
ON exercises FOR DELETE
USING (auth.uid() = created_by AND is_custom = true);

-- Workout Logs: 본인 기록만 CRUD
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own workout logs"
ON workout_logs FOR ALL
USING (auth.uid() = user_id);

-- Workout Sets: 본인 기록의 세트만 CRUD
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own workout sets"
ON workout_sets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workout_logs
    WHERE workout_logs.id = workout_sets.workout_log_id
    AND workout_logs.user_id = auth.uid()
  )
);

-- ============================================
-- Seed Data: 카테고리 & 기본 운동 종목
-- ============================================

-- 카테고리
INSERT INTO categories (name, slug, sort_order) VALUES
  ('가슴', 'chest', 1),
  ('등', 'back', 2),
  ('어깨', 'shoulder', 3),
  ('하체', 'legs', 4),
  ('이두', 'biceps', 5),
  ('삼두', 'triceps', 6),
  ('복근', 'abs', 7),
  ('전완', 'forearm', 8),
  ('유산소', 'cardio', 9);

-- 운동 종목 (카테고리 ID 참조를 위한 WITH 절 사용)
WITH cat AS (
  SELECT id, name FROM categories
)
INSERT INTO exercises (category_id, name, is_custom) VALUES
  -- 가슴
  ((SELECT id FROM cat WHERE name = '가슴'), '벤치프레스', false),
  ((SELECT id FROM cat WHERE name = '가슴'), '인클라인 덤벨프레스', false),
  ((SELECT id FROM cat WHERE name = '가슴'), '디클라인 벤치프레스', false),
  ((SELECT id FROM cat WHERE name = '가슴'), '케이블 크로스오버', false),
  ((SELECT id FROM cat WHERE name = '가슴'), '딥스', false),
  ((SELECT id FROM cat WHERE name = '가슴'), '펙덱 플라이', false),
  ((SELECT id FROM cat WHERE name = '가슴'), '푸시업', false),
  
  -- 등
  ((SELECT id FROM cat WHERE name = '등'), '렛풀다운', false),
  ((SELECT id FROM cat WHERE name = '등'), '바벨로우', false),
  ((SELECT id FROM cat WHERE name = '등'), '시티드로우', false),
  ((SELECT id FROM cat WHERE name = '등'), '풀업', false),
  ((SELECT id FROM cat WHERE name = '등'), '원암 덤벨로우', false),
  ((SELECT id FROM cat WHERE name = '등'), '케이블 풀오버', false),
  ((SELECT id FROM cat WHERE name = '등'), '티바로우', false),
  ((SELECT id FROM cat WHERE name = '등'), '데드리프트', false),
  
  -- 어깨
  ((SELECT id FROM cat WHERE name = '어깨'), '오버헤드프레스', false),
  ((SELECT id FROM cat WHERE name = '어깨'), '덤벨 숄더프레스', false),
  ((SELECT id FROM cat WHERE name = '어깨'), '사이드 레터럴 레이즈', false),
  ((SELECT id FROM cat WHERE name = '어깨'), '프론트 레이즈', false),
  ((SELECT id FROM cat WHERE name = '어깨'), '페이스풀', false),
  ((SELECT id FROM cat WHERE name = '어깨'), '리버스 펙덱', false),
  ((SELECT id FROM cat WHERE name = '어깨'), '업라이트로우', false),
  
  -- 하체
  ((SELECT id FROM cat WHERE name = '하체'), '스쿼트', false),
  ((SELECT id FROM cat WHERE name = '하체'), '레그프레스', false),
  ((SELECT id FROM cat WHERE name = '하체'), '레그익스텐션', false),
  ((SELECT id FROM cat WHERE name = '하체'), '레그컬', false),
  ((SELECT id FROM cat WHERE name = '하체'), '루마니안 데드리프트', false),
  ((SELECT id FROM cat WHERE name = '하체'), '힙쓰러스트', false),
  ((SELECT id FROM cat WHERE name = '하체'), '런지', false),
  ((SELECT id FROM cat WHERE name = '하체'), '카프레이즈', false),
  
  -- 이두
  ((SELECT id FROM cat WHERE name = '이두'), '바벨컬', false),
  ((SELECT id FROM cat WHERE name = '이두'), '덤벨컬', false),
  ((SELECT id FROM cat WHERE name = '이두'), '해머컬', false),
  ((SELECT id FROM cat WHERE name = '이두'), '프리처컬', false),
  ((SELECT id FROM cat WHERE name = '이두'), '인클라인 덤벨컬', false),
  ((SELECT id FROM cat WHERE name = '이두'), '케이블컬', false),
  
  -- 삼두
  ((SELECT id FROM cat WHERE name = '삼두'), '트라이셉스 푸시다운', false),
  ((SELECT id FROM cat WHERE name = '삼두'), '오버헤드 익스텐션', false),
  ((SELECT id FROM cat WHERE name = '삼두'), '클로즈그립 벤치프레스', false),
  ((SELECT id FROM cat WHERE name = '삼두'), '스컬크러셔', false),
  ((SELECT id FROM cat WHERE name = '삼두'), '킥백', false),
  
  -- 복근
  ((SELECT id FROM cat WHERE name = '복근'), '크런치', false),
  ((SELECT id FROM cat WHERE name = '복근'), '레그레이즈', false),
  ((SELECT id FROM cat WHERE name = '복근'), '플랭크', false),
  ((SELECT id FROM cat WHERE name = '복근'), '케이블 크런치', false),
  ((SELECT id FROM cat WHERE name = '복근'), '행잉 레그레이즈', false),
  ((SELECT id FROM cat WHERE name = '복근'), '러시안 트위스트', false),
  
  -- 전완
  ((SELECT id FROM cat WHERE name = '전완'), '리스트컬', false),
  ((SELECT id FROM cat WHERE name = '전완'), '리버스 리스트컬', false),
  ((SELECT id FROM cat WHERE name = '전완'), '파머스 워크', false),
  
  -- 유산소
  ((SELECT id FROM cat WHERE name = '유산소'), '러닝', false),
  ((SELECT id FROM cat WHERE name = '유산소'), '사이클', false),
  ((SELECT id FROM cat WHERE name = '유산소'), '로잉머신', false),
  ((SELECT id FROM cat WHERE name = '유산소'), '스텝밀', false),
  ((SELECT id FROM cat WHERE name = '유산소'), '점프로프', false),
  ((SELECT id FROM cat WHERE name = '유산소'), '버피', false);
