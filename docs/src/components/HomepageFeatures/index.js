import clsx from 'clsx'
import Heading from '@theme/Heading'
import styles from './styles.module.css'

const FeatureList = [
  {
    title: 'Made By Users',
    description: (
      <>
        bgent is open source, community developed and designed to be and easy to use.
      </>
    )
  },
  {
    title: 'Just Works',
    description: (
      <>
        Simple, tested, used in production. Configurable enough, batteries included.
      </>
    )
  },
  {
    title: 'For a Better World',
    description: (
      <>
        If you have ideas for how to make better agents for everyone, <a href="https://discord.gg/jointhealliance">let's do it together</a>.
      </>
    )
  }
]

function Feature ({ Svg, title, description }) {
  return (
    <div className={clsx('col col--4')}>
      <div
      /* white if the theme is light, black if the theme is dark */
      style={{
      // white background, rounded corners
      backgroundColor: '#ffffff88',
      borderRadius: '10px',
      padding: '10px',
      paddingTop: '20px',
      margin: '5px'
    }}>
      {/* <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div> */}
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
      </div>
    </div>
  )
}

export default function HomepageFeatures () {
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
  )
}
