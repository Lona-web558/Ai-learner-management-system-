# Lumina LMS
Express + Bootstrap learning platform with an AI tutor.

    npm install
    npm start          # http://localhost:3000

Optional full AI answers (uses Claude): `ANTHROPIC_API_KEY=your_key npm start`
Without a key, the tutor falls back to searching lesson text.
Data is in memory (resets on restart); replace the arrays in server.js with a database for production.
