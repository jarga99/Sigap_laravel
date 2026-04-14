import { NextResponse } from 'next/server'
import axios from 'axios'
import { getSession } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const targetUrl = searchParams.get('url')

    if (!targetUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
    }

    // Try to fetch the URL content
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 5000 // 5 seconds max
    })

    const html = response.data

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
