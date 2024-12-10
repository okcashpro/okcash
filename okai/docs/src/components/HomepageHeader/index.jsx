import React from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Heading from "@theme/Heading";

import styles from "./styles.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={styles.heroBanner}>
      <div className="container">
        <div className={styles.heroSection}>
          <div>
            <h1 className={styles.heroTitle}>
              okai is a simple, fast, and{" "}
              <span className={styles.headerTextGradient}>
                lightweight AI agent
              </span>{" "}
              framework
            </h1>
            <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
            <div className={styles.buttonGroup}>
              <a
                className="button button--primary button--lg"
                href="./docs/intro/#"
              >
                Get Started
              </a>
              <div className={styles.githubButton}>
                <iframe
                  src="https://ghbtns.com/github-btn.html?user=OK&repo=okai&type=star&count=true&size=large"
                  frameborder="0"
                  scrolling="0"
                  width="135"
                  height="30"
                  title="GitHub"
                ></iframe>
              </div>
            </div>
          </div>
          <div className={styles.heroRight}>
            <img
              src="/okai/img/blurback.png"
              className={styles.blurPhoto}
              alt="blurred"
            />
            <pre className={styles.codeBlock}>
              <code className="language-bash">{`npm install @okcashpro/okai`}</code>
            </pre>
          </div>
        </div>
      </div>
    </header>
  );
}

export default HomepageHeader;
