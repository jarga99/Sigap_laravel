import { NextResponse } from 'next/server'
import axios from 'axios'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const targetUrl = searchParams.get('url')

    if (!targetUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
    }

    let html = ''
    try {
      const response = await axios.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        timeout: 5000,
        // Accept any SSL certificates status to prevent DEPTH_ZERO_SELF_SIGNED_CERT
        validateStatus: () => true 
      })
      html = response.data || ''
    } catch {
      // Return bare default if network completely fails
      return NextResponse.json({ title: '', description: '', image: '', url: targetUrl, error: true })
    }

    // Simple regex to extract OG tags
    const getMetaTag = (html: string, property: string) => {
      const match = html.match(new RegExp(`<meta(?: [^>]+)? (?:property|name)=['"]${property}['"](?: [^>]+)? content=['"]([^'"]+)['"]`, 'i'))
        || html.match(new RegExp(`<meta(?: [^>]+)? content=['"]([^'"]+)['"](?: [^>]+)? (?:property|name)=['"]${property}['"]`, 'i'))
      
      return match ? match[1] : null
    }

    const title = getMetaTag(html, 'og:title') || getMetaTag(html, 'twitter:title') || html.match(/<title>([^<]*)<\/title>/i)?.[1] || ''
    const description = getMetaTag(html, 'og:description') || getMetaTag(html, 'twitter:description') || getMetaTag(html, 'description') || ''
    const image = getMetaTag(html, 'og:image') || getMetaTag(html, 'twitter:image') || ''

    return NextResponse.json({
      title,
      description,
      image,
      url: targetUrl
    })

  } catch {
    console.error('Error fetching preview for URL:')
    return NextResponse.json({ error: 'Failed to fetch preview metadata' }, { status: 500 })
  }
}
