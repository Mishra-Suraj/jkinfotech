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

## Flow of the project

The JK InfoTech application follows a logical flow for handling user requests, document management, and data ingestion:

1. **Authentication Flow**:
   - Users register through the auth controller
   - Login generates JWT tokens for authentication
   - The JWT strategy validates tokens for protected routes
   - Refresh tokens allow for seamless re-authentication

2. **Document Management Flow**:
   - Authenticated users can create, read, update or delete documents
   - Documents are stored in the database with metadata
   - Role-based access controls what actions users can perform on documents
   - The documents service handles business logic while the controller manages HTTP requests

3. **Data Ingestion Flow**:
   - The ingestion module processes incoming data from various sources
   - Ingestion jobs are created and tracked in the database
   - The system processes and transforms data according to configured rules
   - Processed data is stored as documents in the system

4. **User Management Flow**:
   - Administrators can manage user accounts and permissions
   - Users can update their profile information
   - The users service handles user-related business logic

5. **System Architecture**:
   - NestJS modules provide clear separation of concerns
   - Controllers handle HTTP requests and route them to appropriate services
   - Services contain the business logic and interact with repositories
   - Entities define the database schema
   - DTOs ensure proper data validation and transformation

This modular approach allows for maintainable, scalable code and clear separation of responsibilities throughout the application.

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

# test coverage
$ npm run test:cov
```

## Notes

1 - Use docker official postgres docker container to connect to the NestJS app on default port.
2 - Create a default Database called "postgres" before running the NestJS app.
3 - Swagger is available at localhost:3000/api
4 - Documentation for the application is placed inside the files itself like JSDoc.
5 - Unit tests are located under their respective folders instead of a seperate folder. This ensures that the tests can be accessed easily without changing directories frequently. 

## License

This is a demo project. It doesn't requires a license.
