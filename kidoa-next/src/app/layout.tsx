import { Metadata } from 'next'
 
export const metadata: Metadata = {
  title: 'Kidoa - Explora en Familia',
  description: 'La App premium para familias con KIDOA IA',
  manifest: '/manifest.json',
  themeColor: '#002C77',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kidoa',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/assets/logo.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
