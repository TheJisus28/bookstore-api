# Database Scripts

## Setup Database

### Option 1: Using psql command line

```bash
# Connect to PostgreSQL
psql -h localhost -p 5432 -U admin -d workout_tracker

# Run the schema
\i database/schema.sql
```

### Option 2: Using psql from command line

```bash
psql -h localhost -p 5432 -U admin -d workout_tracker -f database/schema.sql
```

### Option 3: Using Docker exec

```bash
docker exec -i mi-postgres psql -U admin -d workout_tracker < database/schema.sql
```

## Reset Database

To drop all tables and start fresh:

```bash
psql -h localhost -p 5432 -U admin -d workout_tracker -f database/reset.sql
```

## Database Structure

### Tables

1. **exercise_categories** - Catalog of exercise categories (chest, back, etc.)
2. **users** - User accounts
3. **user_body_measurements** - Weight and height tracking
4. **exercises** - Exercise bank (predefined + custom)
5. **workout_sessions** - Daily workout sessions
6. **workout_exercises** - Exercises performed in a session
7. **exercise_sets** - Sets with reps, weight, and times
8. **favorite_exercises_by_day** - Quick access exercises per day

### Predefined Exercises

The schema includes 45+ predefined exercises across categories:

- Chest (7 exercises)
- Back (7 exercises)
- Legs (8 exercises)
- Shoulders (6 exercises)
- Arms (7 exercises)
- Abs (6 exercises)
- Cardio (5 exercises)

Users can also create custom exercises.
