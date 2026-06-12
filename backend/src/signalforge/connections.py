"""Connection layer for the agentic WorkOS — SignalForge connects to the user's
work tools (JIRA, Grafana, PagerDuty, GitHub, …) through their MCP servers and
exposes them to the reasoning brain. Sessions are opened per call (stateless v1)."""

import asyncio
import json
from contextlib import asynccontextmanager
from typing import Awaitable, Callable, Optional

from pydantic import AnyUrl
from sqlmodel import Session

from mcp import ClientSession, StdioServerParameters
from mcp.client.auth import OAuthClientProvider, TokenStorage
from mcp.client.stdio import stdio_client
from mcp.client.sse import sse_client
from mcp.client.streamable_http import streamablehttp_client
from mcp.shared.auth import OAuthClientInformationFull, OAuthClientMetadata, OAuthToken

from .database import engine
from .models import Connection, ConnectionKind

CONNECT_TIMEOUT_S = 30
CALL_TIMEOUT_S = 120


def leaf_error(e: BaseException) -> str:
    """Unwrap ExceptionGroups (anyio TaskGroups) to the meaningful inner error."""
    while isinstance(e, BaseExceptionGroup) and e.exceptions:
        e = e.exceptions[0]
    return f"{type(e).__name__}: {e}"

OAUTH_REDIRECT_URI = "http://localhost:8000/api/oauth/callback"


class DBTokenStorage(TokenStorage):
    """Persists OAuth tokens + client registration in the Connection row."""

    def __init__(self, conn_id: int):
        self.conn_id = conn_id

    def _get(self) -> Optional[Connection]:
        with Session(engine) as s:
            return s.get(Connection, self.conn_id)

    def _save(self, field: str, value: Optional[str]) -> None:
        with Session(engine) as s:
            c = s.get(Connection, self.conn_id)
            if c:
                setattr(c, field, value)
                s.add(c)
                s.commit()

    async def get_tokens(self) -> Optional[OAuthToken]:
        c = self._get()
        return OAuthToken.model_validate_json(c.oauth_tokens) if c and c.oauth_tokens else None

    async def set_tokens(self, tokens: OAuthToken) -> None:
        self._save("oauth_tokens", tokens.model_dump_json())

    async def get_client_info(self) -> Optional[OAuthClientInformationFull]:
        c = self._get()
        return (
            OAuthClientInformationFull.model_validate_json(c.oauth_client_info)
            if c and c.oauth_client_info else None
        )

    async def set_client_info(self, client_info: OAuthClientInformationFull) -> None:
        self._save("oauth_client_info", client_info.model_dump_json())


async def _no_redirect(_url: str) -> None:
    raise RuntimeError("Authorization required — open this connection and click Sign in.")


async def _no_callback() -> tuple[str, Optional[str]]:
    raise RuntimeError("Authorization required — open this connection and click Sign in.")


def build_oauth_provider(
    conn: Connection,
    redirect_handler: Callable[[str], Awaitable[None]] = _no_redirect,
    callback_handler: Callable[[], Awaitable[tuple[str, Optional[str]]]] = _no_callback,
) -> OAuthClientProvider:
    return OAuthClientProvider(
        server_url=conn.url,
        client_metadata=OAuthClientMetadata(
            client_name="SignalForge",
            redirect_uris=[AnyUrl(OAUTH_REDIRECT_URI)],
            grant_types=["authorization_code", "refresh_token"],
            response_types=["code"],
            token_endpoint_auth_method="none",
        ),
        storage=DBTokenStorage(conn.id),
        redirect_handler=redirect_handler,
        callback_handler=callback_handler,
    )


@asynccontextmanager
async def _session(conn: Connection, auth: Optional[OAuthClientProvider] = None):
    if conn.kind in (ConnectionKind.mcp_http, ConnectionKind.mcp_sse):
        if not conn.url:
            raise ValueError(f"Connection '{conn.name}' has no URL")
        headers = json.loads(conn.headers) if conn.headers else None
        # Stored OAuth tokens take over auth (refresh handled by the provider)
        if auth is None and conn.oauth_tokens:
            auth = build_oauth_provider(conn)
        client = (
            streamablehttp_client(conn.url, headers=headers, auth=auth)
            if conn.kind == ConnectionKind.mcp_http
            else sse_client(conn.url, headers=headers, auth=auth)
        )
        async with client as streams:
            read, write = streams[0], streams[1]
            async with ClientSession(read, write) as session:
                await session.initialize()
                yield session
    else:
        if not conn.command:
            raise ValueError(f"Connection '{conn.name}' has no command")
        params = StdioServerParameters(
            command=conn.command,
            args=json.loads(conn.args) if conn.args else [],
            env=json.loads(conn.env) if conn.env else None,
        )
        async with stdio_client(params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                yield session


async def list_tools(conn: Connection, auth: Optional[OAuthClientProvider] = None,
                     timeout_s: int = CONNECT_TIMEOUT_S) -> list[dict]:
    async with asyncio.timeout(timeout_s):
        async with _session(conn, auth) as s:
            res = await s.list_tools()
            return [
                {"name": t.name, "description": t.description, "input_schema": t.inputSchema}
                for t in res.tools
            ]


async def call_tool(conn: Connection, tool: str, arguments: dict) -> dict:
    async with asyncio.timeout(CALL_TIMEOUT_S):
        async with _session(conn) as s:
            res = await s.call_tool(tool, arguments)
            content: list[str] = []
            for c in res.content:
                if c.type == "text":
                    content.append(c.text)
                else:
                    content.append(f"[{c.type} content omitted]")
            return {"is_error": bool(res.isError), "content": content}
