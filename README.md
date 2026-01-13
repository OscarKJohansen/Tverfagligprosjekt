# Quiz Application

A web-based quiz application built with vanilla JavaScript and Supabase, featuring role-based access control for admins and regular users.

## Features

### User Features

- **Authentication** - Sign up and log in with email verification
- **Quiz Discovery** - Browse all available quizzes on the main page
- **Quiz Taking** - Click on quizzes to answer questions and submit responses
- **Answer Submission** - Submit short-answer responses to quiz questions

### Admin Features

- **Quiz Creation** - Create new quizzes with multiple questions
- **Admin Dashboard** - View all submitted answers in a structured table format
- **Answer Management** - See user responses organized by quiz and question

## Technology Stack

- **Frontend**: HTML, CSS (Bootstrap 5.3.8), Vanilla JavaScript (ES6 Modules)
- **Backend**: Supabase (PostgreSQL + Auth)
- **Authentication**: Supabase Auth with Email Verification
- **Data Storage**: Supabase PostgreSQL Database with Row Level Security (RLS)

## Project Structure

```
/
├── index.html              # Main application page
├── style.css              # Custom styling
├── QUIZ_SETUP.md          # Database setup instructions
├── README.md              # This file
└── Javascript/
    ├── app.js             # Main application logic & auth integration
    ├── auth.js            # Supabase authentication setup
    ├── state.js           # Global state management
    ├── quiz-ui.js         # Quiz UI components & interactions
    ├── quizzes.js         # Quiz data operations
    └── projects.js        # (existing project file)
```

## Getting Started

### Prerequisites

- Supabase account (free at https://supabase.com)
- Modern web browser
- Text editor

### 1. Supabase Setup

Follow the detailed guide in [QUIZ_SETUP.md](QUIZ_SETUP.md):

1. Create tables: `quizzes`, `questions`, `answers`
2. Set up Row Level Security (RLS) policies
3. Identify your admin user UUID

### 2. Configure Admin User

Edit `Javascript/auth.js` and replace the hardcoded UUID with your user ID:

```javascript
if (currentUser.id === "YOUR_UUID_HERE") {
  setCurrentRole("admin");
  return;
}
```

### 3. Run Locally

Open `index.html` in your browser, or serve with a simple HTTP server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx http-server
```

Then navigate to `http://localhost:8000` (or appropriate port)

## Usage Guide

### Creating a Quiz (Admin)

1. Log in with admin credentials
2. Click "Quiz" in navigation
3. Click "Opprett quiz" (Create Quiz)
4. Enter quiz title and description
5. Add questions using "Legg til spørsmål" (Add Question)
6. Click "Publiser quiz" (Publish Quiz)

### Taking a Quiz (User)

1. Log in or navigate as guest
2. On main page, browse available quizzes
3. Click a quiz card to open it
4. Fill in your answers to each question
5. Click "Send svar" (Submit Answers)

### Viewing Results (Admin)

1. Log in with admin credentials
2. Click "Admin" in navigation
3. View all submitted answers organized by quiz

## Architecture

### Authentication Flow

1. User enters email/password
2. Supabase checks for existing user
3. If not found, creates new account
4. Sends email verification link
5. On verified, user gains access
6. Admin role checked via hardcoded UUID or profiles table

### Quiz Flow

1. Admin creates quiz with questions
2. Data stored in `quizzes` and `questions` tables
3. Users browse and select quiz
4. User answers questions
5. Answers stored in `answers` table
6. Admin views results in admin dashboard

### Data Security

- Row Level Security (RLS) enabled on all tables
- Users can only see their own answers (and answers to quizzes they created)
- Admins can view all answers
- Authentication required for quiz creation
- Email verification required before full access

## File Descriptions

### `index.html`

Main HTML structure containing:

- Navigation bar with user info
- Login form
- Quiz list display
- Quiz creation form
- Quiz answering interface
- Admin results dashboard

### `app.js`

Main application entry point:

- Handles login/logout
- Initializes UI based on auth state
- Manages page navigation
- Sets up event listeners

### `auth.js`

Authentication setup:

- Supabase client initialization
- Auth state management
- Role loading logic
- Logout handler

### `quiz-ui.js`

Quiz user interface:

- Quiz list rendering
- Quiz creation form
- Quiz answering interface
- Admin results dashboard
- Event listener setup

### `quizzes.js`

Quiz data operations:

- Fetch quizzes and questions
- Create new quizzes
- Submit answers
- Retrieve admin results

### `state.js`

Global state management:

- Stores current user
- Stores user role
- Getters and setters for state

### `style.css`

Custom styling:

- Color palette (blue theme)
- Card styles
- Form controls
- Buttons
- Responsive layout

## API Reference

### Quizzes Module

#### `fetchQuizzes()`

Fetches all quizzes

```javascript
const quizzes = await fetchQuizzes();
```

#### `fetchQuizWithQuestions(quizId)`

Fetches a single quiz with its questions

```javascript
const quiz = await fetchQuizWithQuestions(42);
```

#### `createQuiz(title, description, questions)`

Creates a new quiz with questions

```javascript
const quiz = await createQuiz("My Quiz", "Description", ["Q1?", "Q2?"]);
```

#### `submitAnswers(quizId, answers)`

Submits user answers

```javascript
const success = await submitAnswers(42, { 1: "Answer 1", 2: "Answer 2" });
```

#### `fetchAllAnswers()`

Fetches all answers (admin only)

```javascript
const answers = await fetchAllAnswers();
```

## Customization

### Change Admin UUID

Edit `Javascript/auth.js`:

```javascript
if (currentUser.id === "YOUR_NEW_UUID") {
  setCurrentRole("admin");
}
```

### Change Colors

Edit `:root` variables in `style.css`:

```css
:root {
  --primary: #3b82f6;
  --primary-600: #2563eb;
  /* ... */
}
```

### Add Question Types

Modify `quizzes.js` to add a `type` field to questions and handle different types in `quiz-ui.js`.

## Troubleshooting

### Quiz creation button not showing

- Verify you're logged in as admin
- Check admin UUID in `auth.js`
- Open DevTools to check for errors

### Can't see quiz answers

- Verify admin role is set
- Check RLS policies in Supabase
- Verify answers table has data

### Answers not submitting

- Check browser console for errors
- Verify Supabase tables are created
- Confirm user is authenticated
- Check form validation

### Database errors

- Verify all tables are created (see QUIZ_SETUP.md)
- Check RLS policies are enabled
- Confirm Supabase credentials in `auth.js`

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Requires JavaScript enabled

## Future Enhancements

- Multiple question types (MCQ, true/false, matching)
- Quiz categories and search
- Scoring and grading
- Quiz statistics
- Export results to CSV
- Quiz scheduling
- Timed quizzes
- Question randomization
- Detailed analytics

## License

This project is open source and available for educational use.

## Contact & Support

For issues or questions, refer to the Supabase documentation at https://supabase.com/docs
