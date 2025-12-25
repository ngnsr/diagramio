export const SAMPLE_PROMPT = `
Create a sequence diagram for user login with email and password.
Include frontend, backend API, and database.
`;

export const SAMPLE_MERMAID = `
sequenceDiagram
  participant User
  participant Frontend
  participant API
  participant DB

  User->>Frontend: Enter email & password
  Frontend->>API: POST /login
  API->>DB: Validate credentials
  DB-->>API: User record
  API-->>Frontend: JWT token
  Frontend-->>User: Login success
`;
