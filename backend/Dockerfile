FROM gradle:9.1.0-jdk25 AS build
WORKDIR /app
COPY build.gradle settings.gradle ./
COPY src ./src
RUN gradle bootJar --no-daemon -PskipFrontend

FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/build/libs/notebloom-backend-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
