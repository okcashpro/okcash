import React, { useEffect, useState, useRef } from "react";
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
    const [darkMode, setDarkMode] = useState<boolean>(colorMode === "dark");

    const observerRef = useRef<HTMLDivElement | null>(null);
    const pageRef = useRef<number>(1);
    const loadingRef = useRef<boolean>(true);
    const hasMoreRef = useRef<boolean>(true);

    useEffect(() => {
        setDarkMode(colorMode === "dark");
    }, [colorMode]);

    const fetchContributors = async (page: number) => {
        loadingRef.current = true;
        try {
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
                hasMoreRef.current = false;
                return;
            }
            const currentContributors = [...contributors, ...data];

            setContributors(currentContributors);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            loadingRef.current = false;
        }
    };

    useEffect(() => {
        fetchContributors(pageRef.current);
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (
                    entries[0].isIntersecting &&
                    !loadingRef.current &&
                    hasMoreRef.current
                ) {
                    loadingRef.current = true;
                    pageRef.current++;
                    fetchContributors(pageRef.current);
                }
            },
            { threshold: 1.0 },
        );

        if (observerRef.current) {
            observer.observe(observerRef.current);
        }

        return () => {
            if (observerRef.current) {
                observer.unobserve(observerRef.current);
            }
        };
    }, [contributors]);

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!contributors.length) {
        return <div>Loading...</div>;
    }

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: `repeat(${selectedContributor ? "1" : "auto-fit"}, minmax(300px, 1fr))`,
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

            <div
                ref={observerRef}
                style={{
                    height: "1px",
                    backgroundColor: "transparent",
                }}
            />
        </div>
    );
};

export default Contributors;
