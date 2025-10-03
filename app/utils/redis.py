# app/clients/redis_client.py
import logging
import time

import redis
from redis import ConnectionPool
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.config import settings

logger = logging.getLogger(__name__)

# Create connection pool for better performance (sync client)
redis_pool = ConnectionPool(
    host=settings.REDIS_HOST,
    port=int(settings.REDIS_PORT),
    db=int(settings.REDIS_DB),
    decode_responses=True,
    retry_on_timeout=True,
    socket_timeout=10,  # Increased timeout for better stability
    socket_connect_timeout=10,  # Increased connection timeout
    socket_keepalive=True,  # Enable TCP keepalive
    socket_keepalive_options={},
    health_check_interval=30,
    max_connections=100,  # Increased for better concurrency
)

redis_client = redis.Redis(connection_pool=redis_pool)

# Async Redis client for WebSocket pub/sub operations
try:
    import redis.asyncio as aioredis

    redis_async_client = aioredis.Redis(
        host=settings.REDIS_HOST,
        port=int(settings.REDIS_PORT),
        db=int(settings.REDIS_DB),
        decode_responses=True,
        retry_on_timeout=True,
        socket_timeout=10,  # Increased timeout for better stability
        socket_connect_timeout=10,  # Increased connection timeout
        socket_keepalive=True,  # Enable TCP keepalive
        socket_keepalive_options={},
        health_check_interval=30,
        max_connections=50,  # Increased for better concurrency with SSE connections
    )
    logger.info("Async Redis client initialized successfully")
except ImportError:
    logger.warning("aioredis not available, async Redis operations will be limited")
    redis_async_client = None


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.2, min=0.2, max=2),
    retry=retry_if_exception_type(redis.exceptions.ConnectionError),
)
def get_redis_client():
    """
    Get Redis client with error handling and retry.
    """
    try:
        # quick ping to ensure connection usable
        redis_client.ping()
        logger.debug("Redis sync client connection established successfully")
        return redis_client
    except Exception as e:
        logger.exception("Redis connection error (pool): %s", e)
        # Fallback to fresh connection (no pool)
        fallback = redis.Redis(
            host=settings.REDIS_HOST,
            port=int(settings.REDIS_PORT),
            db=int(settings.REDIS_DB),
            decode_responses=True,
            socket_connect_timeout=10,
            socket_timeout=10,
        )
        try:
            fallback.ping()
            logger.warning("Using fallback redis connection (no pool). This indicates connection pool exhaustion.")
            return fallback
        except Exception as e2:
            logger.exception("Fallback redis connection also failed: %s", e2)
            raise


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.2, min=0.2, max=2),
    retry=retry_if_exception_type(redis.exceptions.ConnectionError),
)
async def get_async_redis_client():
    """
    Get async Redis client with error handling and retry.
    """
    if redis_async_client is None:
        raise RuntimeError("Async Redis client not available. Please install aioredis.")

    try:
        # quick ping to ensure connection usable
        await redis_async_client.ping()
        logger.debug("Async Redis client connection established successfully")
        return redis_async_client
    except Exception as e:
        logger.exception("Async Redis connection error (pool): %s", e)
        # Try to create fresh connection
        try:
            fresh_client = aioredis.Redis(
                host=settings.REDIS_HOST,
                port=int(settings.REDIS_PORT),
                db=int(settings.REDIS_DB),
                decode_responses=True,
                socket_connect_timeout=10,
                socket_timeout=10,
                socket_keepalive=True,
                socket_keepalive_options={},
            )
            await fresh_client.ping()
            logger.warning("Using fresh async redis connection. This indicates connection pool exhaustion.")
            return fresh_client
        except Exception as e2:
            logger.exception("Fresh async redis connection also failed: %s", e2)
            raise


async def publish_to_user_channel(user_id: str, message: dict) -> bool:
    """
    Publish message to user's Redis channel using hierarchical pattern.
    Channel format: user:{user_id}:{message_type}
    """
    try:
        client = await get_async_redis_client()
        channel = f"user:{user_id}:{message.get('type', 'notification')}"
        import json

        data = json.dumps(message)
        result = await client.publish(channel, data)
        logger.debug("Published to %s (subscribers=%s): %s", channel, result, message)
        return True
    except Exception as e:
        logger.exception("Failed to publish to user channel %s: %s", user_id, e)
        return False


async def get_recent_messages_for_user(user_id: str, limit: int = 10) -> list:
    """
    Get recent messages for a user from Redis for replay functionality.
    This is used when a WebSocket client reconnects.
    """
    try:
        client = await get_async_redis_client()
        # Get all task progress keys for this user
        pattern = f"task_progress:*:{user_id}"
        keys = await client.keys(pattern)

        messages = []
        for key in keys[:limit]:  # Limit to prevent overwhelming
            try:
                data = await client.hgetall(key)
                if data:
                    # Extract task_id from key: task_progress:{task_id}:{user_id}
                    parts = key.split(":")
                    task_id = parts[1] if len(parts) >= 3 else None
                    message = {
                        "type": "task_progress",
                        "data": {**data, "task_id": task_id},
                    }
                    messages.append(message)
            except Exception as e:
                logger.exception("Failed to read message from key %s: %s", key, e)

        # Sort by last_update timestamp (most recent first)
        messages.sort(key=lambda x: x["data"].get("last_update", ""), reverse=True)
        return messages[:limit]
    except Exception as e:
        logger.exception("Failed to get recent messages for user %s: %s", user_id, e)
        return []


def get_connection_pool_info() -> dict:
    """
    Get information about Redis connection pools for monitoring.
    """
    try:
        sync_info = {
            "pool_size": redis_pool.max_connections,
            "created_connections": getattr(redis_pool, '_created_connections', 0),
            "available": getattr(redis_pool, '_available_connections', []),
        }

        async_info = None
        if redis_async_client:
            # For async client, we can't easily get pool info without more complex introspection
            async_info = {
                "configured_max": 50,  # From our configuration
                "status": "active"
            }

        return {
            "sync_pool": sync_info,
            "async_pool": async_info,
            "timestamp": time.time()
        }
    except Exception as e:
        logger.exception("Failed to get connection pool info: %s", e)
        return {"error": str(e)}


def cleanup_stale_connections():
    """
    Attempt to cleanup any stale connections in the pools.
    This is a best-effort cleanup function.
    """
    try:
        # For sync pool, disconnect idle connections
        if hasattr(redis_pool, 'disconnect'):
            redis_pool.disconnect()
            logger.info("Cleaned up sync Redis connection pool")

        # For async pool, we can't easily cleanup without more complex logic
        logger.info("Connection cleanup completed")
    except Exception as e:
        logger.exception("Error during connection cleanup: %s", e)
