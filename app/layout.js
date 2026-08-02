import './globals.css';

export const metadata = {
  title: 'おうち帳簿',
  description: '夫婦で共有する家計簿'
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
