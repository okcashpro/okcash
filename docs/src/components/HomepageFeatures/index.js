import clsx from "clsx";
import Heading from "@theme/Heading";
import styles from "./styles.module.css";

const FeatureList = [
  {
    title: "🤖 Multi-Agent Framework",
    description: (
      <>
        Build and deploy autonomous AI agents with consistent personalities across Discord, 
        Twitter, and Telegram. Full support for voice, text, and media interactions.
      </>
    ),
  },
  {
    title: "🧠 Advanced Capabilities",
    description: (
      <>
        Built-in RAG memory system, document processing, media analysis, and autonomous 
        trading capabilities. Supports multiple AI models including Llama, GPT-4, and Claude.
      </>
    ),
  },
  {
    title: "🔌 Extensible Design",
    description: (
      <>
        Create custom actions, add new platform integrations, and extend functionality 
        through a modular plugin system. Full TypeScript support.
      </>
    ),
  },
];

function Feature({ title, description }) {
  return (
    <div className={clsx("col col--4")}>
      <div className="card margin--md" style={{
        height: "100%",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(10px)",
        borderRadius: "12px",
      }}>
        <div className="card__body text--center padding--md">
          <Heading as="h3">{title}</Heading>
          <p>{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
