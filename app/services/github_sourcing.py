import httpx
from dataclasses import dataclass
from datetime import datetime

from app.services.azure_openai import azure_openai_service


@dataclass
class GitHubProfile:
    username: str
    name: str | None
    email: str | None
    bio: str | None
    location: str | None
    company: str | None
    blog: str | None
    public_repos: int
    followers: int
    following: int
    created_at: str
    profile_url: str
    avatar_url: str
    hireable: bool | None
    languages: list[str]
    top_repositories: list[dict]
    total_stars: int
    contribution_stats: dict | None
    linkedin_url: str | None = None
    twitter_url: str | None = None
    social_accounts: list[dict] | None = None
    ai_summary: str | None = None
    skill_assessment: dict | None = None


class GitHubSourcingService:
    """Service for sourcing developer candidates from GitHub."""

    BASE_URL = "https://api.github.com"

    def __init__(self, access_token: str | None = None):
        self.access_token = access_token
        self.headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if access_token:
            self.headers["Authorization"] = f"Bearer {access_token}"

    async def search_developers(
        self,
        skills: list[str] | None = None,
        location: str | None = None,
        min_repos: int | None = None,
        min_followers: int | None = None,
        language: str | None = None,
        max_results: int = 30,
    ) -> list[dict]:
        """
        Search for developers matching criteria.

        Uses OR logic for skills - searches for each skill separately
        and combines results to find developers with ANY of the skills.
        """
        base_query_parts = ["type:user"]

        if location:
            base_query_parts.append(f"location:{location}")

        if min_repos:
            base_query_parts.append(f"repos:>={min_repos}")

        if min_followers:
            base_query_parts.append(f"followers:>={min_followers}")

        if language:
            base_query_parts.append(f"language:{language}")

        base_query = " ".join(base_query_parts)

        all_results = {}  # Use dict to deduplicate by username

        async with httpx.AsyncClient() as client:
            # If skills provided, search for each skill separately (OR logic)
            if skills and len(skills) > 0:
                for skill in skills[:5]:  # Limit to 5 skills to avoid too many API calls
                    query = f"{base_query} {skill}"
                    try:
                        response = await client.get(
                            f"{self.BASE_URL}/search/users",
                            headers=self.headers,
                            params={
                                "q": query,
                                "per_page": min(max_results, 30),  # Fewer per skill
                                "sort": "followers",
                                "order": "desc",
                            },
                        )
                        response.raise_for_status()
                        data = response.json()

                        # Add to results, deduplicating by login
                        for user in data.get("items", []):
                            username = user.get("login")
                            if username and username not in all_results:
                                all_results[username] = user
                    except Exception as e:
                        print(f"Error searching for skill '{skill}': {e}")
                        continue
            else:
                # No skills - just use base query
                response = await client.get(
                    f"{self.BASE_URL}/search/users",
                    headers=self.headers,
                    params={
                        "q": base_query,
                        "per_page": min(max_results, 100),
                        "sort": "followers",
                        "order": "desc",
                    },
                )
                response.raise_for_status()
                data = response.json()
                for user in data.get("items", []):
                    username = user.get("login")
                    if username:
                        all_results[username] = user

        # Convert back to list and limit results
        results = list(all_results.values())[:max_results]
        return results

    async def get_user_profile(self, username: str) -> dict:
        """Get detailed user profile."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/users/{username}",
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json()

    async def get_user_repos(
        self, username: str, limit: int = 10
    ) -> list[dict]:
        """Get user's repositories sorted by stars."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/users/{username}/repos",
                headers=self.headers,
                params={
                    "sort": "updated",
                    "direction": "desc",
                    "per_page": 100,
                },
            )
            response.raise_for_status()
            repos = response.json()

            # Sort by stars and return top repos
            repos.sort(key=lambda x: x.get("stargazers_count", 0), reverse=True)
            return repos[:limit]

    async def get_repo_languages(self, username: str, repo_name: str) -> dict:
        """Get languages used in a repository."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/repos/{username}/{repo_name}/languages",
                headers=self.headers,
            )
            if response.status_code == 200:
                return response.json()
            return {}

    async def get_social_accounts(self, username: str) -> list[dict]:
        """
        Get user's linked social accounts from GitHub.

        Returns accounts like LinkedIn, Twitter, etc.
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.BASE_URL}/users/{username}/social_accounts",
                    headers=self.headers,
                )
                if response.status_code == 200:
                    return response.json()
            except Exception:
                pass
        return []

    def extract_social_urls(
        self,
        social_accounts: list[dict],
        bio: str | None,
        blog: str | None
    ) -> dict:
        """
        Extract LinkedIn and Twitter URLs from social accounts and profile fields.

        Checks:
        1. GitHub social_accounts API response
        2. Bio field for URLs
        3. Blog/website field
        """
        import re

        result = {
            "linkedin_url": None,
            "twitter_url": None,
        }

        # 1. Check social_accounts API response
        for account in social_accounts:
            provider = account.get("provider", "").lower()
            url = account.get("url", "")

            if provider == "linkedin" or "linkedin.com" in url:
                result["linkedin_url"] = url
            elif provider == "twitter" or "twitter.com" in url or "x.com" in url:
                result["twitter_url"] = url

        # 2. Check bio field for LinkedIn URL
        if not result["linkedin_url"] and bio:
            linkedin_match = re.search(
                r'https?://(?:www\.)?linkedin\.com/in/[a-zA-Z0-9_-]+/?',
                bio
            )
            if linkedin_match:
                result["linkedin_url"] = linkedin_match.group(0)

            # Also check for Twitter in bio
            if not result["twitter_url"]:
                twitter_match = re.search(
                    r'https?://(?:www\.)?(?:twitter\.com|x\.com)/[a-zA-Z0-9_]+/?',
                    bio
                )
                if twitter_match:
                    result["twitter_url"] = twitter_match.group(0)

        # 3. Check blog field
        if blog:
            if not result["linkedin_url"] and "linkedin.com" in blog.lower():
                result["linkedin_url"] = blog if blog.startswith("http") else f"https://{blog}"
            elif not result["twitter_url"] and ("twitter.com" in blog.lower() or "x.com" in blog.lower()):
                result["twitter_url"] = blog if blog.startswith("http") else f"https://{blog}"

        return result

    async def get_email_from_commits(self, username: str, repos: list[dict]) -> str | None:
        """
        Extract email from user's public commits.

        Checks recent commits in user's repos to find their commit email.
        Filters out noreply GitHub emails.
        """
        async with httpx.AsyncClient() as client:
            for repo in repos[:5]:  # Check first 5 repos
                repo_name = repo.get("name")
                if not repo_name:
                    continue

                try:
                    response = await client.get(
                        f"{self.BASE_URL}/repos/{username}/{repo_name}/commits",
                        headers=self.headers,
                        params={"author": username, "per_page": 10},
                    )

                    if response.status_code != 200:
                        continue

                    commits = response.json()

                    for commit in commits:
                        commit_data = commit.get("commit", {})
                        author = commit_data.get("author", {})
                        email = author.get("email")

                        if email and self._is_valid_email(email):
                            return email

                except Exception:
                    continue

        return None

    def _is_valid_email(self, email: str) -> bool:
        """Check if email is valid and not a GitHub noreply address."""
        if not email:
            return False

        # Filter out GitHub noreply emails
        invalid_patterns = [
            "@users.noreply.github.com",
            "noreply@github.com",
            "@localhost",
        ]

        for pattern in invalid_patterns:
            if pattern in email.lower():
                return False

        # Basic email format check
        return "@" in email and "." in email

    async def analyze_profile(self, username: str) -> GitHubProfile:
        """Analyze a GitHub profile comprehensively."""
        # Fetch profile, repos, and social accounts
        profile = await self.get_user_profile(username)
        repos = await self.get_user_repos(username, limit=10)
        social_accounts = await self.get_social_accounts(username)

        # Try to get email from profile, fallback to commit history
        email = profile.get("email")
        if not email and repos:
            email = await self.get_email_from_commits(username, repos)

        # Extract social URLs (LinkedIn, Twitter)
        social_urls = self.extract_social_urls(
            social_accounts,
            profile.get("bio"),
            profile.get("blog")
        )

        # Aggregate languages from all repos
        language_counts = {}
        total_stars = 0
        top_repos = []

        for repo in repos:
            total_stars += repo.get("stargazers_count", 0)

            # Track languages
            lang = repo.get("language")
            if lang:
                language_counts[lang] = language_counts.get(lang, 0) + 1

            # Store top repo info
            top_repos.append({
                "name": repo.get("name"),
                "description": repo.get("description"),
                "stars": repo.get("stargazers_count", 0),
                "forks": repo.get("forks_count", 0),
                "language": repo.get("language"),
                "url": repo.get("html_url"),
                "topics": repo.get("topics", []),
            })

        # Sort languages by usage
        languages = sorted(language_counts.keys(), key=lambda x: language_counts[x], reverse=True)

        return GitHubProfile(
            username=profile.get("login"),
            name=profile.get("name"),
            email=email,
            bio=profile.get("bio"),
            location=profile.get("location"),
            company=profile.get("company"),
            blog=profile.get("blog"),
            public_repos=profile.get("public_repos", 0),
            followers=profile.get("followers", 0),
            following=profile.get("following", 0),
            created_at=profile.get("created_at"),
            profile_url=profile.get("html_url"),
            avatar_url=profile.get("avatar_url"),
            hireable=profile.get("hireable"),
            languages=languages,
            top_repositories=top_repos,
            total_stars=total_stars,
            contribution_stats=None,
            linkedin_url=social_urls.get("linkedin_url"),
            twitter_url=social_urls.get("twitter_url"),
            social_accounts=social_accounts,
        )

    async def generate_ai_assessment(
        self,
        profile: GitHubProfile,
        job_requirements: dict | None = None,
    ) -> dict:
        """Generate AI assessment of a GitHub profile."""
        # Build profile summary for AI
        repos_summary = "\n".join([
            f"- {r['name']}: {r['description'] or 'No description'} ({r['language']}, {r['stars']} stars)"
            for r in profile.top_repositories[:5]
        ])

        prompt = f"""Analyze this GitHub developer profile for recruiting purposes:

**Profile:**
- Name: {profile.name or profile.username}
- Location: {profile.location or 'Unknown'}
- Bio: {profile.bio or 'None'}
- Company: {profile.company or 'None'}
- Public Repos: {profile.public_repos}
- Followers: {profile.followers}
- Total Stars: {profile.total_stars}
- Primary Languages: {', '.join(profile.languages[:5]) or 'Unknown'}
- Account Created: {profile.created_at}
- Open to Work: {profile.hireable}

**Top Repositories:**
{repos_summary}
"""

        if job_requirements:
            prompt += f"""
**Job Requirements:**
- Title: {job_requirements.get('title', 'N/A')}
- Required Skills: {', '.join(job_requirements.get('skills_required', []))}
- Experience: {job_requirements.get('experience_min_years', 0)}-{job_requirements.get('experience_max_years', 'N/A')} years
"""

        prompt += """
Return a JSON object with:
- overall_score: 0-100 overall candidate quality score
- technical_depth: 0-100 based on repo complexity and variety
- community_engagement: 0-100 based on stars, followers, contributions
- skills_detected: List of technologies/skills evident from repos
- experience_level: "junior", "mid", "senior", or "principal"
- strengths: List of 3-5 strengths
- potential_concerns: List of any concerns
- summary: 2-3 sentence professional summary
- recommendation: "highly_recommended", "recommended", "consider", or "not_recommended"

Return ONLY valid JSON."""

        messages = [
            {"role": "system", "content": "You are an expert technical recruiter analyzing GitHub profiles."},
            {"role": "user", "content": prompt},
        ]

        response = azure_openai_service.chat_completion(
            messages=messages,
            temperature=0.3,
            response_format={"type": "json_object"},
        )

        return azure_openai_service.parse_json_response(response)

    async def source_candidates(
        self,
        skills: list[str] | None = None,
        location: str | None = None,
        language: str | None = None,
        min_repos: int = 5,
        min_followers: int = 10,
        max_results: int = 20,
        analyze: bool = True,
        job_requirements: dict | None = None,
    ) -> list[dict]:
        """
        Source and analyze candidates from GitHub.

        This is the main method for sourcing - it searches, fetches profiles,
        and optionally runs AI analysis.
        """
        # Search for developers
        search_results = await self.search_developers(
            skills=skills,
            location=location,
            language=language,
            min_repos=min_repos,
            min_followers=min_followers,
            max_results=max_results,
        )

        candidates = []
        for user in search_results:
            try:
                # Analyze profile
                profile = await self.analyze_profile(user["login"])

                candidate_data = {
                    "source": "github",
                    "source_id": profile.username,
                    "name": profile.name or profile.username,
                    "email": profile.email,
                    "location": profile.location,
                    "profile_url": profile.profile_url,
                    "avatar_url": profile.avatar_url,
                    "bio": profile.bio,
                    "company": profile.company,
                    "languages": profile.languages,
                    "public_repos": profile.public_repos,
                    "followers": profile.followers,
                    "total_stars": profile.total_stars,
                    "top_repositories": profile.top_repositories,
                    "hireable": profile.hireable,
                    "linkedin_url": profile.linkedin_url,
                    "twitter_url": profile.twitter_url,
                }

                # Run AI assessment if requested
                if analyze:
                    assessment = await self.generate_ai_assessment(
                        profile, job_requirements
                    )
                    candidate_data["ai_assessment"] = assessment

                candidates.append(candidate_data)

            except Exception as e:
                # Log error but continue with other candidates
                print(f"Error analyzing {user['login']}: {e}")
                continue

        # Sort by AI score if available
        if analyze:
            candidates.sort(
                key=lambda x: x.get("ai_assessment", {}).get("overall_score", 0),
                reverse=True,
            )

        return candidates


def get_github_service(access_token: str | None = None) -> GitHubSourcingService:
    """Factory function to create GitHub sourcing service."""
    return GitHubSourcingService(access_token)
