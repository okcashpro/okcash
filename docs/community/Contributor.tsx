import React, { useState } from "react";
import { ContributorProps } from "./Contributors";

const ContributorCard: React.FC<ContributorProps> = ({
    contributor,
    onSelect,
}) => {
    const [isHovered, setIsHovered] = useState(false);
    return (
        <div
            key={contributor.id}
            style={{
                flex: "1 1 300px",
                height: "100px",
                borderRadius: "0.5rem",
                boxShadow: isHovered
                    ? "0 4px 6px rgba(0, 0, 0, 0.1)"
                    : "0 1px 2px rgba(0, 0, 0, 0.05)",
                transition: "box-shadow 0.2s ease-in-out",
                backgroundColor: "white",
                cursor: isHovered ? "pointer" : "default",
                padding: "24px",
                justifyContent: "center",
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onSelect}
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
                        width: "48px",
                        height: "48px",
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
    );
};

export default ContributorCard;
