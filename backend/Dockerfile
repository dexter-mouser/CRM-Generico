# Compilación
FROM maven:3.9-eclipse-temurin-21 AS compilacion
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q -DskipTests package

# Ejecución: imagen mínima, sin privilegios
FROM eclipse-temurin:21-jre
RUN useradd --system --uid 1001 generico
WORKDIR /app
COPY --from=compilacion /app/target/generico-backend-*.jar app.jar
USER 1001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
