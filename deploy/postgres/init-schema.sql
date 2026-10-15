-- Runs once when the Docker PostgreSQL volume is first initialised.
-- The app connects with currentSchema=notebloom, and Liquibase does not create schemas itself.
CREATE SCHEMA IF NOT EXISTS notebloom;
