import { useEffect } from 'react'
import { Download } from '../../components/Download'
import { FeatureGrid } from '../../components/FeatureGrid'
import { Footer } from '../../components/Footer'
import { Header } from '../../components/Header'
import { Hero } from '../../components/Hero'
import { Shortcuts } from '../../components/Shortcuts'
import { Stack } from '../../components/Stack'
import { useReveal } from '../../hooks/useReveal'
import { createTranslator } from '../../lib/i18n'
import { usePreferences } from '../../lib/preferences'
import './styles.css'

export function Home() {
  const { language } = usePreferences()
  const t = createTranslator(language)
  useReveal()

  useEffect(() => {
    document.title = t.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.description)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', t.title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', t.description)
  }, [t.title, t.description])

  return (
    <>
      <a className="skip-link" href="#main">
        {t.header.skip}
      </a>
      <Header />
      <main id="main">
        <Hero />
        <FeatureGrid />
        <Shortcuts />
        <Stack />
        <Download />
      </main>
      <Footer />
    </>
  )
}
