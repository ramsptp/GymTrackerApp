# Project Context: Lightweight Gym Tracker

## Project Overview
A private, highly user-friendly gym tracking application designed for a small group of friends. The core philosophy is frictionless mid-workout logging, heavily inspired by apps like Strong. The application must be fast, lightweight, and optimized for quick data entry without interrupting the user's workout flow.

## Core Features & Functionality

### 1. Exercise Library
*   Comprehensive built-in database of exercises categorized by muscle group and equipment type.
*   Support for users to create and save custom exercises.

### 2. Routine Management
*   Create, save, and edit workout routines (e.g., Push/Pull/Legs splits).
*   Ability to clone, modify, and start past workouts.

### 3. Active Workout Logging (The Core Loop)
*   Live session tracking UI to log Sets, Reps, and Weight.
*   One-tap completion for sets.
*   Auto-rest timers that trigger immediately upon completing a set.
*   Support for supersets and specific set types (Warm-up, Drop sets, Failure).

### 4. Progression & History
*   Track Personal Records (PRs) and estimated 1RM (One-Rep Max).
*   Session history log detailing total volume, total sets, and workout duration.
*   Visual progression tracking for specific exercises over time.

## UX & Architecture Principles
*   **Frictionless UI:** The interface must prioritize large touch targets, quick numpad inputs, and minimal screen transitions.
*   **Offline-First & Snappy:** Must handle poor gym Wi-Fi gracefully. Local caching and offline persistence are required so sets are never lost. 
*   **Private Scope:** Strictly scoped to a small, private user group. No public social feeds or unnecessary bloat.

## Recommended Tech Stack
*   **Frontend:** React / Next.js (or React Native for a mobile-native build) to ensure a responsive, component-driven UI.
*   **Backend & Database:** Firebase (Firestore) to leverage out-of-the-box offline persistence and real-time syncing for the private group.

## Data Models (High-Level)
*   **User:** ID, Name, Settings.
*   **Exercise:** ID, Name, MuscleGroup, Equipment, IsCustom.
*   **Routine:** ID, Name, UserID, List of Exercises.
*   **WorkoutSession:** ID, UserID, StartTime, EndTime, Duration.
*   **SetLog:** SessionID, ExerciseID, SetNumber, Reps, Weight, SetType.