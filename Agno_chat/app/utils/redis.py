import time

import redis
from redis import ConnectionPool
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.config import settings


def _get_redis_auth_kwargs():
    kwargs = {}
    if getattr(settings, "REDIS_USER", None):
        kwargs["username"] = settings.REDIS_USER
    if getattr(settings, "REDIS_PASSWORD", None):
        kwargs["password"] = settings.REDIS_PASSWORD
    return kwargs

redis_pool = ConnectionPool(
    host=settings.REDIS_HOST,
    port=int(settings.REDIS_PORT),
    db=int(settings.REDIS_DB_CHAT),
    decode_responses=True,
    retry_on_timeout=True,
    socket_timeout=10,
    socket_connect_timeout=10,
    socket_keepalive=True,
    health_check_interval=30,
    max_connections=100,
    **_get_redis_auth_kwargs()
)

redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=int(settings.REDIS_PORT),
    decode_responses=True,
    db=int(settings.REDIS_DB_CHAT),
    **_get_redis_auth_kwargs()
)

try:
    import redis.asyncio as aioredis
    redis_async_client = aioredis.Redis(
        host=settings.REDIS_HOST,
        port=int(settings.REDIS_PORT),
        db=int(settings.REDIS_DB_CHAT),
        decode_responses=True,
        retry_on_timeout=True,
        socket_timeout=10,
        socket_connect_timeout=10,
        socket_keepalive=True,
        health_check_interval=30,
        max_connections=50,
        **_get_redis_auth_kwargs()
    )
except ImportError:
    redis_async_client = None

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.2, min=0.2, max=2),
    retry=retry_if_exception_type(redis.exceptions.ConnectionError),
)
def get_redis_client():
    redis_client.ping()
    return redis_client

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.2, min=0.2, max=2),
    retry=retry_if_exception_type(redis.exceptions.ConnectionError),
)
async def get_async_redis_client():
    if redis_async_client is None:
        raise RuntimeError("Async Redis client not available. Please install aioredis.")
    await redis_async_client.ping()
    return redis_async_client

async def publish_to_user_channel(user_id: str, message: dict) -> bool:
    try:
        client = await get_async_redis_client()
        channel = f"user:{user_id}:{message.get('type', 'notification')}"
        import json
        data = json.dumps(message)
        await client.publish(channel, data)
        return True
    except Exception:
        return False

async def get_recent_messages_for_user(user_id: str, limit: int = 10) -> list:
    try:
        client = await get_async_redis_client()
        pattern = f"task_progress:*:{user_id}"
        keys = await client.keys(pattern)
        messages = []
        for key in keys[:limit]:
            data = await client.hgetall(key)
            if data:
                parts = key.split(":")
                task_id = parts[1] if len(parts) >= 3 else None
                message = {
                    "type": "task_progress",
                    "data": {**data, "task_id": task_id},
                }
                messages.append(message)
        messages.sort(key=lambda x: x["data"].get("last_update", ""), reverse=True)
        return messages[:limit]
    except Exception:
        return []

def get_connection_pool_info() -> dict:
    sync_info = {
        "pool_size": redis_pool.max_connections,
    }
    async_info = None
    if redis_async_client:
        async_info = {
            "configured_max": 50,
            "status": "active"
        }
    return {
        "sync_pool": sync_info,
        "async_pool": async_info,
        "timestamp": time.time()
    }

def cleanup_stale_connections():
    if hasattr(redis_pool, 'disconnect'):
        redis_pool.disconnect()
