"""MinerU Agent lightweight API integration for screenshot OCR."""
import time
import httpx

MINERU_BASE = "https://mineru.net/api/v1/agent"


async def upload_and_parse(file_bytes: bytes, filename: str, language: str = "ch") -> str:
    """Upload a file to MinerU for parsing and return extracted markdown.

    Flow:
    1. POST /parse/file → get task_id + signed upload URL
    2. PUT file to OSS signed URL
    3. Poll GET /parse/{task_id} until done
    4. Fetch markdown content from CDN URL
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Step 1: Create parse task and get signed upload URL
        resp = await client.post(
            f"{MINERU_BASE}/parse/file",
            json={"file_name": filename, "language": language},
        )
        resp.raise_for_status()
        result = resp.json()
        if result.get("code") != 0:
            raise RuntimeError(f"MinerU create task failed: {result.get('msg')}")

        task_id = result["data"]["task_id"]
        file_url = result["data"]["file_url"]

        # Step 2: Upload file to OSS via signed URL
        put_resp = await client.put(file_url, content=file_bytes)
        if put_resp.status_code not in (200, 201):
            raise RuntimeError(f"MinerU file upload failed: HTTP {put_resp.status_code}")

        # Step 3: Poll for result
        markdown_text = await _poll_result(client, task_id)
        return markdown_text


async def _poll_result(
    client: httpx.AsyncClient,
    task_id: str,
    timeout: int = 120,
    interval: int = 3,
) -> str:
    """Poll MinerU for parsing result."""
    import asyncio

    start = time.time()
    while time.time() - start < timeout:
        resp = await client.get(f"{MINERU_BASE}/parse/{task_id}")
        resp.raise_for_status()
        result = resp.json()
        state = result["data"]["state"]

        if state == "done":
            markdown_url = result["data"]["markdown_url"]
            md_resp = await client.get(markdown_url)
            md_resp.raise_for_status()
            return md_resp.text

        if state == "failed":
            err_msg = result["data"].get("err_msg", "Unknown error")
            raise RuntimeError(f"MinerU parsing failed: {err_msg}")

        await asyncio.sleep(interval)

    raise TimeoutError(f"MinerU parsing timed out after {timeout}s for task {task_id}")
