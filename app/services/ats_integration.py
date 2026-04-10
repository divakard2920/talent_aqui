import httpx
from abc import ABC, abstractmethod


class ATSIntegration(ABC):
    """Abstract base class for ATS integrations."""

    @abstractmethod
    async def fetch_candidates(self, job_id: str | None = None) -> list[dict]:
        """Fetch candidates from the ATS."""
        pass

    @abstractmethod
    async def fetch_jobs(self) -> list[dict]:
        """Fetch open jobs from the ATS."""
        pass

    @abstractmethod
    async def update_candidate_status(
        self, candidate_id: str, status: str
    ) -> bool:
        """Update candidate status in the ATS."""
        pass


class GreenhouseIntegration(ATSIntegration):
    """Integration with Greenhouse ATS."""

    BASE_URL = "https://harvest.greenhouse.io/v1"

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Basic {api_key}",
            "Content-Type": "application/json",
        }

    async def fetch_candidates(self, job_id: str | None = None) -> list[dict]:
        """Fetch candidates from Greenhouse."""
        async with httpx.AsyncClient() as client:
            url = f"{self.BASE_URL}/candidates"
            params = {}
            if job_id:
                params["job_id"] = job_id

            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()

    async def fetch_jobs(self) -> list[dict]:
        """Fetch open jobs from Greenhouse."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/jobs",
                headers=self.headers,
                params={"status": "open"},
            )
            response.raise_for_status()
            return response.json()

    async def update_candidate_status(
        self, candidate_id: str, status: str
    ) -> bool:
        """Update candidate status in Greenhouse."""
        # Greenhouse uses application stage updates
        # This is a simplified implementation
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{self.BASE_URL}/candidates/{candidate_id}",
                headers=self.headers,
                json={"status": status},
            )
            return response.status_code == 200


class LeverIntegration(ATSIntegration):
    """Integration with Lever ATS."""

    BASE_URL = "https://api.lever.co/v1"

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    async def fetch_candidates(self, job_id: str | None = None) -> list[dict]:
        """Fetch candidates (opportunities) from Lever."""
        async with httpx.AsyncClient() as client:
            url = f"{self.BASE_URL}/opportunities"
            params = {}
            if job_id:
                params["posting_id"] = job_id

            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()
            return data.get("data", [])

    async def fetch_jobs(self) -> list[dict]:
        """Fetch open postings from Lever."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/postings",
                headers=self.headers,
                params={"state": "published"},
            )
            response.raise_for_status()
            data = response.json()
            return data.get("data", [])

    async def update_candidate_status(
        self, candidate_id: str, status: str
    ) -> bool:
        """Update candidate stage in Lever."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.BASE_URL}/opportunities/{candidate_id}/stage",
                headers=self.headers,
                json={"stage": status},
            )
            return response.status_code == 200


def get_ats_integration(ats_type: str, api_key: str) -> ATSIntegration:
    """Factory function to get the appropriate ATS integration."""
    integrations = {
        "greenhouse": GreenhouseIntegration,
        "lever": LeverIntegration,
    }

    if ats_type.lower() not in integrations:
        raise ValueError(f"Unsupported ATS type: {ats_type}")

    return integrations[ats_type.lower()](api_key)
