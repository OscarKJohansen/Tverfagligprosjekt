# Quiz Application - Supabase Setup Guide

## Overview

This quiz application requires three main tables in Supabase to function properly:

1. `quizzes` - Quiz metadata
2. `questions` - Questions for each quiz
3. `answers` - User answers to questions

## Database Schema

### 1. Quizzes Table

Run this SQL in Supabase SQL Editor:

```sql
CREATE TABLE quizzes (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read quizzes
CREATE POLICY "Allow public select on quizzes"
  ON quizzes
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Policy: Only authenticated users can create
CREATE POLICY "Allow authenticated insert on quizzes"
  ON quizzes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Policy: Only creator can update/delete
CREATE POLICY "Allow creator update on quizzes"
  ON quizzes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Allow creator delete on quizzes"
  ON quizzes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);
```

### 2. Questions Table

```sql
CREATE TABLE questions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  quiz_id BIGINT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read questions
CREATE POLICY "Allow public select on questions"
  ON questions
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Policy: Only authenticated users can create questions
CREATE POLICY "Allow authenticated insert on questions"
  ON questions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT created_by FROM quizzes WHERE id = quiz_id
    )
  );
```

### 3. Answers Table

```sql
CREATE TABLE answers (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own answers
CREATE POLICY "Allow users read own answers"
  ON answers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR (
    SELECT created_by FROM questions
    JOIN quizzes ON questions.quiz_id = quizzes.id
    WHERE questions.id = question_id
  ) = auth.uid()
  );

-- Policy: Only authenticated users can insert answers
CREATE POLICY "Allow authenticated insert on answers"
  ON answers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own answers (no delete policy for data integrity)
CREATE POLICY "Allow users update own answers"
  ON answers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
```

## Setup Steps

1. **Log in to Supabase Dashboard** - Go to https://supabase.com/dashboard

2. **Navigate to SQL Editor** - In your project, go to SQL Editor on the left sidebar

3. **Run the SQL Queries** - Copy and paste each SQL block above into the SQL Editor and execute them in order:

   - First: Create quizzes table
   - Second: Create questions table
   - Third: Create answers table

4. **Verify Tables** - Go to the Tables view in the left sidebar and confirm you see:

   - `quizzes`
   - `questions`
   - `answers`

5. **Check Policies** - Click on each table and verify that RLS (Row Level Security) is enabled and policies are in place

## Important Notes

### Admin User

The admin role is currently hardcoded in `auth.js`. To enable admin features for a user, their UUID must match the hardcoded admin ID:

```javascript
if (currentUser.id === "81e519d0-8b8c-4190-bdd7-a96bfe09235c") {
  setCurrentRole("admin");
  return;
}
```

**To find your user ID:**

1. Log in to the application
2. Open browser DevTools (F12)
3. Go to Console tab
4. Run: `JSON.parse(localStorage.getItem('sb-aiseafkfjhixolxezjjq-auth-token')).user.id`
5. Copy your UUID

**To make a user admin:**

- Replace the hardcoded UUID in `Javascript/auth.js` with your UUID, or
- Create a `profiles` table and manage roles there

### Security Considerations

- RLS policies ensure users can only:
  - Read all quizzes
  - Create their own quizzes (auth required)
  - Submit answers only to their own responses
  - View answers (they submit or created quiz)
  - Admins can see all answers through the admin interface

### Future Enhancements

- Add `profiles` table for role management
- Implement quiz categories/topics
- Add multiple question types (multiple choice, true/false, etc.)
- Add scoring/grading logic
- Add quiz statistics and analytics
