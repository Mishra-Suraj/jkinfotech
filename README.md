# JK InfoTech

A document and information management system built with NestJS.

## Description

JK InfoTech is a comprehensive document management and data ingestion platform built using the [Nest](https://github.com/nestjs/nest) framework. The application provides functionality for document management, data ingestion from various sources, user authentication, and more.

## Project Structure

The project follows a modular architecture based on NestJS best practices:

```
src/
├── app.module.ts             # Main application module
├── main.ts                   # Application entry point
│
├── auth/                     # Authentication module
│   ├── auth.controller.ts    # Handles authentication endpoints
│   ├── auth.service.ts       # Authentication business logic
│   ├── jwt.strategy.ts       # JWT authentication strategy
│   ├── dto/                  # Data Transfer Objects for auth
│   └── guards/               # Authentication guards
│
├── database/                 # Database configuration
│   └── database.config.ts    # Database connection settings
│
├── documents/                # Document management module
│   ├── documents.controller.ts  # Document API endpoints
│   ├── documents.service.ts     # Document business logic
│   └── dto/                     # Document DTOs
│
├── entities/                 # Database entities
│   ├── document.entity.ts    # Document database model
│   ├── ingestion-job.entity.ts  # Ingestion job database model
│   ├── refresh-token.entity.ts  # Refresh token database model
│   └── user.entity.ts        # User database model
│
├── ingestion/                # Data ingestion module
│   ├── ingestion.controller.ts  # Ingestion API endpoints
│   ├── ingestion.service.ts     # Ingestion business logic
│   └── dto/                     # Ingestion DTOs
│
└── users/                    # User management module
    ├── users.controller.ts   # User API endpoints
    ├── users.service.ts      # User business logic
    └── dto/                  # User DTOs
```

### Key Features

- **Authentication**: Secure JWT-based authentication with refresh token support
- **Document Management**: Create, read, update, and delete document functionality
- **Data Ingestion**: Support for various data sources including documents, emails, APIs, and databases
- **User Management**: User registration, profile management, and role-based access control

## Project Setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Notes

1 - There are currently 46 tests passings. Out of total 8 test case suits, 6 are passing.
2 - Use docker official postgres docker container to connec to the NestJS app on default port.
3 - Create a default Database called "postgres" before running the NestJS app.
4 - Swagger is available at localhost:3000/api

## License

This is a demo project. It doesn't requires a license.
