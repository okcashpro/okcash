import React, { useEffect, useState } from "react";
import ContributorCard from "./Contributor";
import Contributions from "./Contributions";
import { useColorMode } from "@docusaurus/theme-common";

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
    darkMode: boolean;
}

export const THEME_COLORS = {
    light: {
        mainBackgroundColor: "white",
        secondaryBackground: "rgba(0, 0, 0, 0.05)",
        primaryText: "black",
        secondaryText: "#ffa600",
    },
    dark: {
        mainBackgroundColor: "#1b1b1d",
        secondaryBackground: "#242526",
        primaryText: "white",
        secondaryText: "#add8e6",
    },
};

const Contributors: React.FC = () => {
    const { colorMode } = useColorMode();
    const [selectedContributor, setSelectedContributor] =
        useState<Contributor | null>(null);
    const [contributors, setContributors] = useState<Contributor[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [darkMode, setDarkMode] = useState<boolean>(colorMode === "dark");

    useEffect(() => {
        setDarkMode(colorMode === "dark");
    }, [colorMode]);

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
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "1rem",
                backgroundColor: darkMode
                    ? THEME_COLORS.dark.secondaryBackground
                    : THEME_COLORS.light.secondaryBackground,
                padding: "10px",
                width: "100%",
            }}
        >
            {selectedContributor ? (
                <Contributions
                    contributor={selectedContributor}
                    onBack={() => setSelectedContributor(null)}
                    darkMode={darkMode}
                />
            ) : (
                contributors.map((contributor) => (
                    <ContributorCard
                        key={contributor.id}
                        contributor={contributor}
                        onSelect={() => {
                            setSelectedContributor(contributor);
                        }}
                        darkMode={darkMode}
                    />
                ))
            )}
        </div>
    );
};

export default Contributors;
