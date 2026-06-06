from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .text import strip_html


def discourse_get(url: str, *, user_agent: str, timeout: float) -> dict:
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": user_agent,
        },
    )
    with urlopen(request, timeout=timeout) as response:
        return json.load(response)


def fetch_latest_topics(
    *,
    base_url: str,
    page: int,
    user_agent: str,
    timeout: float,
) -> list[dict]:
    url = f"{base_url}/latest.json?{urlencode({'page': page})}"
    payload = discourse_get(url, user_agent=user_agent, timeout=timeout)
    topic_list = payload.get("topic_list", {})
    return topic_list.get("topics", [])


def fetch_topic_details(
    *,
    base_url: str,
    topic_id: int,
    slug: str,
    user_agent: str,
    timeout: float,
) -> dict:
    url = f"{base_url}/t/{slug}/{topic_id}.json"
    return discourse_get(url, user_agent=user_agent, timeout=timeout)


def fetch_post_batch(
    *,
    base_url: str,
    topic_id: int,
    post_ids: list[int],
    user_agent: str,
    timeout: float,
) -> list[dict]:
    query = urlencode([("post_ids[]", post_id) for post_id in post_ids])
    url = f"{base_url}/t/{topic_id}/posts.json?{query}"
    payload = discourse_get(url, user_agent=user_agent, timeout=timeout)
    post_stream = payload.get("post_stream", {})
    return post_stream.get("posts", [])


def iter_topic_posts(
    *,
    base_url: str,
    topic: dict,
    user_agent: str,
    timeout: float,
    delay_seconds: float,
    max_posts_per_topic: int,
) -> Iterable[dict]:
    topic_id = int(topic["id"])
    slug = topic.get("slug") or str(topic_id)
    details = fetch_topic_details(
        base_url=base_url,
        topic_id=topic_id,
        slug=slug,
        user_agent=user_agent,
        timeout=timeout,
    )

    post_stream = details.get("post_stream", {})
    stream_ids = list(post_stream.get("stream", []))
    if max_posts_per_topic > 0:
        stream_ids = stream_ids[:max_posts_per_topic]

    initial_posts = {post["id"]: post for post in post_stream.get("posts", [])}
    collected: dict[int, dict] = dict(initial_posts)

    missing_ids = [post_id for post_id in stream_ids if post_id not in collected]
    for start in range(0, len(missing_ids), 100):
        batch_ids = missing_ids[start : start + 100]
        if not batch_ids:
            continue
        batch_posts = fetch_post_batch(
            base_url=base_url,
            topic_id=topic_id,
            post_ids=batch_ids,
            user_agent=user_agent,
            timeout=timeout,
        )
        for post in batch_posts:
            collected[post["id"]] = post
        time.sleep(delay_seconds)

    for post_id in stream_ids:
        post = collected.get(post_id)
        if post is not None:
            yield post


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch TriTalk forum posts.")
    parser.add_argument(
        "--base-url",
        default="https://forum.tritalk.co.uk",
        help="Discourse forum base URL.",
    )
    parser.add_argument(
        "--pages",
        type=int,
        default=3,
        help="Number of latest.json pages to scan.",
    )
    parser.add_argument(
        "--max-topics",
        type=int,
        default=60,
        help="Maximum number of topics to fetch in total.",
    )
    parser.add_argument(
        "--max-posts-per-topic",
        type=int,
        default=120,
        help="Cap posts per topic. Use 0 for no cap.",
    )
    parser.add_argument(
        "--output",
        default="tritalk_gpt/data/posts.jsonl",
        help="Output JSONL path.",
    )
    parser.add_argument(
        "--delay-seconds",
        type=float,
        default=0.5,
        help="Delay between batch requests to be polite to the forum.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=20.0,
        help="Request timeout in seconds.",
    )
    parser.add_argument(
        "--user-agent",
        default="tritalk-gpt-corpus-builder/0.1",
        help="User-Agent header for requests.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    topics: list[dict] = []
    try:
        for page in range(args.pages):
            page_topics = fetch_latest_topics(
                base_url=args.base_url.rstrip("/"),
                page=page,
                user_agent=args.user_agent,
                timeout=args.timeout,
            )
            topics.extend(page_topics)
            if len(topics) >= args.max_topics:
                break
            time.sleep(args.delay_seconds)
    except (HTTPError, URLError, TimeoutError) as exc:
        print(f"Failed to fetch topic list: {exc}", file=sys.stderr)
        return 1

    topics = topics[: args.max_topics]
    rows_written = 0

    try:
        with output_path.open("w", encoding="utf-8") as handle:
            for index, topic in enumerate(topics, start=1):
                topic_id = int(topic["id"])
                title = topic.get("title", "")
                print(
                    f"[{index}/{len(topics)}] topic {topic_id}: {title}",
                    file=sys.stderr,
                )
                try:
                    posts = iter_topic_posts(
                        base_url=args.base_url.rstrip("/"),
                        topic=topic,
                        user_agent=args.user_agent,
                        timeout=args.timeout,
                        delay_seconds=args.delay_seconds,
                        max_posts_per_topic=args.max_posts_per_topic,
                    )
                    for post in posts:
                        text = strip_html(post.get("cooked", ""))
                        if not text:
                            continue
                        row = {
                            "topic_id": topic_id,
                            "topic_title": title,
                            "topic_slug": topic.get("slug"),
                            "post_id": post.get("id"),
                            "post_number": post.get("post_number"),
                            "username": post.get("username"),
                            "created_at": post.get("created_at"),
                            "reply_count": topic.get("reply_count"),
                            "url": f"{args.base_url.rstrip('/')}/t/{topic.get('slug')}/{topic_id}/{post.get('post_number')}",
                            "text": text,
                        }
                        handle.write(json.dumps(row, ensure_ascii=True) + "\n")
                        rows_written += 1
                except (HTTPError, URLError, TimeoutError) as exc:
                    print(
                        f"Skipping topic {topic_id} because fetch failed: {exc}",
                        file=sys.stderr,
                    )
                time.sleep(args.delay_seconds)
    except (HTTPError, URLError, TimeoutError) as exc:
        print(f"Failed while fetching topic posts: {exc}", file=sys.stderr)
        return 1

    print(f"Wrote {rows_written} posts to {output_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
