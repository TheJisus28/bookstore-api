import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('Workout Tracker API')
  .setDescription('API for personal workout tracking application')
  .setVersion('1.0')
  .addBearerAuth()
  .addTag('health', 'Health check endpoints')
  .addTag('auth', 'Authentication - Register and login')
  .addTag('users', 'User profile management')
  .addTag('exercises', 'Exercise bank - Search and manage exercises')
  .addTag('workouts', 'Workout sessions, exercises, and sets')
  .addTag('body-measurements', 'Track weight and height over time')
  .addTag('favorites', 'Quick access exercises by day of week')
  .build();
