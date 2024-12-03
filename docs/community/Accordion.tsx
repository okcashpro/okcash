import React, { useState } from "react";
import { GitHubItem } from "./Contributions";

interface AccordionProps {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    data: GitHubItem[];
    loadMore?: () => void;
}

export const Accordion: React.FC<AccordionProps> = ({
    title,
    isOpen,
    onToggle,
    data,
    loadMore,
}) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [hoverLoadMore, setHoverLoadMore] = useState<boolean>(false);

    return (
        <div
            style={{
                display: "flex",
                gap: "1rem",
                flexDirection: "column",
                justifyContent: "center",
                borderRadius: "0.5rem",
                border: "1px solid #e5e7eb",
                padding: "1rem",
            }}
        >
            <div
                onClick={onToggle}
                style={{
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    height: "100%",
                    width: "100%",
                }}
            >
                <div>{title}</div>
                <div>{isOpen ? "▼" : "▶"}</div>
            </div>
            {isOpen && (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                        marginTop: "0.5rem",
                        marginLeft: "1rem",
                    }}
                >
                    {data.map((entry, index) => (
                        <div key={index} style={{ marginBottom: "0.5rem" }}>
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    marginBottom: "0.5rem",
                                    cursor: "pointer",
                                    color:
                                        hoveredIndex === index
                                            ? "#3b82f6"
                                            : "black",
                                    transition: "color 0.2s ease",
                                }}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                onClick={() =>
                                    window.open(
                                        entry.html_url,
                                        "_blank",
                                        "noopener,noreferrer",
                                    )
                                }
                            >
                                <div>{entry.title}</div>
                                <div
                                    style={{
                                        fontSize: "0.8rem",
                                        color: "gray",
                                    }}
                                >
                                    {entry.created_at.split("T")[0]}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {isOpen && loadMore && (
                <div
                    style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "center",
                    }}
                >
                    <span
                        style={{
                            color: hoverLoadMore ? "#3b82f6" : "black",
                            cursor: "pointer",
                        }}
                        onMouseEnter={() => setHoverLoadMore(true)}
                        onMouseLeave={() => setHoverLoadMore(false)}
                        onClick={loadMore}
                    >
                        Load more...
                    </span>
                </div>
            )}
        </div>
    );
};
