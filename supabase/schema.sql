-- ============================================
-- Workout Logger - Supabase Schema
-- ============================================

-- ============================================
-- DROP (기존 테이블 삭제)
-- ============================================
DROP TABLE IF EXISTS routine_sets CASCADE;
DROP TABLE IF EXISTS routine_exercises CASCADE;
DROP TABLE IF EXISTS routines CASCADE;
DROP TABLE IF EXISTS exercise_sets CASCADE;
DROP TABLE IF EXISTS session_exercises CASCADE;
DROP TABLE IF EXISTS workout_sessions CASCADE;
DROP TABLE IF EXISTS workout_sets CASCADE;
DROP TABLE IF EXISTS workout_logs CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- ============================================
-- CREATE TABLES
-- ============================================

-- 1. Categories (운동 카테고리)
CREATE TABLE categories (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0
);

-- 2. Exercises (운동 종목)
CREATE TABLE exercises (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exercises_category ON exercises(category_id);
CREATE INDEX idx_exercises_created_by ON exercises(created_by);

-- 3. Workout Sessions (운동 세션 - 하루에 1개)
CREATE TABLE workout_sessions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_workout_sessions_user_date ON workout_sessions(user_id, date);

-- 4. Session Exercises (세션 내 운동 - 운동별 1개)
CREATE TABLE session_exercises (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  session_id BIGINT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id BIGINT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  order_num INT NOT NULL DEFAULT 0,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, exercise_id)
);

CREATE INDEX idx_session_exercises_session ON session_exercises(session_id);
CREATE INDEX idx_session_exercises_exercise ON session_exercises(exercise_id);

-- 5. Exercise Sets (세트 정보)
CREATE TABLE exercise_sets (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  session_exercise_id BIGINT NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
  set_number INT NOT NULL,
  weight DECIMAL(6, 2),
  reps INT,
  duration_seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exercise_sets_session_exercise ON exercise_sets(session_exercise_id);

-- 6. Routines (루틴 템플릿)
CREATE TABLE routines (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_routines_user ON routines(user_id);

-- 7. Routine Exercises (루틴 내 운동)
CREATE TABLE routine_exercises (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  routine_id BIGINT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  exercise_id BIGINT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  order_num INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_routine_exercises_routine ON routine_exercises(routine_id);
CREATE INDEX idx_routine_exercises_exercise ON routine_exercises(exercise_id);

-- 8. Routine Sets (루틴 세트 템플릿)
CREATE TABLE routine_sets (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  routine_exercise_id BIGINT NOT NULL REFERENCES routine_exercises(id) ON DELETE CASCADE,
  set_number INT NOT NULL,
  weight DECIMAL(6, 2),
  reps INT,
  duration_seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_routine_sets_routine_exercise ON routine_sets(routine_exercise_id);

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

-- Workout Sessions: 본인 세션만 CRUD
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own workout sessions"
ON workout_sessions FOR ALL
USING (auth.uid() = user_id);

-- Session Exercises: 본인 세션의 운동만 CRUD
ALTER TABLE session_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own session exercises"
ON session_exercises FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workout_sessions
    WHERE workout_sessions.id = session_exercises.session_id
    AND workout_sessions.user_id = auth.uid()
  )
);

-- Exercise Sets: 본인 세션의 운동 세트만 CRUD
ALTER TABLE exercise_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own exercise sets"
ON exercise_sets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM session_exercises se
    JOIN workout_sessions ws ON ws.id = se.session_id
    WHERE se.id = exercise_sets.session_exercise_id
    AND ws.user_id = auth.uid()
  )
);

-- Routines: 본인 루틴만 CRUD
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own routines"
ON routines FOR ALL
USING (auth.uid() = user_id);

-- Routine Exercises: 본인 루틴의 운동만 CRUD
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own routine exercises"
ON routine_exercises FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM routines
    WHERE routines.id = routine_exercises.routine_id
    AND routines.user_id = auth.uid()
  )
);

-- Routine Sets: 본인 루틴의 세트만 CRUD
ALTER TABLE routine_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own routine sets"
ON routine_sets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM routine_exercises re
    JOIN routines r ON r.id = re.routine_id
    WHERE re.id = routine_sets.routine_exercise_id
    AND r.user_id = auth.uid()
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

-- ============================================
-- 9. User Goals (주간 목표)
-- ============================================
CREATE TABLE user_goals (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL DEFAULT 'weekly_workouts',
  target_value INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, goal_type)
);

CREATE INDEX idx_user_goals_user ON user_goals(user_id);

-- User Goals RLS
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own goals"
ON user_goals FOR ALL
USING (auth.uid() = user_id);
