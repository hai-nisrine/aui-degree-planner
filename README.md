# AUI Degree Planner

A web app that helps Al Akhawayn University students plan their degree, semester by semester.


## Features

- Drag and drop courses into semesters
- Prerequisites and credit limits are checked automatically
- Dashboard with your GPA, credits and saved semesters
- AI course advisor powered by Google Gemini


## Built with

React · Node.js · Express · PostgreSQL · Google Gemini API

## Run it locally

You need Node.js and PostgreSQL installed.

```bash
# 1. Create the database
createdb aui_degree_planner
psql -d aui_degree_planner -f backend/schema.sql

# 2. Start the backend
cd backend
cp .env.example .env    # then fill in your database login and JWT_SECRET
npm install
npm start

# 3. Start the frontend (in a second terminal)
cd frontend
cp .env.example .env
npm install
npm start
```

The app opens at http://localhost:3000.

## Team

Built for CSC 3324 (Software Engineering) at Al Akhawayn University, Fall 2025, by Nisrine Haida, Wiam Alaoui Hachimi, Shahd Islam, Amr Ghazzali and Noura Hadad.