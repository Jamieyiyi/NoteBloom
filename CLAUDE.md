# NotetBloom

## Quick Reference
- Never send title:slug to WP API, only real titles + re-GET verify.
- Always send User-Agent header on WP REST, or 403.
- Never commit secrets; .env is local-only.

## Overview
A beautiful Markdown notebook that turns your notes into elegant HTML documents.

## Project Structure
- `src/main/java/` - Application source code
- `src/main/resources/` - Configuration files
- `src/test/java/` - Test source code
- `build.gradle` - Build configuration

## Architecture
- `controller/` - REST endpoints
- `service/` - Business logic
- `repository/` - Data access layer
- `model/` - Domain objects
- `dto/` - Data transfer objects
- `dao/` -  Query result objects and database projections
- `config/` - Configuration classes

## Conventions
- Use constructor injection over field injection
- Follow layered architecture (Controller → Service → Repository)
- Use DTOs for API request/response, not entities
- Handle exceptions with @ControllerAdvice
- Use Bean Validation annotations for input validation

## Naming Conventions
Follow the naming conventions below when creating new classes, interfaces, and files.

### Entity Naming
- Entity class names should be derived from the database table name.
- Convert table names from snake_case to PascalCase.
- Append `Model` suffix to entity classes.
- Entity classes must only represent database entities.
- Do not use entities directly in Controller responses.

### Repository Naming

- Repository interfaces should use the domain name without suffixes.
- Do not include `Model` suffix in Repository names.
- Repository names should follow the format: {Domain}Repository

### Service Layer Naming
- Service layer must be designed as an interface.
- Service interface names should follow the format: {Feature}Service
- Service implementation classes should append Impl suffix: {Feature}ServiceImpl

### Controller Naming
- Controller classes should represent the managed resource.
- Controller names should follow the format: {Resource}Controller

### DAO Naming
- DAO classes are used for query projections only.
- DAO names should describe the query purpose.
- Append `Dao` suffix.

### DTO Naming
- Request DTOs should use Request suffix: {Feature}Request
- Response DTOs should use Response suffix: {Feature}Response

### Enum Naming
- Enum class names should use PascalCase.
- Enum values should use uppercase snake_case.

## Testing
- Unit test services with Mockito
- Integration test with @SpringBootTest
- Use @WebMvcTest for controller tests
- Use Testcontainers for database tests

## Commands
- `./mvnw spring-boot:run` - Start application
- `./mvnw test` - Run tests
- `./mvnw package` - Build JAR
- `./gradlew bootRun` - Start (Gradle)
- `./gradlew test` - Run tests (Gradle)