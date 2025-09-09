---
layout: pages/sections.njk
bodyClasses: 'home'
hasHero: true

navigation:
  navLabel: 'Home'
  navIndex: 0

seo:
  title: Metalsmith Components - Modular Page Building Framework
  description:
    'Build dynamic web pages with **reusable** Metalsmith components. A modern component-based
    architecture for static site generation.'
  keywords: 'metalsmith, static site generator, components, modular design'

sections:
  - sectionType: hero
    containerTag: section
    classes: 'first-section'
    isDisabled: false
    text:
      leadIn: ''
      title: Metalsmith Components
      titleTag: 'h1'
      subTitle: 'A collection of section components for Metalsmith in 2025 and beyond'
      prose:
        This website provides page sections components. The page sections are bare-bones
        interpretations of universal information presentation patterns that can be found on almost
        every website.
    ctas:
      - url: '/library'
        label: 'Go to the Library'
        isButton: true
        buttonStyle: 'primary'

  - sectionType: text-only
    containerTag: article
    classes: ''
    isDisabled: false
    text:
      title: Building Pages with Metalsmith Components
      titleTag: 'h2'
      prose: |-
        Metalsmith Components provide a modular approach to page construction. Instead of embedding all content within markdown body text, pages are assembled from **reusable components** defined in structured frontmatter.

        This approach produces:
        - Cleaner layouts
        - Better code organization  
        - Consistent component reuse across pages

        Pages are built by defining a content model in the frontmatter. Each page specifies its layout template and an array of section components.

        ```yaml
        layout: pages/sections.njk
        sections:
          - sectionType: hero
            # hero configuration
          - sectionType: text-only
            # text-only configuration
        ```

        ### Configuration Properties:

        - `layout` determines the template file for page rendering
        - `bodyClasses` adds CSS classes to the body element  
        - `navigation` defines menu label and position
        - `sections` array defines the sequence of components to render

        ### Benefits of Component-Based Architecture

        The component-based approach provides significant advantages over traditional monolithic templates. Each component exists as an independent unit with its own template and configuration schema.

        Components work across different page types and layouts without modification. A hero section defined once can appear on homepages, landing pages, or blog posts without duplication.

        Page restructuring becomes straightforward through frontmatter configuration. Reordering sections or trying different layouts requires no template modifications.

  - sectionType: multi-media
    containerTag: aside
    isDisabled: false
    text:
      leadIn: 'And what is this?'
      title: Media Section Example
      titleTag: 'h2'
      prose:
        Example of a media section with text and image. The text area has a `lead-in`, **title**,
        sub-title, and prose. The prose is *markdown text*. All of the text parts are optional.
    ctas:
      - url: 'https://metalsmith.io'
        label: 'Metalsmith Central'
        isButton: true
    image:
      src: '/assets/images/sample7.jpg'
      alt: 'nunjucks'
      caption: 'Tortor Bibendum Sit Egestas'

  - sectionType: banner
    containerTag: aside
    classes: 'cta-banner'
    isDisabled: false
    text:
      title: 'Ready to Get Started?'
      prose: 'Join thousands of developers using Metalsmith for modern static sites.'
    ctas:
      - url: '/section-anatomy'
        label: 'Read about section structure'
        isButton: true
        buttonStyle: 'primary'
---

This page demonstrates modern Metalsmith component architecture with no traditional markdown body
content.
