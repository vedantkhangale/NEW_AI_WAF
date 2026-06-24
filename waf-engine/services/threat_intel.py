import asyncio
import httpx
from loguru import logger
from typing import Set

class ThreatIntelService:
    """
    Fetches live threat intelligence from open-source feeds (Emerging Threats, Abuse.ch, etc.)
    and populates the Redis IP reputation database.
    """
    def __init__(self, redis_client):
        self.redis = redis_client
        self.feeds = [
            # Feodo Tracker (Botnets/C2)
            {"url": "https://feodotracker.abuse.ch/downloads/ipblocklist.csv", "type": "csv", "skip_lines": 9, "ip_index": 1, "score": 1.0, "reason": "C2/Botnet IP"},
            # Emerging Threats Compromised IPs
            {"url": "https://rules.emergingthreats.net/blockrules/compromised-ips.txt", "type": "txt", "skip_lines": 0, "score": 0.9, "reason": "Compromised IP"},
            # CINS Army List
            {"url": "https://cinsarmy.com/list/ci-badguys.txt", "type": "txt", "skip_lines": 0, "score": 0.8, "reason": "Known Attacker"}
        ]
        self._running = False

    async def start(self):
        """Start the background task"""
        if self._running:
            return
        self._running = True
        logger.info("Starting Threat Intelligence Updater Task...")
        asyncio.create_task(self._update_loop())

    async def _update_loop(self):
        """Periodically update feeds every hour"""
        while self._running:
            try:
                await self._fetch_all_feeds()
            except Exception as e:
                logger.error(f"Error in Threat Intel updater: {e}")
            
            # Wait 1 hour before next update
            await asyncio.sleep(3600)

    async def _fetch_all_feeds(self):
        total_ips = 0
        async with httpx.AsyncClient(timeout=30.0) as client:
            for feed in self.feeds:
                try:
                    logger.info(f"Fetching Threat Intel from {feed['url']}...")
                    response = await client.get(feed['url'])
                    if response.status_code == 200:
                        ips_added = await self._process_feed(response.text, feed)
                        total_ips += ips_added
                        logger.info(f"Added {ips_added} IPs from {feed['url']}")
                except Exception as e:
                    logger.warning(f"Failed to fetch feed {feed['url']}: {e}")
        
        logger.info(f"Threat Intel Update Complete. Total Malicious IPs loaded: {total_ips}")

    async def _process_feed(self, content: str, feed_config: dict) -> int:
        lines = content.split('\n')
        if feed_config['skip_lines'] > 0:
            lines = lines[feed_config['skip_lines']:]
            
        count = 0
        for line in lines:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
                
            ip = ""
            if feed_config['type'] == 'csv':
                parts = line.split(',')
                if len(parts) > feed_config['ip_index']:
                    ip = parts[feed_config['ip_index']].strip()
            else:
                ip = line
                
            # Basic IPv4 validation
            if ip and ip.count('.') == 3:
                # Store in Redis: key="ip_rep:{ip}", value=risk_score (0.0 to 1.0)
                # We'll use the generic set_value but in reality you'd update the reputation hash
                # Using the existing Redis client method for setting string values
                await self.redis.redis.hset(f"ip:{ip}", mapping={
                    "reputation": str(1.0 - feed_config['score']), # In AegisX, 1.0 = good, 0.0 = bad
                    "reason": feed_config['reason']
                })
                # Set expiry to 24 hours
                await self.redis.redis.expire(f"ip:{ip}", 86400)
                count += 1
                
        return count

    def stop(self):
        self._running = False
