import React, { useState, useEffect } from "react";
import { Accordion } from "./Accordion";
import { StatCard } from "./StatCard";

export interface GitHubItem {
    html_url: string;
    title: string;
    created_at: string;
}

export interface StatCardProps {
    title: string;
    value: number;
}

const Contributions = ({ contributor, onBack }) => {
    const [contributorStat, setContributorState] = useState<StatCardProps[]>(
        [],
    );
    const [commitsData, setCommitsData] = useState<GitHubItem[]>([]);
    const [prsData, setPrsData] = useState<GitHubItem[]>([]);
    const [issuesData, setIssuesData] = useState<GitHubItem[]>([]);
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);
    const [commitPage, setCommitPage] = useState(1); // Track the current page for commits

    useEffect(() => {
        const fetchContributorStats = async () => {
            const stats: StatCardProps[] = [
                { title: "Commits", value: contributor.contributions },
            ];

            try {
                await fetchCommits(commitPage);

                // Fetch PRs
                const prResponse = await fetch(
                    `https://api.github.com/search/issues?q=type:pr+author:${contributor.login}+repo:ai16z/eliza`,
                    {
                        headers: {
                            Accept: "application/vnd.github.v3+json",
                        },
                    },
                );
                const prData = await prResponse.json();
                stats.push({ title: "PRs", value: prData.total_count });
                setPrsData(prData.items || []);

                // Fetch Issues
                const issueResponse = await fetch(
                    `https://api.github.com/search/issues?q=type:issue+author:${contributor.login}+repo:ai16z/eliza`,
                    {
                        headers: {
                            Accept: "application/vnd.github.v3+json",
                        },
                    },
                );
                const issueData = await issueResponse.json();
                stats.push({ title: "Issues", value: issueData.total_count });
                setIssuesData(issueData.items || []);
            } catch (error) {
                console.error("Error fetching contributor stats:", error);
            }

            setContributorState(stats);
        };

        fetchContributorStats();
    }, [contributor.login]);

    const toggleAccordion = (section: string) => {
        setOpenAccordion((prev) => (prev === section ? null : section));
    };

    const fetchCommits = async (page: number) => {
        try {
            const commitResponse = await fetch(
                `https://api.github.com/repos/ai16z/eliza/commits?author=${contributor.login}&page=${page}`,
                {
                    headers: {
                        Accept: "application/vnd.github.v3+json",
                    },
                },
            );
            const commitData = await commitResponse.json();
            const commitItems = commitData.map((commit: any) => ({
                html_url: commit.html_url,
                title: commit.commit.message,
                created_at: commit.commit.author.date,
            }));
            setCommitsData((prevData) => [...prevData, ...commitItems]); // Append new commits
        } catch (error) {
            console.error("Error fetching commits:", error);
        }
    };

    const accordionItems = [
        {
            title: "Commits",
            data: commitsData,
            section: "commits",
            loadMore:
                commitsData.length >= contributor.contributions
                    ? undefined
                    : () => {
                          const nextPage = commitPage + 1;
                          fetchCommits(nextPage);
                          setCommitPage(nextPage);
                      },
        },
        {
            title: "Pull Requests",
            data: prsData,
            section: "pullRequests",
        },
        {
            title: "Issues",
            data: issuesData,
            section: "issues",
        },
    ];

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                padding: "1rem",
                gap: "1rem",
                color: "black",
            }}
        >
            <div>
                <span
                    style={{ cursor: "pointer", fontWeight: "bold" }}
                    onClick={onBack}
                >
                    ❮ back
                </span>
            </div>
            <div
                key={contributor.id}
                style={{
                    height: "100px",
                    borderRadius: "0.5rem",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    transition: "box-shadow 0.2s ease-in-out",
                    backgroundColor: "white",
                    padding: "24px",
                    justifyContent: "center",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                    }}
                >
                    <img
                        src={contributor.avatar_url}
                        alt={`${contributor.login}'s avatar`}
                        style={{
                            width: "64px",
                            height: "64px",
                            borderRadius: "50%",
                        }}
                    />
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                        }}
                    >
                        <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>
                            {contributor.login}
                        </div>
                        <div style={{ color: "#4b5563" }}>
                            {contributor.contributions} contributions
                        </div>
                    </div>
                </div>
            </div>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1rem",
                    marginTop: "1rem",
                }}
            >
                {contributorStat.map((stat, index) => (
                    <StatCard
                        key={index}
                        title={stat.title}
                        value={stat.value}
                    />
                ))}
            </div>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                }}
            >
                {accordionItems.map((item) => (
                    <Accordion
                        key={item.section}
                        title={item.title}
                        isOpen={openAccordion === item.section}
                        onToggle={() => toggleAccordion(item.section)}
                        data={item.data}
                        loadMore={item.loadMore}
                    />
                ))}
            </div>
        </div>
    );
};

export default Contributions;
