import React, { useState } from "react";
import { ContributorProps } from "./Contributors";
import { THEME_COLORS } from "./Contributors";
import { hexToRgb } from "./utils";
import ScoreIcon from "./ScoreIcon";
import Summary from "./Summary";

const ContributorCard: React.FC<ContributorProps> = ({
    contributor,
    onSelect,
    darkMode,
    userActivitySummary,
}) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            key={contributor.id}
            style={{
                position: "relative",
                borderRadius: "0.5rem",
                height: "16rem",
                boxShadow: isHovered
                    ? "0 4px 6px rgba(0, 0, 0, 0.1)"
                    : "0 1px 2px rgba(0, 0, 0, 0.05)",
                transition: "box-shadow 0.2s ease-in-out",
                backgroundColor: darkMode
                    ? THEME_COLORS.dark.mainBackgroundColor
                    : THEME_COLORS.light.mainBackgroundColor,
                cursor: isHovered ? "pointer" : "default",
                padding: "24px",
                justifyContent: "center",
                color: darkMode
                    ? THEME_COLORS.dark.primaryText
                    : THEME_COLORS.light.primaryText,
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onSelect}
        >
            <ScoreIcon
                style={{
                    width: "3.5rem",
                    height: "1.8rem",
                    position: "absolute",
                    backgroundColor: darkMode
                        ? `rgba(${hexToRgb(THEME_COLORS.dark.secondaryText)}, 0.2)`
                        : `rgba(${hexToRgb(THEME_COLORS.light.secondaryText)}, 0.2)`,
                    color: darkMode
                        ? THEME_COLORS.dark.secondaryText
                        : THEME_COLORS.light.secondaryText,
                    fontSize: "0.75rem",
                    padding: "0.2rem",
                    fontWeight: "bold",
                    top: "8px",
                    right: "8px",
                    gap: "0.15rem",
                }}
                iconColor={
                    darkMode
                        ? THEME_COLORS.dark.secondaryText
                        : THEME_COLORS.light.secondaryText
                }
                iconSize="1rem"
            />

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
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                        }}
                    >
                        <div
                            style={{
                                fontWeight: "bold",
                                fontSize: "1.2rem",
                                marginRight: "0.5rem",
                            }}
                        >
                            {contributor.login}
                        </div>
                    </div>

                    <div
                        style={{
                            color: darkMode
                                ? THEME_COLORS.dark.secondaryText
                                : THEME_COLORS.light.secondaryText,
                        }}
                    >
                        {contributor.contributions} contributions
                    </div>
                </div>
            </div>
            <Summary
                summary={userActivitySummary.activityDetails}
                style={{
                    marginTop: "1rem",
                    color: darkMode
                        ? `rgba(${hexToRgb(THEME_COLORS.dark.primaryText)}, 0.5)`
                        : `rgba(${hexToRgb(THEME_COLORS.light.primaryText)}, 0.5)`,
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                }}
            />
        </div>
    );
};

export default ContributorCard;
