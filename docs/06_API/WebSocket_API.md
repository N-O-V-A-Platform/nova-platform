# WebSocket API Documentation

## 1. Overview
WebSockets are utilized for real-time live lecture interaction, instant Q&A streaming, and live notifications.

## 2. Event API

### Connection
`WS /ws/live` - Join WebSocket server.

### Client-to-Server Events
* `join_session` - Joins a specific active lecture room.
  ```json
  { "session_id": "uuid-string" }
  ```
* `send_question` - Post a live classroom question.
  ```json
  { "session_id": "uuid-string", "content": "..." }
  ```

### Server-to-Client Events
* `new_question` - Dispatched to lecturer when a student asks a live question.
* `stream_token` - Token-by-token RAG answers.
* `question_escalated` - Live notification when a query has been escalated.
