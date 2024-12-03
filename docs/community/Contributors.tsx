import React, { useEffect, useState } from "react";
import ContributorCard from "./Contributor";
import Contributions from "./Contributions";

export interface Contributor {
    id: number;
    login: string;
    avatar_url: string;
    html_url: string;
    contributions: number;
}

export interface ContributorProps {
    contributor: Contributor;
    onSelect: () => void;
}

const Contributors: React.FC = () => {
    const [selectedContributor, setSelectedContributor] =
        useState<Contributor | null>(null);
    const [contributors, setContributors] = useState<Contributor[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchAllContributors = async () => {
            let allContributors: Contributor[] = [];
            let page = 1;

            try {
                while (true) {
                    const response = await fetch(
                        `https://api.github.com/repos/ai16z/eliza/contributors?per_page=30&page=${page}`,
                    );
                    if (!response.ok) {
                        throw new Error(
                            `Error fetching contributors: ${response.statusText}`,
                        );
                    }
                    const data: Contributor[] = await response.json();

                    if (data.length === 0) {
                        break;
                    }

                    allContributors = [...allContributors, ...data];
                    page++;
                }

                setContributors(allContributors);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
            } finally {
                setLoading(false);
            }
        };

        fetchAllContributors();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-around",
                flexWrap: "wrap",
                gap: "1rem",
                backgroundColor: "#f9fafb",
                padding: "10px",
                width: "100%",
            }}
        >
            {selectedContributor ? (
                <Contributions
                    contributor={selectedContributor}
                    onBack={() => setSelectedContributor(null)}
                />
            ) : (
                contributors.map((contributor) => (
                    <ContributorCard
                        key={contributor.id}
                        contributor={contributor}
                        onSelect={() => {
                            setSelectedContributor(contributor);
                        }}
                    />
                ))
            )}
        </div>
    );
};

export default Contributors;
