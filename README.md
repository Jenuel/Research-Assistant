# Research-Assistant

This proeject is developed with the purpose of helping students to retrieve relevant information from sources with ease.

## Tech Stack
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)![Langchain](https://img.shields.io/badge/langchain-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)


# Databases
docker run --name postgresdb -e POSTGRES_PASSWORD=password -p 5432:5432 -v postgres-data:/var/lib/postgresql/data -d postgres
docker run -d --name vecdb -v ./chroma-data:/data -p 8080:8000 chromadb/chroma