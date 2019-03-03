import React from "react"
import ArrowForwardIcon from "react-icons/lib/md/arrow-forward"

import { rhythm, scale, options } from "../utils/typography"
import presets, { colors } from "../utils/presets"
import Button from "./button"

const MastheadContent = () => (
  <div
    className="masthead-content"
    css={{
      margin: `0 ${rhythm(presets.gutters.default)}`,
      paddingBottom: rhythm(2),
      paddingTop: rhythm(2),
      textAlign: `center`,
      [presets.Md]: {
        paddingTop: `calc(${presets.headerHeight} + ${
          presets.bannerHeight
        } + ${rhythm(1)})`,
      },
      [presets.Lg]: {
        paddingBottom: rhythm(3),
      },
    }}
  >
    <h1
      css={{
        color: colors.gatsby,
        fontSize: `calc(12px + 2vh + 1.5vw)`,
        letterSpacing: `-1px`,
        lineHeight: 1.1,
        margin: `0 auto 1.75rem`,
        maxWidth: `11em`,
        WebkitFontSmoothing: `antialiased`,
      }}
    >
      Build blazing fast apps and websites with React
    </h1>
    <p
      css={{
        color: colors.gray.copy,
        fontFamily: options.headerFontFamily.join(`,`),
        fontSize: scale(1 / 5).fontSize,
        maxWidth: rhythm(26),
        margin: `0 auto 2rem`,
        WebkitFontSmoothing: `antialiased`,
        [presets.Sm]: {
          fontSize: scale(2 / 5).fontSize,
        },
      }}
    >
      Gatsby is a free and open source developer framework based on React for
      building blazing fast websites and apps
    </p>
    <Button
      large
      to="/docs/"
      tracking="MasterHead -> Get Started"
      icon={<ArrowForwardIcon />}
    >
      Get Started
    </Button>
  </div>
)

const Masthead = () => <MastheadContent />

export default Masthead
