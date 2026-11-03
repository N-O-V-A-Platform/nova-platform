from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.user_sockets: dict[str, set[WebSocket]] = defaultdict(set)
        self.rooms: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, websocket: WebSocket, user_id: str, rooms: list[str] | None = None) -> None:
        await websocket.accept()
        self.user_sockets[user_id].add(websocket)
        for room in rooms or []:
            self.rooms[room].add(websocket)

    def disconnect(self, websocket: WebSocket, user_id: str) -> None:
        sockets = self.user_sockets.get(user_id)
        if sockets and websocket in sockets:
            sockets.remove(websocket)
            if not sockets:
                self.user_sockets.pop(user_id, None)
        empty_rooms = []
        for room, members in self.rooms.items():
            members.discard(websocket)
            if not members:
                empty_rooms.append(room)
        for room in empty_rooms:
            self.rooms.pop(room, None)

    def join_room(self, websocket: WebSocket, room: str) -> None:
        self.rooms[room].add(websocket)

    async def send_personal(self, websocket: WebSocket, event: str, data: Any) -> None:
        await websocket.send_json({"event": event, "data": data})

    async def send_to_user(self, user_id: str, event: str, data: Any) -> None:
        for socket in list(self.user_sockets.get(str(user_id), set())):
            try:
                await socket.send_json({"event": event, "data": data})
            except Exception:
                self.disconnect(socket, str(user_id))

    async def send_to_users(self, user_ids: list[str], event: str, data: Any) -> None:
        for user_id in user_ids:
            await self.send_to_user(str(user_id), event, data)

    async def send_to_room(self, room: str, event: str, data: Any) -> None:
        for socket in list(self.rooms.get(room, set())):
            try:
                await socket.send_json({"event": event, "data": data})
            except Exception:
                continue


manager = ConnectionManager()
